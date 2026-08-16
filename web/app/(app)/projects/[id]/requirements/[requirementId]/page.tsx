'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, del, get, patch, post } from '@/lib/api';
import type {
  Requirement,
  RequirementCoverageStatus,
  RequirementPriority,
  RequirementStatus,
  TestCase,
  UpdateRequirementDto,
} from '@/lib/types';

const coverageStyles: Record<RequirementCoverageStatus, string> = {
  not_covered: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  covered: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  executed_pass: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  executed_fail: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  mixed: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

const coverageLabels: Record<RequirementCoverageStatus, string> = {
  not_covered: 'Not Covered',
  covered: 'Covered',
  executed_pass: 'Executed Pass',
  executed_fail: 'Executed Fail',
  mixed: 'Mixed',
};

export default function RequirementDetailPage() {
  const { id: projectId, requirementId } = useParams<{ id: string; requirementId: string }>();
  const router = useRouter();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [keyInput, setKeyInput] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RequirementStatus>('draft');
  const [priority, setPriority] = useState<RequirementPriority>('medium');
  const [externalSystem, setExternalSystem] = useState('');
  const [externalId, setExternalId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  useEffect(() => {
    Promise.all([
      get<Requirement>(`/projects/${projectId}/requirements/${requirementId}`),
      get<TestCase[]>(`/projects/${projectId}/test-cases`),
      get<Requirement[]>(`/projects/${projectId}/requirements`),
    ])
      .then(([requirementData, testCaseData, requirementList]) => {
        const enriched = requirementList.find((item) => item.id === requirementData.id) || requirementData;
        setRequirement(enriched);
        setTestCases(testCaseData);
        hydrateForm(enriched);
      })
      .catch(() => router.push(`/projects/${projectId}/requirements`))
      .finally(() => setLoading(false));
  }, [projectId, requirementId, router]);

  const linkedIds = useMemo(
    () => new Set((requirement?.testCases || []).map((item) => item.id)),
    [requirement?.testCases],
  );

  const availableCases = useMemo(
    () => testCases.filter((item) => !linkedIds.has(item.id)),
    [linkedIds, testCases],
  );

  function hydrateForm(value: Requirement) {
    setKeyInput(value.key);
    setTitle(value.title);
    setDescription(value.description || '');
    setStatus(value.status);
    setPriority(value.priority);
    setExternalSystem(value.externalSystem || '');
    setExternalId(value.externalId || '');
    setExternalUrl(value.externalUrl || '');
  }

  async function refreshRequirement() {
    const [one, all] = await Promise.all([
      get<Requirement>(`/projects/${projectId}/requirements/${requirementId}`),
      get<Requirement[]>(`/projects/${projectId}/requirements`),
    ]);
    const enriched = all.find((item) => item.id === one.id) || one;
    setRequirement(enriched);
    return enriched;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!requirement) return;

    setSubmitting(true);
    setError('');
    setNotice('');

    const payload: UpdateRequirementDto = {
      key: keyInput,
      title,
      description,
      status,
      priority,
      externalSystem,
      externalId,
      externalUrl,
    };

    try {
      await patch<Requirement>(`/projects/${projectId}/requirements/${requirement.id}`, payload);
      const refreshed = await refreshRequirement();
      hydrateForm(refreshed);
      setNotice('Requirement updated');
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to update requirement');
      } else {
        setError('Failed to update requirement');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!requirement) return;
    if (!confirm('Delete this requirement?')) return;

    await del(`/projects/${projectId}/requirements/${requirement.id}`);
    router.push(`/projects/${projectId}/requirements`);
  }

  async function handleLinkCase() {
    if (!selectedCaseId || !requirement) return;

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      await post(`/projects/${projectId}/requirements/${requirement.id}/test-cases/${selectedCaseId}`, {});
      await refreshRequirement();
      setSelectedCaseId('');
      setNotice('Linked test case');
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to link test case');
      } else {
        setError('Failed to link test case');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlinkCase(testCaseId: number) {
    if (!requirement) return;

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      await del(`/projects/${projectId}/requirements/${requirement.id}/test-cases/${testCaseId}`);
      await refreshRequirement();
      setNotice('Unlinked test case');
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to unlink test case');
      } else {
        setError('Failed to unlink test case');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !requirement) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  const coverage = requirement.coverageStatus || 'not_covered';

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${projectId}/requirements`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to requirements
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {requirement.key} · {requirement.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Requirement detail and traceability</p>
          </div>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${coverageStyles[coverage]}`}>
          {coverageLabels[coverage]}
        </span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Linked: {requirement.linkedTestCasesCount ?? requirement.testCases?.length ?? 0}
        </span>
        {requirement.latestExecutionAt && (
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Latest Exec: {new Date(requirement.latestExecutionAt).toLocaleString()}
          </span>
        )}
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={handleSave} className="space-y-4 mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Requirement Fields</h2>
          <div>
            <label htmlFor="key" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Key</label>
            <input
              id="key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
            <input
              id="title"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RequirementStatus)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Priority</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as RequirementPriority)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={externalSystem}
              onChange={(e) => setExternalSystem(e.target.value)}
              placeholder="External system"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="External ID"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="External URL"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="space-y-4 mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Traceability Summary</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Passed: {requirement.passedCount ?? 0}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Failed: {requirement.failedCount ?? 0}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Blocked: {requirement.blockedCount ?? 0}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Pending: {requirement.pendingCount ?? 0}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Skipped: {requirement.skippedCount ?? 0}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Last update: {new Date(requirement.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Linked Test Cases</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="min-w-60 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Select test case to link</option>
            {availableCases.map((testCase) => (
              <option key={testCase.id} value={testCase.id}>{testCase.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleLinkCase}
            disabled={!selectedCaseId || submitting}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Link Test Case
          </button>
        </div>

        {(requirement.testCases || []).length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No linked test cases yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {(requirement.testCases || []).map((testCase) => (
              <div key={testCase.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <Link href={`/projects/${projectId}/test-cases/${testCase.id}`} className="text-sm text-zinc-900 hover:underline dark:text-zinc-50">
                  {testCase.title}
                </Link>
                <button
                  type="button"
                  onClick={() => handleUnlinkCase(testCase.id)}
                  disabled={submitting}
                  className="text-xs font-medium text-zinc-500 hover:text-red-600 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-red-400"
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
