'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  Project,
  ProjectStats,
  ProjectStatsSummaryResponse,
} from '@/lib/types';

type OverallStats = ProjectStats['overall'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allStats, setAllStats] = useState<{ projectId: number; stats: OverallStats }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<ProjectStatsSummaryResponse>('/projects/stats-summary')
      .then(({ projects }) => {
        setProjects(projects);
        setAllStats(projects.map((p) => ({ projectId: p.id, stats: p.stats })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Aggregate stats across all projects
  const totals = allStats.reduce(
    (acc, { stats }) => ({
      passed: acc.passed + stats.passed,
      failed: acc.failed + stats.failed,
      blocked: acc.blocked + stats.blocked,
      skipped: acc.skipped + stats.skipped,
      pending: acc.pending + stats.pending,
      total: acc.total + stats.total,
      totalRuns: acc.totalRuns + stats.totalRuns,
    }),
    { passed: 0, failed: 0, blocked: 0, skipped: 0, pending: 0, total: 0, totalRuns: 0 },
  );
  const overallPassRate = totals.total > 0 ? Math.round((totals.passed / totals.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome back, {user?.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Here&apos;s an overview of your projects
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <div className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Projects</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {loading ? '–' : projects.length}
          </p>
        </div>
        <div className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Test Runs</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {loading ? '–' : totals.totalRuns}
          </p>
        </div>
        <div className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pass Rate</p>
          <p className={`mt-1 text-3xl font-bold ${
            overallPassRate >= 80
              ? 'text-green-600 dark:text-green-400'
              : overallPassRate >= 50
                ? 'text-amber-600 dark:text-amber-400'
                : totals.total > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-900 dark:text-zinc-50'
          }`}>
            {loading ? '–' : totals.total > 0 ? `${overallPassRate}%` : '–'}
          </p>
        </div>
        <div className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Passed</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {loading ? '–' : totals.passed}
          </p>
        </div>
        <div className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Failed</p>
          <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
            {loading ? '–' : totals.failed}
          </p>
        </div>
        <div className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Blocked</p>
          <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {loading ? '–' : totals.blocked}
          </p>
        </div>
        <div className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Quick Actions</p>
          <Link
            href="/projects/new"
            className="mt-2 inline-block rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + New Project
          </Link>
        </div>
      </div>

      {/* Overall distribution bar */}
      {totals.total > 0 && (
        <div className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Overall Results</h2>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
            {totals.passed > 0 && <div className="bg-green-500" style={{ width: `${(totals.passed / totals.total) * 100}%` }} />}
            {totals.failed > 0 && <div className="bg-red-500" style={{ width: `${(totals.failed / totals.total) * 100}%` }} />}
            {totals.blocked > 0 && <div className="bg-blue-500" style={{ width: `${(totals.blocked / totals.total) * 100}%` }} />}
            {totals.skipped > 0 && <div className="bg-amber-500" style={{ width: `${(totals.skipped / totals.total) * 100}%` }} />}
            {totals.pending > 0 && <div className="bg-zinc-400" style={{ width: `${(totals.pending / totals.total) * 100}%` }} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Passed ({totals.passed})</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Failed ({totals.failed})</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Blocked ({totals.blocked})</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Skipped ({totals.skipped})</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-zinc-400" /> Pending ({totals.pending})</span>
          </div>
        </div>
      )}

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Recent Projects
          </h2>
          <Link
            href="/projects"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-4 mint-card dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No projects yet. Create your first project to get started.
            </p>
            <Link
              href="/projects/new"
              className="mt-3 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Create Project
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {projects.slice(0, 5).map((project) => {
              const projStats = allStats.find((s) => s.projectId === project.id);
              const pr = projStats?.stats;
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {pr && pr.total > 0 && (
                      <span
                        className={`text-sm font-semibold ${
                          pr.passRate >= 80
                            ? 'text-green-600 dark:text-green-400'
                            : pr.passRate >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {pr.passRate}%
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        project.isActive
                          ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {project.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
