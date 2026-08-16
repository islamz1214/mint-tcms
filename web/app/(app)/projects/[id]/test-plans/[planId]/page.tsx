'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, del, get, patch } from '@/lib/api';
import type { TestCase, TestPlan, TestPlanStatus, TestPlanType, UpdateTestPlanDto } from '@/lib/types';

const typeLabel: Record<string, string> = {
  release: 'Release',
  sprint: 'Sprint',
  milestone: 'Milestone',
};

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  active: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  closed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
};

export default function TestPlanDetailPage() {
  const { id: projectId, planId } = useParams<{ id: string; planId: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cycleLabel, setCycleLabel] = useState('');
  const [type, setType] = useState<TestPlanType>('sprint');
  const [status, setStatus] = useState<TestPlanStatus>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([
      get<TestPlan>(`/projects/${projectId}/test-plans/${planId}`),
      get<TestCase[]>(`/projects/${projectId}/test-cases`),
    ])
      .then(([planData, cases]) => {
        setPlan(planData);
        setTestCases(cases);
        setName(planData.name);
        setDescription(planData.description || '');
        setCycleLabel(planData.cycleLabel || '');
        setType(planData.type);
        setStatus(planData.status);
        setStartDate(planData.startDate ? planData.startDate.slice(0, 10) : '');
        setEndDate(planData.endDate ? planData.endDate.slice(0, 10) : '');
        setSelectedIds(new Set((planData.testCases || []).map((tc) => tc.id)));
      })
      .catch(() => router.push(`/projects/${projectId}/test-plans`))
      .finally(() => setLoading(false));
  }, [projectId, planId, router]);

  function toggleCase(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;

    if (selectedIds.size === 0) {
      setError('Select at least one scoped test case');
      return;
    }

    setSubmitting(true);
    setError('');

    const body: UpdateTestPlanDto = {
      name,
      description,
      cycleLabel,
      type,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      testCaseIds: Array.from(selectedIds),
    };

    try {
      const updated = await patch<TestPlan>(`/projects/${projectId}/test-plans/${plan.id}`, body);
      setPlan(updated);
      setSelectedIds(new Set((updated.testCases || []).map((tc) => tc.id)));
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to save test plan');
      } else {
        setError('Failed to save test plan');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!plan) return;
    if (!confirm('Delete this test plan?')) return;

    await del(`/projects/${projectId}/test-plans/${plan.id}`);
    router.push(`/projects/${projectId}/test-plans`);
  }

  if (loading || !plan) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-60 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${projectId}/test-plans`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to test plans
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{plan.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {typeLabel[plan.type] || plan.type}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 font-medium ${statusColors[plan.status]}`}>
                {plan.status}
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {(plan.testCases || []).length} in scope
              </span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Plan Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Scoped Test Cases</p>
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
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting ? 'Saving...' : 'Save Plan'}
        </button>
      </form>
    </div>
  );
}
