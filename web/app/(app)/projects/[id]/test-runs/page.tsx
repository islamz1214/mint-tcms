'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { get } from '@/lib/api';
import type { TestRun } from '@/lib/types';

const runStatusColors: Record<string, string> = {
  pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  completed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
};

export default function TestRunsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<TestRun[]>(`/projects/${projectId}/test-runs`)
      .then(setTestRuns)
      .catch(() => router.push(`/projects/${projectId}`))
      .finally(() => setLoading(false));
  }, [projectId, router]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Back to project
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Test Runs
          </h1>
        </div>
        <Link
          href={`/projects/${projectId}/test-runs/new`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + New Test Run
        </Link>
      </div>

      {testRuns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No test runs yet.{' '}
            <Link href={`/projects/${projectId}/test-runs/new`} className="text-zinc-900 underline dark:text-zinc-50">
              Create one
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {testRuns.map((run) => (
            <Link
              key={run.id}
              href={`/projects/${projectId}/test-runs/${run.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-5 py-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <div className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{run.name}</p>
                {run.description && (
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{run.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(run.createdAt).toLocaleDateString()}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${runStatusColors[run.status]}`}>
                  {run.status.replace('_', ' ')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
