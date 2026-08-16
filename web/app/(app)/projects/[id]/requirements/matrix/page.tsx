'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { get } from '@/lib/api';
import type { Project, Requirement, RequirementCoverageStatus } from '@/lib/types';

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

export default function TraceabilityMatrixPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get<Project>(`/projects/${projectId}`),
      get<Requirement[]>(`/projects/${projectId}/requirements/matrix`),
    ])
      .then(([projectData, matrixRows]) => {
        setProject(projectData);
        setRows(matrixRows);
      })
      .catch(() => router.push(`/projects/${projectId}/requirements`))
      .finally(() => setLoading(false));
  }, [projectId, router]);

  if (loading || !project) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${projectId}/requirements`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to requirements
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Traceability Matrix</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{project.name} requirement coverage and latest execution view</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Requirement</th>
              <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Linked Cases</th>
              <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Coverage</th>
              <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Passed / Failed / Blocked / Pending / Skipped</th>
              <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Last Run</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {rows.map((row) => {
              const coverage = row.coverageStatus || 'not_covered';
              return (
                <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${projectId}/requirements/${row.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                      {row.key} · {row.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{row.linkedTestCasesCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${coverageStyles[coverage]}`}>
                      {coverageLabels[coverage]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {(row.passedCount ?? 0)} / {(row.failedCount ?? 0)} / {(row.blockedCount ?? 0)} / {(row.pendingCount ?? 0)} / {(row.skippedCount ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {row.latestExecutionAt ? new Date(row.latestExecutionAt).toLocaleString() : 'Not executed'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
