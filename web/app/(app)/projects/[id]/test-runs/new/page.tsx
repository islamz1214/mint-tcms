'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { get, post, ApiError } from '@/lib/api';
import type { TestCase, TestRun, CreateTestRunDto } from '@/lib/types';

export default function NewTestRunPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<TestCase[]>(`/projects/${projectId}/test-cases`)
      .then((data) => {
        setTestCases(data);
        // Pre-select all active cases
        setSelectedIds(new Set(data.filter((tc) => tc.status === 'active').map((tc) => tc.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  function toggleCase(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === testCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(testCases.map((tc) => tc.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError('Select at least one test case');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const body: CreateTestRunDto = {
        name,
        testCaseIds: Array.from(selectedIds),
      };
      if (description.trim()) body.description = description;
      const run = await post<TestRun>(`/projects/${projectId}/test-runs`, body);
      router.push(`/projects/${projectId}/test-runs/${run.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to create test run');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const priorityColors: Record<string, string> = {
    high: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
    medium: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
    low: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          New Test Run
        </h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Run Name
          </label>
          <input
            id="name"
            type="text"
            required
            minLength={3}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="Sprint 1 Regression"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Description <span className="text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {/* Test case selection */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select Test Cases ({selectedIds.size} of {testCases.length})
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {selectedIds.size === testCases.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {loading ? (
            <div className="mt-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : testCases.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-zinc-300 p-4 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No test cases in this project.{' '}
                <Link href={`/projects/${projectId}/test-cases/new`} className="underline">
                  Create one first.
                </Link>
              </p>
            </div>
          ) : (
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
              {testCases.map((tc) => (
                <label
                  key={tc.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    selectedIds.has(tc.id)
                      ? 'bg-zinc-100 dark:bg-zinc-800'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tc.id)}
                    onChange={() => toggleCase(tc.id)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                  <span className="flex-1 text-zinc-900 dark:text-zinc-100">{tc.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[tc.priority]}`}>
                    {tc.priority}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || selectedIds.size === 0}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? 'Creating…' : 'Create Test Run'}
          </button>
          <Link
            href={`/projects/${projectId}`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
