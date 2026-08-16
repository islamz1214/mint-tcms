'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { get, patch, post, del, ApiError } from '@/lib/api';
import type { CreateDefectDto, Defect, FileAttachment, TestRun, TestResult, TestResultStatus, UpdateTestResultDto } from '@/lib/types';

type StepStatus = 'passed' | 'failed' | 'skipped' | 'in_progress' | 'not_executed' | 'blocked';

interface StepExecution {
  action: string;
  testData: string;
  expectedResult: string;
  actualResult: string;
  status: StepStatus;
}

interface StepExecutionNotesV1 {
  format: 'mint-step-execution-v1';
  steps: StepExecution[];
}

const stepStatusButtons: { value: StepStatus; label: string; icon: string }[] = [
  { value: 'passed', label: 'Pass', icon: '✓' },
  { value: 'in_progress', label: 'In Progress', icon: '⋯' },
  { value: 'blocked', label: 'Blocked', icon: '⊘' },
  { value: 'failed', label: 'Fail', icon: '✕' },
];

const stepStatusMeta: Record<StepStatus, { label: string; badgeClass: string; iconClass: string }> = {
  passed: {
    label: 'Pass',
    badgeClass: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  failed: {
    label: 'Fail',
    badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
    iconClass: 'text-red-600 dark:text-red-400',
  },
  blocked: {
    label: 'Blocked',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  not_executed: {
    label: 'Pending',
    badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  skipped: {
    label: 'Skipped',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
};

function mapTopLevelResultStatus(stepStatuses: StepStatus[]): TestResultStatus {
  if (stepStatuses.length === 0) return 'pending';

  if (stepStatuses.includes('failed')) {
    return 'failed';
  }

  if (stepStatuses.includes('blocked')) {
    return 'blocked';
  }

  if (stepStatuses.includes('in_progress') || stepStatuses.includes('not_executed')) {
    return 'pending';
  }

  if (stepStatuses.every((status) => status === 'skipped')) {
    return 'skipped';
  }

  return 'passed';
}

function parseNotesPayload(notes: string | null): StepExecutionNotesV1 | null {
  if (!notes) return null;

  try {
    const parsed = JSON.parse(notes) as Partial<StepExecutionNotesV1>;
    if (parsed.format !== 'bala-step-execution-v1' || !Array.isArray(parsed.steps)) {
      return null;
    }

    return {
      format: 'bala-step-execution-v1',
      steps: parsed.steps
        .map((step) => ({
          action: typeof step.action === 'string' ? step.action : '',
          testData: typeof step.testData === 'string' ? step.testData : '',
          expectedResult: typeof step.expectedResult === 'string' ? step.expectedResult : '',
          actualResult: typeof step.actualResult === 'string' ? step.actualResult : '',
          status: isStepStatus(step.status) ? step.status : 'not_executed',
        })),
    };
  } catch {
    return null;
  }
}

function isStepStatus(value: unknown): value is StepStatus {
  return (
    value === 'passed' ||
    value === 'failed' ||
    value === 'skipped' ||
    value === 'in_progress' ||
    value === 'not_executed' ||
    value === 'blocked'
  );
}

function parseTestCaseSteps(rawSteps: string | null, fallbackExpected: string | null): StepExecution[] {
  if (!rawSteps || !rawSteps.trim()) {
    return [
      {
        action: '',
        testData: '',
        expectedResult: fallbackExpected ?? '',
        actualResult: '',
        status: 'not_executed',
      },
    ];
  }

  // JSON format (saved by the step editor)
  try {
    const parsed = JSON.parse(rawSteps);
    if (parsed && Array.isArray(parsed.steps)) {
      return parsed.steps.map((step: Record<string, string>) => ({
        action: (step.action ?? '').trim(),
        testData: (step.testData ?? '').trim(),
        expectedResult: ((step.expectedResult ?? '').trim() || fallbackExpected) ?? '',
        actualResult: '',
        status: 'not_executed' as StepStatus,
      }));
    }
  } catch {
    // fall through to text format
  }

  const blocks = rawSteps.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const structuredBlocks = blocks.filter((block) => /^Step\s+\d+/i.test(block));

  if (structuredBlocks.length > 0) {
    return structuredBlocks.map((block) => {
      const lines = block.split('\n').map((line) => line.trim());
      const actionLine = lines.find((line) => /^Action\s*:/i.test(line));
      const testDataLine = lines.find((line) => /^Test Data\s*:/i.test(line));
      const expectedLine = lines.find((line) => /^Expected Result\s*:/i.test(line));

      return {
        action: actionLine ? actionLine.replace(/^Action\s*:\s*/i, '').trim() : '',
        testData: testDataLine ? testDataLine.replace(/^Test Data\s*:\s*/i, '').trim() : '',
        expectedResult: expectedLine
          ? expectedLine.replace(/^Expected Result\s*:\s*/i, '').trim()
          : fallbackExpected ?? '',
        actualResult: '',
        status: 'not_executed',
      };
    });
  }

  const simpleSteps = rawSteps
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  if (simpleSteps.length === 0) {
    return [
      {
        action: '',
        testData: '',
        expectedResult: fallbackExpected ?? '',
        actualResult: '',
        status: 'not_executed',
      },
    ];
  }

  return simpleSteps.map((action) => ({
    action,
    testData: '',
    expectedResult: fallbackExpected ?? '',
    actualResult: '',
    status: 'not_executed',
  }));
}

function mergeStepExecutionData(result: TestResult): StepExecution[] {
  const baseSteps = parseTestCaseSteps(result.testCase?.steps ?? null, result.testCase?.expectedResult ?? null);
  const notesPayload = parseNotesPayload(result.notes);

  if (!notesPayload) {
    return baseSteps;
  }

  return baseSteps.map((baseStep, index) => {
    const saved = notesPayload.steps[index];
    if (!saved) return baseStep;

    return {
      action: baseStep.action,
      testData: baseStep.testData,
      expectedResult: baseStep.expectedResult || saved.expectedResult,
      actualResult: saved.actualResult || '',
      status: saved.status,
    };
  });
}

function formatRunStatusLabel(status: string): string {
  return status.replace('_', ' ');
}

export default function TestRunDetailPage() {
  const { id: projectId, runId } = useParams<{ id: string; runId: string }>();
  const router = useRouter();
  const [run, setRun] = useState<TestRun | null>(null);
  const [availableDefects, setAvailableDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedResultId, setExpandedResultId] = useState<number | null>(null);
  const [defectActionResultId, setDefectActionResultId] = useState<number | null>(null);
  const [selectedDefectIds, setSelectedDefectIds] = useState<Record<number, string>>({});
  const [newDefectTitles, setNewDefectTitles] = useState<Record<number, string>>({});
  const [newDefectDescriptions, setNewDefectDescriptions] = useState<Record<number, string>>({});

  async function refreshRunAndDefects() {
    const [freshRun, freshDefects] = await Promise.all([
      get<TestRun>(`/projects/${projectId}/test-runs/${runId}`),
      get<Defect[]>(`/projects/${projectId}/defects`),
    ]);
    setRun(freshRun);
    setAvailableDefects(freshDefects);
  }

  useEffect(() => {
    refreshRunAndDefects()
      .catch(() => router.push(`/projects/${projectId}`))
      .finally(() => setLoading(false));
  }, [projectId, runId, router]);

  async function handleUpdateResult(resultId: number, status: TestResultStatus, notes?: string) {
    setUpdatingId(resultId);
    try {
      const body: UpdateTestResultDto = { status };
      if (notes !== undefined) body.notes = notes;
      const updated = await patch<TestResult>(
        `/projects/${projectId}/test-runs/${runId}/results/${resultId}`,
        body,
      );
      await refreshRunAndDefects();
    } catch (err) {
      alert(err instanceof ApiError ? (err.body?.message as string) || 'Failed' : 'Failed');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteRun() {
    if (!confirm('Delete this test run?')) return;
    await del(`/projects/${projectId}/test-runs/${runId}`);
    router.push(`/projects/${projectId}`);
  }

  if (loading || !run) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-6 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const results = run.results || [];
  const isLocked = run.status === 'completed';

  const statusColors: Record<TestResultStatus, string> = {
    pending: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
    passed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    failed: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
    blocked: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    skipped: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  };

  const statusButtons: { value: TestResultStatus; label: string; color: string }[] = [
    { value: 'passed', label: '✓ Pass', color: 'bg-green-600 hover:bg-green-700 text-white' },
    { value: 'failed', label: '✗ Fail', color: 'bg-red-600 hover:bg-red-700 text-white' },
    { value: 'blocked', label: '⛔ Blocked', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { value: 'pending', label: '↻ Reset', color: 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-300' },
  ];

  const runStatusColors: Record<string, string> = {
    pending: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
    in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    completed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  };

  async function saveStepExecution(result: TestResult, steps: StepExecution[]) {
    const payload: StepExecutionNotesV1 = {
      format: 'bala-step-execution-v1',
      steps,
    };

    const mappedStatus = mapTopLevelResultStatus(steps.map((step) => step.status));
    await handleUpdateResult(result.id, mappedStatus, JSON.stringify(payload));
  }

  async function handleStepStatusChange(result: TestResult, stepIndex: number, status: StepStatus) {
    const merged = mergeStepExecutionData(result);
    const next = merged.map((step, idx) => (idx === stepIndex ? { ...step, status } : step));
    await saveStepExecution(result, next);
  }

  async function handleStepActualChange(result: TestResult, stepIndex: number, value: string) {
    const merged = mergeStepExecutionData(result);
    const next = merged.map((step, idx) => (idx === stepIndex ? { ...step, actualResult: value } : step));
    await saveStepExecution(result, next);
  }

  async function handleLinkDefect(resultId: number) {
    const selectedDefectId = Number(selectedDefectIds[resultId]);
    if (!selectedDefectId) return;

    setDefectActionResultId(resultId);
    try {
      await post(`/projects/${projectId}/defects/${selectedDefectId}/results/${resultId}`, {});
      setSelectedDefectIds((prev) => ({ ...prev, [resultId]: '' }));
      await refreshRunAndDefects();
    } catch (err) {
      alert(err instanceof ApiError ? (err.body?.message as string) || 'Failed to link defect' : 'Failed to link defect');
    } finally {
      setDefectActionResultId(null);
    }
  }

  async function handleCreateDefect(resultId: number) {
    const title = (newDefectTitles[resultId] || '').trim();
    if (!title) return;

    const payload: CreateDefectDto = {
      title,
      description: newDefectDescriptions[resultId]?.trim() || undefined,
      status: 'open',
      severity: 'medium',
      sourceType: 'internal',
    };

    setDefectActionResultId(resultId);
    try {
      const defect = await post<Defect>(`/projects/${projectId}/defects`, payload);
      await post(`/projects/${projectId}/defects/${defect.id}/results/${resultId}`, {});
      setNewDefectTitles((prev) => ({ ...prev, [resultId]: '' }));
      setNewDefectDescriptions((prev) => ({ ...prev, [resultId]: '' }));
      await refreshRunAndDefects();
    } catch (err) {
      alert(err instanceof ApiError ? (err.body?.message as string) || 'Failed to create defect' : 'Failed to create defect');
    } finally {
      setDefectActionResultId(null);
    }
  }

  async function handleUnlinkDefect(resultId: number, defectId: number) {
    setDefectActionResultId(resultId);
    try {
      await del(`/projects/${projectId}/defects/${defectId}/results/${resultId}`);
      await refreshRunAndDefects();
    } catch (err) {
      alert(err instanceof ApiError ? (err.body?.message as string) || 'Failed to unlink defect' : 'Failed to unlink defect');
    } finally {
      setDefectActionResultId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to project
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{run.name}</h1>
            {run.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{run.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${runStatusColors[run.status]}`}>
              {formatRunStatusLabel(run.status)}
            </span>
            <button
              onClick={handleDeleteRun}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>This test run is <strong>completed</strong> and locked. Results cannot be changed. Start a new test run if re-testing is needed.</span>
        </div>
      )}

      {/* Results */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Test Results</h2>
        <div className="mt-3 space-y-1">
          {results.map((result) => {
            const isExpanded = expandedResultId === result.id;
            const steps = mergeStepExecutionData(result);
            const executedSteps = steps.filter((s) => s.status !== 'not_executed').length;
            const linkedDefectCount = (result.defects || []).length;

            return (
              <div key={result.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                {/* Collapsed row — always visible */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedResultId(isExpanded ? null : result.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedResultId(isExpanded ? null : result.id); }}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  {/* Chevron */}
                  <svg
                    className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>

                  {/* Title */}
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {result.testCase?.title || `Test Case #${result.testCaseId}`}
                  </span>

                  {/* Step progress */}
                  <span className="flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    {executedSteps}/{steps.length} steps
                  </span>

                  {/* Defect count */}
                  {linkedDefectCount > 0 && (
                    <span className="flex-shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                      {linkedDefectCount} defect{linkedDefectCount > 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Status badge */}
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[result.status]}`}>
                    {result.status === 'pending' ? 'Not Run' : result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                  </span>

                  {/* Quick top-level status buttons (visible without expanding) */}
                  {!isLocked && (
                    <div className="flex flex-shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                      {statusButtons.map((btn) => (
                        <button
                          key={btn.value}
                          disabled={updatingId === result.id || result.status === btn.value}
                          onClick={() => handleUpdateResult(result.id, btn.value)}
                          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 ${btn.color}`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 px-4 pb-4 pt-4 dark:border-zinc-800">
                    {/* Steps */}
                    <div className="space-y-3">
                      {steps.map((step, stepIndex) => (
                        <div
                          key={`${result.id}-step-${stepIndex}`}
                          className="relative rounded-lg border border-zinc-200 p-3 pr-16 dark:border-zinc-700"
                        >
                          <div className="mb-2 flex items-center justify-between pr-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                              Step {stepIndex + 1}
                            </p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stepStatusMeta[step.status].badgeClass}`}>
                              {stepStatusMeta[step.status].label}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Action</label>
                              <input
                                type="text"
                                readOnly
                                value={step.action}
                                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                              />
                            </div>

                            {step.testData.trim() && (
                              <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Test Data</label>
                                <input
                                  type="text"
                                  readOnly
                                  value={step.testData}
                                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Expected Result</label>
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={step.expectedResult}
                                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Actual Result</label>
                              <input
                                type="text"
                                value={step.actualResult}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setRun((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      results: (prev.results || []).map((r) => {
                                        if (r.id !== result.id) return r;
                                        const mergedSteps = mergeStepExecutionData(r);
                                        const nextSteps = mergedSteps.map((s, idx) =>
                                          idx === stepIndex ? { ...s, actualResult: value } : s,
                                        );
                                        return {
                                          ...r,
                                          notes: JSON.stringify({ format: 'bala-step-execution-v1', steps: nextSteps }),
                                        };
                                      }),
                                    };
                                  });
                                }}
                                    onBlur={(e) => !isLocked && handleStepActualChange(result, stepIndex, e.target.value)}
                                    readOnly={isLocked}
                                    className={`mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 shadow-sm dark:border-zinc-700 dark:text-zinc-100 ${isLocked ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:bg-zinc-900'}`}
                              />
                            </div>
                          </div>

                          <div className="absolute right-0 top-0 flex h-full w-12 flex-col items-center justify-center gap-1 rounded-r-lg border-l border-zinc-200 bg-zinc-100/90 p-1 dark:border-zinc-700 dark:bg-zinc-800/80">
                            {stepStatusButtons.map((btn) => (
                              <button
                                key={`${result.id}-${stepIndex}-${btn.value}`}
                                type="button"
                                disabled={isLocked || updatingId === result.id || step.status === btn.value}
                                onClick={() => handleStepStatusChange(result, stepIndex, btn.value)}
                                className={`inline-flex h-7 w-full items-center justify-center rounded text-sm font-semibold leading-none transition-colors ${
                                  step.status === btn.value
                                    ? 'bg-zinc-200 dark:bg-zinc-700'
                                    : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                } ${stepStatusMeta[btn.value].iconClass} disabled:opacity-40`}
                                title={btn.label}
                                aria-label={btn.label}
                              >
                                {btn.icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Attachments */}
                    <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Attachments</h3>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Screenshots, logs, or other evidence files (max 20 MB each)</p>

                      {(result.attachments || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(result.attachments || []).map((att: FileAttachment) => (
                            <div
                              key={att.id}
                              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            >
                              <span className="text-zinc-500 dark:text-zinc-400">{att.mimeType.startsWith('image/') ? '🖼' : '📄'}</span>
                              <button
                                type="button"
                                className="max-w-48 truncate font-medium text-blue-600 hover:underline dark:text-blue-400 text-left"
                                onClick={async () => {
                                  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                                  const res = await fetch(
                                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/${projectId}/test-runs/${runId}/results/${result.id}/attachments/${att.id}/download`,
                                    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                                  );
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = att.originalName;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                {att.originalName}
                              </button>
                              <span className="text-zinc-400">{(att.size / 1024).toFixed(0)} KB</span>
                              {!isLocked && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await del(`/projects/${projectId}/test-runs/${runId}/results/${result.id}/attachments/${att.id}`);
                                    await refreshRunAndDefects();
                                  }}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {!isLocked && (
                        <div className="mt-3">
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload file
                            <input
                              type="file"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const form = new FormData();
                                form.append('file', file);
                                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/projects/${projectId}/test-runs/${runId}/results/${result.id}/attachments`, {
                                  method: 'POST',
                                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                                  body: form,
                                });
                                await refreshRunAndDefects();
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Defect linking */}
                    <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Linked Defects</h3>
                        {(result.status === 'failed' || result.status === 'blocked') ? (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">Create or link defects for this execution result</span>
                        ) : (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">Defect linkage is typically used for failed or blocked results</span>
                        )}
                      </div>

                      {(result.defects || []).length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No defects linked yet.</p>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(result.defects || []).map((defect) => (
                            <div
                              key={defect.id}
                              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            >
                              <Link
                                href={`/projects/${projectId}/defects/${defect.id}`}
                                className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                              >
                                #{defect.id} {defect.title}
                              </Link>
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{defect.status}</span>
                              <button
                                type="button"
                                disabled={defectActionResultId === result.id}
                                onClick={() => handleUnlinkDefect(result.id, defect.id)}
                                className="text-red-600 transition-colors hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                              >
                                Unlink
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {!isLocked && (
                        <>
                        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">Link existing</p>
                          <div className="mt-3 flex gap-2">
                            <select
                              value={selectedDefectIds[result.id] || ''}
                              onChange={(e) => setSelectedDefectIds((prev) => ({ ...prev, [result.id]: e.target.value }))}
                              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            >
                              <option value="">Select defect</option>
                              {availableDefects
                                .filter((defect) => !(result.defects || []).some((linked) => linked.id === defect.id))
                                .map((defect) => (
                                  <option key={defect.id} value={defect.id}>
                                    #{defect.id} {defect.title} ({defect.status})
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={defectActionResultId === result.id || !selectedDefectIds[result.id]}
                              onClick={() => handleLinkDefect(result.id)}
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              Link
                            </button>
                          </div>
                        </div>

                        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">Create new</p>
                          <div className="mt-3 space-y-2">
                            <input
                              type="text"
                              value={newDefectTitles[result.id] || ''}
                              onChange={(e) => setNewDefectTitles((prev) => ({ ...prev, [result.id]: e.target.value }))}
                              placeholder="Defect title"
                              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                            <textarea
                              value={newDefectDescriptions[result.id] || ''}
                              onChange={(e) => setNewDefectDescriptions((prev) => ({ ...prev, [result.id]: e.target.value }))}
                              placeholder="Optional description"
                              rows={2}
                              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                            <button
                              type="button"
                              disabled={defectActionResultId === result.id || !(newDefectTitles[result.id] || '').trim()}
                              onClick={() => handleCreateDefect(result.id)}
                              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                              Create and link defect
                            </button>
                          </div>
                        </div>
                        </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
