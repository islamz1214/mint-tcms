'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { get } from '@/lib/api';
import type { Project, ProjectStats } from '@/lib/types';

/* ─── Donut chart (pure CSS) ─────────────────────── */
function DonutChart({
  passed,
  failed,
  blocked,
  skipped,
  pending,
  total,
}: {
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  pending: number;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="flex h-40 w-40 items-center justify-center rounded-full border-8 border-zinc-200 dark:border-zinc-700">
        <span className="text-sm text-zinc-400">No data</span>
      </div>
    );
  }

  const pPassed = (passed / total) * 100;
  const pFailed = (failed / total) * 100;
  const pBlocked = (blocked / total) * 100;
  const pSkipped = (skipped / total) * 100;
  const pPending = (pending / total) * 100;

  // Build conic gradient stops
  let offset = 0;
  const stops: string[] = [];
  const segments = [
    { color: '#22c55e', pct: pPassed },
    { color: '#ef4444', pct: pFailed },
    { color: '#3b82f6', pct: pBlocked },
    { color: '#f59e0b', pct: pSkipped },
    { color: '#a1a1aa', pct: pPending },
  ];

  for (const seg of segments) {
    if (seg.pct > 0) {
      stops.push(`${seg.color} ${offset}% ${offset + seg.pct}%`);
      offset += seg.pct;
    }
  }

  return (
    <div
      className="relative h-40 w-40 rounded-full"
      style={{
        background: `conic-gradient(${stops.join(', ')})`,
      }}
    >
      <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900">
        <div className="text-center">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {total > 0 ? Math.round((passed / total) * 100) : 0}%
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">pass rate</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Horizontal stacked bar ─────────────────────── */
function StackedBar({
  passed,
  failed,
  blocked,
  skipped,
  pending,
  total,
}: {
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  pending: number;
  total: number;
}) {
  if (total === 0) {
    return <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-700" />;
  }

  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full">
      {passed > 0 && (
        <div className="bg-green-500" style={{ width: `${(passed / total) * 100}%` }} />
      )}
      {failed > 0 && (
        <div className="bg-red-500" style={{ width: `${(failed / total) * 100}%` }} />
      )}
      {blocked > 0 && (
        <div className="bg-blue-500" style={{ width: `${(blocked / total) * 100}%` }} />
      )}
      {skipped > 0 && (
        <div className="bg-amber-500" style={{ width: `${(skipped / total) * 100}%` }} />
      )}
      {pending > 0 && (
        <div className="bg-zinc-400" style={{ width: `${(pending / total) * 100}%` }} />
      )}
    </div>
  );
}

