'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, del, get, patch } from '@/lib/api';
import type { Defect, DefectSeverity, DefectStatus, TestResult, TestRun, TestCase } from '@/lib/types';

const severityStyles: Record<DefectSeverity, string> = {
  low: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  critical: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const statusStyles: Record<DefectStatus, string> = {
  open: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  resolved: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  closed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
};

const resultStatusStyles: Record<string, string> = {
  passed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  blocked: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  skipped: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

type ResultWithRelations = TestResult & { testCase?: TestCase; testRun?: TestRun };

export default function DefectDetailPage() {
  const { id: projectId, defectId } = useParams<{ id: string; defectId: string }>();
  const router = useRouter();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('open');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [environment, setEnvironment] = useState('');
  const [component, setComponent] = useState('');
  const [externalKey, setExternalKey] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    get<Defect>(`/projects/${projectId}/defects/${defectId}`)
      .then((data) => {
        setDefect(data);
        setTitle(data.title);
        setDescription(data.description ?? '');
        setSeverity(data.severity);
        setPriority(data.priority);
        setStatus(data.status);
        setExpectedResult(data.expectedResult ?? '');
        setActualResult(data.actualResult ?? '');
        setEnvironment(data.environment ?? '');
        setComponent(data.component ?? '');
        setExternalKey(data.externalKey ?? '');
        setExternalUrl(data.externalUrl ?? '');
      })
      .catch(() => router.push(`/projects/${projectId}/defects`))
      .finally(() => setLoading(false));
  }, [projectId, defectId, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!defect) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await patch<Defect>(`/projects/${projectId}/defects/${defectId}`, {
        title,
        description: description || undefined,
        severity,
        priority,
        status,
        expectedResult: expectedResult || undefined,
        actualResult: actualResult || undefined,
        environment: environment || undefined,
        component: component || undefined,
        externalKey: externalKey || undefined,
        externalUrl: externalUrl || undefined,
      });
      setDefect(updated);
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setSaveError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to save.');
      } else {
        setSaveError('Failed to save.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this defect? This cannot be undone.')) return;
    try {
      await del(`/projects/${projectId}/defects/${defectId}`);
      router.push(`/projects/${projectId}/defects`);
    } catch {
      alert('Failed to delete defect.');
    }
  }

  if (loading || !defect) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-96 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  const isExternal = defect.sourceType === 'external';
  const results = (defect.results ?? []) as ResultWithRelations[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/projects/${projectId}/defects`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to defects
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{defect.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${severityStyles[defect.severity]}`}>
                Severity: {defect.severity}
              </span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${severityStyles[defect.priority]}`}>
                Priority: {defect.priority}
              </span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[defect.status]}`}>
                {defect.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {isExternal ? 'External' : 'Internal'}
              </span>
              {defect.component && (
                <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                  {defect.component}
                </span>
              )}
              {isExternal && defect.externalUrl && (
                <a
                  href={defect.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {defect.externalKey ?? 'View issue'} ↗
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="max-w-lg space-y-5 mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div>
            <label htmlFor="edit-title" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-title"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {isExternal ? (
            <>
              <div>
                <label htmlFor="edit-key" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Issue key
                </label>
                <input
                  id="edit-key"
                  value={externalKey}
                  onChange={(e) => setExternalKey(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="PROJ-123"
                />
              </div>
              <div>
                <label htmlFor="edit-url" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Issue URL
                </label>
                <input
                  id="edit-url"
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="https://..."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="edit-description" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label htmlFor="edit-expected" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Expected result
                </label>
                <textarea
                  id="edit-expected"
                  rows={2}
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label htmlFor="edit-actual" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Actual result
                </label>
                <textarea
                  id="edit-actual"
                  rows={2}
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-severity" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Severity
                  </label>
                  <select
                    id="edit-severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-priority" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Priority
                  </label>
                  <select
                    id="edit-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-status" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Status
                  </label>
                  <select
                    id="edit-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-component" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Component
                  </label>
                  <input
                    id="edit-component"
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    placeholder="e.g. Login, Checkout"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-environment" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Environment
                </label>
                <input
                  id="edit-environment"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g. Chrome 126 / macOS, Staging, iOS 17"
                />
              </div>
            </>
          )}

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {saveError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setSaveError('');
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Details (view mode, internal only) */}
      {!editing && !isExternal && (
        <div className="max-w-2xl space-y-4 mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {defect.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Description</p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">{defect.description}</p>
            </div>
          )}
          {(defect.expectedResult || defect.actualResult) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {defect.expectedResult && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Expected result</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">{defect.expectedResult}</p>
                </div>
              )}
              {defect.actualResult && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Actual result</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">{defect.actualResult}</p>
                </div>
              )}
            </div>
          )}
          {(defect.environment || defect.component) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {defect.environment && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Environment</p>
                  <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300">{defect.environment}</p>
                </div>
              )}
              {defect.component && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Component</p>
                  <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300">{defect.component}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Linked Test Results */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Linked Test Results</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Test results that reference this defect — provides test → defect traceability
        </p>

        {results.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No linked test results yet. Link this defect to a failed result during test run execution.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Test Case</th>
                  <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Test Run</th>
                  <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Result</th>
                  <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Executed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {results.map((result) => (
                  <tr key={result.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {result.testCase?.title ?? <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {result.testRun ? (
                        <Link
                          href={`/projects/${projectId}/test-runs/${result.testRun.id}`}
                          className="text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-100"
                        >
                          {result.testRun.name}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${resultStatusStyles[result.status]}`}
                      >
                        {result.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {new Date(result.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
