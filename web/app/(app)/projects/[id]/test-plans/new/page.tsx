'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, get, post } from '@/lib/api';
import type { CreateTestPlanDto, TestCase, TestPlan, TestPlanStatus, TestPlanType } from '@/lib/types';

export default function NewTestPlanPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cycleLabel, setCycleLabel] = useState('');
  const [type, setType] = useState<TestPlanType>('sprint');
  const [status, setStatus] = useState<TestPlanStatus>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    get<TestCase[]>(`/projects/${projectId}/test-cases`)
      .then((data) => {
        setTestCases(data);
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
      setError('Select at least one test case to define scope');
      return;
    }

    setSubmitting(true);
    setError('');

    const body: CreateTestPlanDto = {
      name,
      type,
      status,
      testCaseIds: Array.from(selectedIds),
      description: description || undefined,
      cycleLabel: cycleLabel || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    try {
      const created = await post<TestPlan>(`/projects/${projectId}/test-plans`, body);
      router.push(`/projects/${projectId}/test-plans/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to create test plan');
      } else {
        setError('Failed to create test plan');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${projectId}/test-plans`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to test plans
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">New Test Plan</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Plan Name</label>
          <input
            id="name"
            type="text"
            required
            minLength={3}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sprint 24 Regression Scope"
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as TestPlanType)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="release">Release</option>
              <option value="sprint">Sprint</option>
              <option value="milestone">Milestone</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TestPlanStatus)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label htmlFor="cycle-label" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cycle Label</label>
            <input
              id="cycle-label"
              value={cycleLabel}
              onChange={(e) => setCycleLabel(e.target.value)}
              placeholder="Sprint 24"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Start Date</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">End Date</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
          <textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Scope Test Cases ({selectedIds.size} of {testCases.length})
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
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-10 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          ) : testCases.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No test cases found. Create test cases first.
            </div>
          ) : (
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
              {testCases.map((tc) => (
                <label key={tc.id} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tc.id)}
                    onChange={() => toggleCase(tc.id)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                  <span className="flex-1 text-zinc-900 dark:text-zinc-100">{tc.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || selectedIds.size === 0}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? 'Creating...' : 'Create Test Plan'}
          </button>
          <Link
            href={`/projects/${projectId}/test-plans`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