/* ─── Trend bar chart ────────────────────────────── */
function TrendChart({ runs }: { runs: ProjectStats['runs'] }) {
  if (runs.length === 0) return null;

  const maxTotal = Math.max(...runs.map((r) => r.total), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height: '160px' }}>
      {runs.map((run) => {
        const height = (run.total / maxTotal) * 100;
        const passedH = run.total > 0 ? (run.passed / run.total) * height : 0;
        const failedH = run.total > 0 ? (run.failed / run.total) * height : 0;
        const blockedH = run.total > 0 ? (run.blocked / run.total) * height : 0;
        const skippedH = run.total > 0 ? (run.skipped / run.total) * height : 0;
        const pendingH = height - passedH - failedH - blockedH - skippedH;

        return (
          <div
            key={run.runId}
            className="group relative flex flex-1 flex-col justify-end"
            style={{ height: '100%' }}
          >
            <div className="flex flex-col overflow-hidden rounded-t" style={{ height: `${height}%` }}>
              {pendingH > 0 && (
                <div className="bg-zinc-400" style={{ height: `${(pendingH / height) * 100}%` }} />
              )}
              {skippedH > 0 && (
                <div className="bg-amber-500" style={{ height: `${(skippedH / height) * 100}%` }} />
              )}
              {blockedH > 0 && (
                <div className="bg-blue-500" style={{ height: `${(blockedH / height) * 100}%` }} />
              )}
              {failedH > 0 && (
                <div className="bg-red-500" style={{ height: `${(failedH / height) * 100}%` }} />
              )}
              {passedH > 0 && (
                <div className="bg-green-500" style={{ height: `${(passedH / height) * 100}%` }} />
              )}
            </div>
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block dark:bg-zinc-100 dark:text-zinc-900">
              <p className="font-medium">{run.name}</p>
              <p>{run.passRate}% pass rate · {run.total} cases</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────── */
export default function ProjectReportsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get<Project>(`/projects/${projectId}`),
      get<ProjectStats>(`/projects/${projectId}/test-runs/stats`),
    ])
      .then(([p, s]) => {
        setProject(p);
        setStats(s);
      })
      .catch(() => router.push('/projects'))
      .finally(() => setLoading(false));
  }, [projectId, router]);

  if (loading || !project || !stats) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const { overall, runs } = stats;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reports — {project.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Pass/fail metrics across all test runs
        </p>
      </div>

      {overall.total === 0 ? (
        <div className="mint-card dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            No test results yet. Create a test run and execute some test cases to see metrics here.
          </p>
          <Link
            href={`/projects/${projectId}`}
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Go to project
          </Link>
        </div>
      ) : (
        <>
          {/* Overall stats row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Pass Rate</p>
              <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
                {overall.passRate}%
              </p>
            </div>
            <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Runs</p>
              <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {overall.totalRuns}
              </p>
            </div>
            <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Passed</p>
              <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
                {overall.passed}
              </p>
            </div>
            <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Failed</p>
              <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
                {overall.failed}
              </p>
            </div>
            <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Blocked</p>
              <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
                {overall.blocked}
              </p>
            </div>
            <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Skipped</p>
              <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
                {overall.skipped}
              </p>
            </div>
            <div className="mint-card mint-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Pending</p>
              <p className="mt-1 text-3xl font-bold text-zinc-500 dark:text-zinc-400">
                {overall.pending}
              </p>
            </div>
          </div>

          {/* Overall bar */}
          <div className="mint-card mint-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Overall Distribution</h2>
            <div className="mt-4">
              <StackedBar
                passed={overall.passed}
                failed={overall.failed}
                blocked={overall.blocked}
                skipped={overall.skipped}
                pending={overall.pending}
                total={overall.total}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                Passed ({overall.passed})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                Failed ({overall.failed})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                Blocked ({overall.blocked})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                Skipped ({overall.skipped})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-400" />
                Pending ({overall.pending})
              </span>
            </div>
          </div>

          {/* Charts row: Donut + Trend */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Donut */}
            <div className="flex flex-col items-center mint-card mint-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 self-start text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Result Breakdown
              </h2>
              <DonutChart
                passed={overall.passed}
                failed={overall.failed}
                blocked={overall.blocked}
                skipped={overall.skipped}
                pending={overall.pending}
                total={overall.total}
              />
            </div>

            {/* Trend */}
            <div className="mint-card mint-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Run Trend {runs.length > 0 && <span className="font-normal text-zinc-400">(last {runs.length} runs)</span>}
              </h2>
              {runs.length > 0 ? (
                <TrendChart runs={runs.slice(-20)} />
              ) : (
                <p className="text-sm text-zinc-400">No runs yet</p>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Passed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Failed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Blocked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Skipped
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-zinc-400" /> Pending
                </span>
              </div>
            </div>
          </div>

          {/* Per-run table */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">All Test Runs</h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Run</th>
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Results</th>
                    <th className="px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Pass Rate</th>
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                  {[...runs].reverse().map((run) => (
                    <tr key={run.runId} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${projectId}/test-runs/${run.runId}`}
                          className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                        >
                          {run.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            run.status === 'completed'
                              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                              : run.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {run.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-32">
                            <StackedBar
                              passed={run.passed}
                              failed={run.failed}
                              blocked={run.blocked}
                              skipped={run.skipped}
                              pending={run.pending}
                              total={run.total}
                            />
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {run.passed}✓ {run.failed}✗ {run.blocked}⊘ {run.skipped}↷ {run.pending}◯
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            run.passRate >= 80
                              ? 'text-green-600 dark:text-green-400'
                              : run.passRate >= 50
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {run.passRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                        {new Date(run.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
