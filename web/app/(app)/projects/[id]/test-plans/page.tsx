'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { del, get } from '@/lib/api';
import type { Project, TestPlan } from '@/lib/types';

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

export default function TestPlansPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get<Project>(`/projects/${projectId}`),
      get<TestPlan[]>(`/projects/${projectId}/test-plans`),
    ])
      .then(([projectData, plansData]) => {
        setProject(projectData);
        setPlans(plansData);
      })
      .catch(() => router.push(`/projects/${projectId}`))
      .finally(() => setLoading(false));
  }, [projectId, router]);

  async function handleDelete(planId: number) {
    if (!confirm('Delete this test plan?')) return;

    try {
      await del(`/projects/${projectId}/test-plans/${planId}`);
      setPlans((prev) => prev.filter((plan) => plan.id !== planId));
    } catch {
      alert('Failed to delete test plan');
    }
  }

  if (loading || !project) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-60 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to project
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Test Plans</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {project.name} planning scopes for releases, sprints, and milestones
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/test-plans/new`}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + New Test Plan
          </Link>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No test plans yet. Create your first planning cycle.
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/projects/${projectId}/test-plans/${plan.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                    {plan.name}
                  </Link>
                  {plan.description && (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{plan.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {typeLabel[plan.type] || plan.type}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 font-medium ${statusColors[plan.status]}`}>
                      {plan.status}
                    </span>
                    {plan.cycleLabel && (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {plan.cycleLabel}
                      </span>
                    )}
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {(plan.testCases || []).length} in scope
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
