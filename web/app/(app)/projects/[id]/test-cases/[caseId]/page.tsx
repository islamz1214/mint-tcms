'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { get, patch, del, post, ApiError } from '@/lib/api';
import type {
  TestCase,
  TestSuite,
  TestCaseTree,
  TestSuiteTreeNode,
  UpdateTestCaseDto,
  TestCaseStatus,
  TestCasePriority,
  TestCaseRevision,
  Precondition,
} from '@/lib/types';
import { parseStoredTestCaseSteps, serializeStepInputs, type StepInput } from '@/lib/test-case-steps';
import AutoResizeTextarea from '@/components/auto-resize-textarea';

function flattenSuites(nodes: TestSuiteTreeNode[], depth = 0): { suite: TestSuite; depth: number }[] {
  const result: { suite: TestSuite; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ suite: node, depth });
    if (node.children?.length) {
      result.push(...flattenSuites(node.children, depth + 1));
    }
  }
  return result;
}

export default function TestCaseDetailPage() {
  const { id: projectId, caseId } = useParams<{ id: string; caseId: string }>();
  const router = useRouter();
  const [tc, setTc] = useState<TestCase | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [precondition, setPrecondition] = useState('');
  const [preconditions, setPreconditions] = useState<Precondition[]>([]);
  const [preconditionId, setPreconditionId] = useState<number | null>(null);
  const [steps, setSteps] = useState<StepInput[]>([{ action: '', testData: '', expectedResult: '' }]);
  const [isTestDataEnabled, setIsTestDataEnabled] = useState(false);
  const [status, setStatus] = useState<TestCaseStatus>('draft');
  const [priority, setPriority] = useState<TestCasePriority>('medium');
  const [testSuiteId, setTestSuiteId] = useState<number | null>(null);
  const [flatSuites, setFlatSuites] = useState<{ suite: TestSuite; depth: number }[]>([]);
  const [revisions, setRevisions] = useState<TestCaseRevision[]>([]);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [historyNotice, setHistoryNotice] = useState('');
  const [restoringRevisionId, setRestoringRevisionId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get<TestCase>(`/projects/${projectId}/test-cases/${caseId}`),
      get<TestCaseTree>(`/projects/${projectId}/test-suites/tree`),
      get<TestCaseRevision[]>(`/projects/${projectId}/test-cases/${caseId}/revisions`),
      get<Precondition[]>(`/projects/${projectId}/preconditions`),
    ])
      .then(([data, tree, history, preconditionsData]) => {
        const parsedSteps = parseStoredTestCaseSteps(data.steps, data.expectedResult);
        setTc(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setPrecondition(data.precondition || '');
        setPreconditionId(data.preconditionId ?? null);
        setPreconditions(preconditionsData);
        setSteps(parsedSteps.steps);
        setIsTestDataEnabled(parsedSteps.isTestDataEnabled);
        setStatus(data.status);
        setPriority(data.priority);
        setTestSuiteId(data.testSuiteId ?? null);
        setFlatSuites(flattenSuites(tree.suites));
        setRevisions(history);
      })
      .catch(() => router.push(`/projects/${projectId}`))
      .finally(() => setLoading(false));
  }, [projectId, caseId, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const body: UpdateTestCaseDto = { title, status, priority };
      body.description = description || undefined;
      body.precondition = precondition || undefined;
      body.preconditionId = preconditionId;
      const serializedSteps = serializeStepInputs(steps, isTestDataEnabled);
      body.steps = serializedSteps.steps;
      body.expectedResult = serializedSteps.expectedResult;
      body.testSuiteId = testSuiteId;
      const updated = await patch<TestCase>(`/projects/${projectId}/test-cases/${caseId}`, body);
      setTc(updated);
      const history = await get<TestCaseRevision[]>(`/projects/${projectId}/test-cases/${caseId}/revisions`);
      setRevisions(history);
      const parsedSteps = parseStoredTestCaseSteps(updated.steps, updated.expectedResult);
      setSteps(parsedSteps.steps);
      setIsTestDataEnabled(parsedSteps.isTestDataEnabled);
      setPrecondition(updated.precondition || '');
      setPreconditionId(updated.preconditionId ?? null);
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to update');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this test case?')) return;
    await del(`/projects/${projectId}/test-cases/${caseId}`);
    router.push(`/projects/${projectId}`);
  }

  async function handleRestoreRevision(revisionId: number) {
    if (!confirm('Restore this version? This will create a new latest revision.')) {
      return;
    }

    setHistoryError('');
    setHistoryNotice('');
    setRestoringRevisionId(revisionId);

    try {
      const restored = await post<TestCase>(
        `/projects/${projectId}/test-cases/${caseId}/revisions/${revisionId}/restore`,
        {},
      );
      const history = await get<TestCaseRevision[]>(`/projects/${projectId}/test-cases/${caseId}/revisions`);
      setTc(restored);
      setTitle(restored.title);
      setDescription(restored.description || '');
      setPrecondition(restored.precondition || '');
      setPreconditionId(restored.preconditionId ?? null);
      const parsedSteps = parseStoredTestCaseSteps(restored.steps, restored.expectedResult);
      setSteps(parsedSteps.steps);
      setIsTestDataEnabled(parsedSteps.isTestDataEnabled);
      setStatus(restored.status);
      setPriority(restored.priority);
      setTestSuiteId(restored.testSuiteId ?? null);
      setRevisions(history);
      const restoredVersion = history.find((item) => item.id === revisionId)?.version;
      setHistoryNotice(
        restoredVersion
          ? `Restored version ${restoredVersion}. A new latest version was created.`
          : 'Revision restored successfully.',
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setHistoryError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to restore revision');
      } else {
        setHistoryError('Failed to restore revision');
      }
    } finally {
      setRestoringRevisionId(null);
    }
  }

  if (loading || !tc) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    draft: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
    archived: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
    medium: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
    low: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  };

  function updateStepField(index: number, field: keyof StepInput, value: string) {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, { action: '', testData: '', expectedResult: '' }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [{ action: '', testData: '', expectedResult: '' }] : next;
    });
  }

  function formatDiffValue(field: string, value: string | number | null): string {
    if (value === null || value === '') return '(empty)';
    if (field === 'testSuiteId') {
      const suiteName = flatSuites.find(({ suite: s }) => s.id === Number(value))?.suite.name;
      return suiteName || '(no suite)';
    }
    if (field === 'preconditionId') {
      const preconditionName = preconditions.find((item) => item.id === Number(value));
      return preconditionName ? preconditionName.name : `#${value}`;
    }
    const normalized = String(value).replace(/\s+/g, ' ').trim();
    return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
  }

  function getRevisionChanges(current: TestCaseRevision, previous?: TestCaseRevision) {
    const getFieldValue = (
      source: TestCaseRevision,
      key:
        | 'title'
        | 'description'
        | 'precondition'
        | 'preconditionId'
        | 'steps'
        | 'expectedResult'
        | 'status'
        | 'priority'
        | 'testSuiteId',
    ): string | number | null => source[key] ?? null;

    const fields = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'precondition', label: 'Preconditions' },
      { key: 'preconditionId', label: 'Reusable precondition' },
      { key: 'steps', label: 'Steps' },
      { key: 'expectedResult', label: 'Expected Result' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'testSuiteId', label: 'Suite' },
    ] as const;

    if (!previous) {
      return fields.map(({ key, label }) => ({
        key,
        label,
        from: null as string | number | null,
        to: getFieldValue(current, key),
      }));
    }

    return fields
      .map(({ key, label }) => ({
        key,
        label,
        from: getFieldValue(previous, key),
        to: getFieldValue(current, key),
      }))
      .filter((change) => (change.from ?? null) !== (change.to ?? null));
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <button onClick={() => setEditing(false)} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            ← Cancel editing
          </button>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Edit Test Case
          </h1>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
            <input id="title" type="text" required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
              <select id="status" value={status} onChange={(e) => setStatus(e.target.value as TestCaseStatus)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Priority</label>
              <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as TestCasePriority)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {flatSuites.length > 0 && (
            <div>
              <label htmlFor="suite" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Test Suite <span className="text-zinc-400">(optional)</span>
              </label>
              <select
                id="suite"
                value={testSuiteId ?? ''}
                onChange={(e) => setTestSuiteId(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">No suite</option>
                {flatSuites.map(({ suite: s, depth }) => (
                  <option key={s.id} value={s.id}>
                    {'\u00A0\u00A0'.repeat(depth)}{depth > 0 ? '└ ' : ''}{s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="desc" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>

          <div>
            <label htmlFor="precondition-ref" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Reusable Precondition <span className="text-zinc-400">(optional)</span>
            </label>
            <select
              id="precondition-ref"
              value={preconditionId ?? ''}
              onChange={(e) => setPreconditionId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">No reusable precondition</option>
              {preconditions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {preconditionId !== null && (
              <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-500 dark:text-zinc-400">
                {preconditions.find((item) => item.id === preconditionId)?.content}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="precondition" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Preconditions</label>
            <textarea id="precondition" rows={3} value={precondition} onChange={(e) => setPrecondition(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Steps <span className="text-zinc-400">(optional)</span>
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="enable-test-data"
                type="checkbox"
                checked={isTestDataEnabled}
                onChange={(e) => setIsTestDataEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <label htmlFor="enable-test-data" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Enable Test Data field
              </label>
            </div>
            <div className="mt-1 space-y-2">
              {steps.map((step, index) => (
                <div key={`step-${index}`} className="rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                      Step {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>

                  <div className={`grid grid-cols-1 items-start gap-3 sm:gap-4 ${isTestDataEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                    <div>
                      <label htmlFor={`step-action-${index + 1}`} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Action
                      </label>
                      <AutoResizeTextarea
                        data-step-field
                        id={`step-action-${index + 1}`}
                        rows={1}
                        value={step.action}
                        onChange={(e) => updateStepField(index, 'action', e.target.value)}
                        className="mt-1 block w-full resize-none overflow-hidden rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    {isTestDataEnabled && (
                      <div>
                        <label htmlFor={`step-test-data-${index + 1}`} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Test Data
                        </label>
                        <AutoResizeTextarea
                          id={`step-test-data-${index + 1}`}
                          rows={1}
                          value={step.testData}
                          onChange={(e) => updateStepField(index, 'testData', e.target.value)}
                          className="mt-1 block w-full resize-none overflow-hidden rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor={`step-expected-result-${index + 1}`} className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Expected Result
                      </label>
                      <AutoResizeTextarea
                        data-step-field
                        id={`step-expected-result-${index + 1}`}
                        rows={1}
                        value={step.expectedResult}
                        onChange={(e) => updateStepField(index, 'expectedResult', e.target.value)}
                        className="mt-1 block w-full resize-none overflow-hidden rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addStep}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                + Add step
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    );
  }

  const selectedReusablePrecondition =
    preconditions.find((item) => item.id === tc.preconditionId) ?? tc.preconditionRef ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to project
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{tc.title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {showHistory ? 'Hide History' : 'History'}
            </button>
            <button onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Edit
            </button>
            <button onClick={handleDelete}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950">
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[tc.status]}`}>{tc.status}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[tc.priority]}`}>{tc.priority}</span>
        {tc.testSuiteId && flatSuites.length > 0 && (
          <Link
            href={`/projects/${projectId}/test-suites/${tc.testSuiteId}`}
            className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900"
          >
            {flatSuites.find(({ suite: s }) => s.id === tc.testSuiteId)?.suite.name ?? 'Suite'}
          </Link>
        )}
      </div>

      {tc.description && (
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Description</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">{tc.description}</p>
        </div>
      )}

      {(selectedReusablePrecondition || tc.precondition) && (
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Preconditions</h3>
          {selectedReusablePrecondition && (
            <div className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                Reusable precondition
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
                {selectedReusablePrecondition.content}
              </p>
            </div>
          )}
          {tc.precondition && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">{tc.precondition}</p>
          )}
        </div>
      )}

      {tc.steps && (
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Steps</h3>
          <div className="mt-1 space-y-3">
            {(() => {
              try {
                const parsed = JSON.parse(tc.steps);
                if (parsed && Array.isArray(parsed.steps)) {
                  return parsed.steps.map((step: Record<string, string>, idx: number) => (
                    <div key={idx} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Step {idx + 1}</p>
                      <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{step.action || '(no action)'}</p>
                      {step.testData && (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium">Test Data:</span> {step.testData}
                        </p>
                      )}
                      {step.expectedResult && (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium">Expected:</span> {step.expectedResult}
                        </p>
                      )}
                    </div>
                  ));
                }
              } catch {
                // legacy text format fallback
              }
              return <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">{tc.steps}</p>;
            })()}
          </div>
        </div>
      )}

      <div className="text-xs text-zinc-400">
        Created {new Date(tc.createdAt).toLocaleDateString()} · Updated {new Date(tc.updatedAt).toLocaleDateString()}
      </div>

      {showHistory && (
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">History</h3>
          {historyNotice && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
              {historyNotice}
            </div>
          )}
          {historyError && (
            <div className="mt-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
              {historyError}
            </div>
          )}
          {revisions.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No revision history yet.
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {revisions.map((revision, index) => {
                const previous = revisions[index + 1];
                const changes = getRevisionChanges(revision, previous);
                const isCurrentVersion = index === 0;

                return (
                  <div
                    key={revision.id}
                    className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Version {revision.version}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(revision.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Changed by {revision.changedBy?.name || 'Unknown user'}
                      </p>
                      {isCurrentVersion ? (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          Current
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestoreRevision(revision.id)}
                          disabled={restoringRevisionId === revision.id}
                          className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {restoringRevisionId === revision.id ? 'Restoring...' : 'Restore'}
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">{revision.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[revision.status]}`}>
                        {revision.status}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[revision.priority]}`}>
                        {revision.priority}
                      </span>
                    </div>
                    <div className="mt-3 rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60">
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {previous ? 'Changed fields' : 'Initial snapshot'}
                      </p>
                      {changes.length === 0 ? (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">No tracked field changes.</p>
                      ) : (
                        <div className="mt-1 space-y-1">
                          {changes.map((change) => (
                            <p key={`${revision.id}-${change.key}`} className="text-xs text-zinc-600 dark:text-zinc-300">
                              <span className="font-medium">{change.label}:</span>{' '}
                              {formatDiffValue(change.key, change.from)} {'->'} {formatDiffValue(change.key, change.to)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
