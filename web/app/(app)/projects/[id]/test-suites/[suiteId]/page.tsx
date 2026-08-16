'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { get, patch, del, ApiError } from '@/lib/api';
import type { TestSuite, UpdateTestSuiteDto } from '@/lib/types';

export default function TestSuiteDetailPage() {
  const { id: projectId, suiteId } = useParams<{ id: string; suiteId: string }>();
  const router = useRouter();
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [allSuites, setAllSuites] = useState<TestSuite[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get<TestSuite>(`/projects/${projectId}/test-suites/${suiteId}`),
      get<TestSuite[]>(`/projects/${projectId}/test-suites`),
    ])
      .then(([data, suitesData]) => {
        setSuite(data);
        setAllSuites(suitesData);
        setName(data.name);
        setDescription(data.description || '');
        setParentId(data.parentId ?? null);
      })
      .catch(() => router.push(`/projects/${projectId}`))
      .finally(() => setLoading(false));
  }, [projectId, suiteId, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const body: UpdateTestSuiteDto = { name, parentId };
      body.description = description || undefined;
      const updated = await patch<TestSuite>(`/projects/${projectId}/test-suites/${suiteId}`, body);
      setSuite(updated);
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
    if (!confirm('Delete this test suite? Child suites will also be deleted. Test cases inside will be unassigned, not deleted.')) return;
    await del(`/projects/${projectId}/test-suites/${suiteId}`);
    router.push(`/projects/${projectId}`);
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

  if (loading || !suite) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  // Filter out self and descendants for the parent picker
  const availableParents = allSuites.filter((s) => s.id !== suite.id);

  if (editing) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <button onClick={() => setEditing(false)} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            ← Cancel editing
          </button>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Edit Test Suite
          </h1>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
            <input
              id="name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="parent" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Parent Suite <span className="text-zinc-400">(optional)</span>
            </label>
            <select
              id="parent"
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">No parent (root suite)</option>
              {availableParents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="desc" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea
              id="desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    );
  }

  const cases = suite.testCases ?? [];
  const children = suite.children ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href={`/projects/${projectId}`} className="hover:text-zinc-900 dark:hover:text-zinc-50">
            Project
          </Link>
          {suite.parent && (
            <>
              <span>/</span>
              <Link href={`/projects/${projectId}/test-suites/${suite.parent.id}`} className="hover:text-zinc-900 dark:hover:text-zinc-50">
                {suite.parent.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-50">{suite.name}</span>
        </div>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{suite.name}</h1>
            {suite.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{suite.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Suite stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Test Cases</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{cases.length}</p>
        </div>
        <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Child Suites</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{children.length}</p>
        </div>
        <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Active</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {cases.filter((c) => c.status === 'active').length}
          </p>
        </div>
        <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Draft</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {cases.filter((c) => c.status === 'draft').length}
          </p>
        </div>
      </div>

      {/* Child suites */}
      {children.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Child Suites</h2>
            <Link
              href={`/projects/${projectId}/test-suites/new?parentId=${suiteId}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              + Add Child Suite
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/projects/${projectId}/test-suites/${child.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{child.name}</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {child.testCases?.length ?? 0} cases
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Test cases in this suite */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Test Cases</h2>
          <div className="flex gap-2">
            {children.length === 0 && (
              <Link
                href={`/projects/${projectId}/test-suites/new?parentId=${suiteId}`}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                + Add Child Suite
              </Link>
            )}
            <Link
              href={`/projects/${projectId}/test-cases/new?suiteId=${suiteId}`}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Add Test Case
            </Link>
          </div>
        </div>
        {cases.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No test cases in this suite yet.{' '}
              <Link href={`/projects/${projectId}/test-cases/new?suiteId=${suiteId}`} className="text-zinc-900 underline dark:text-zinc-50">
                Create one
              </Link>{' '}
              or assign existing cases from their edit page.
            </p>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Title</th>
                  <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {cases.map((tc) => (
                  <tr key={tc.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${projectId}/test-cases/${tc.id}`}
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {tc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[tc.status]}`}>
                        {tc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[tc.priority]}`}>
                        {tc.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-400">
        Created {new Date(suite.createdAt).toLocaleDateString()} · Updated {new Date(suite.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
