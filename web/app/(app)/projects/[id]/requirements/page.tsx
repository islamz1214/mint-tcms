'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { del, get } from '@/lib/api';
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

export default function RequirementsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [coverageFilter, setCoverageFilter] = useState<'all' | RequirementCoverageStatus>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get<Project>(`/projects/${projectId}`),
      get<Requirement[]>(`/projects/${projectId}/requirements`),
    ])
      .then(([projectData, requirementsData]) => {
        setProject(projectData);
        setRequirements(requirementsData);
      })
      .catch(() => router.push(`/projects/${projectId}`))
      .finally(() => setLoading(false));
  }, [projectId, router]);

  const filtered = useMemo(() => {
    return requirements.filter((item) => {
      const coverageStatus = item.coverageStatus || 'not_covered';
      const matchesCoverage = coverageFilter === 'all' || coverageStatus === coverageFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        item.key.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q);

      return matchesCoverage && matchesSearch;
    });
  }, [coverageFilter, requirements, search]);

  async function handleDelete(requirementId: number) {
    if (!confirm('Delete this requirement?')) return;

    try {
      await del(`/projects/${projectId}/requirements/${requirementId}`);
      setRequirements((prev) => prev.filter((item) => item.id !== requirementId));
    } catch {
      alert('Failed to delete requirement');
    }
  }

  if (loading || !project) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-56 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Requirements</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{project.name} traceability and coverage</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/projects/${projectId}/requirements/matrix`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Traceability Matrix
            </Link>
            <Link
              href={`/projects/${projectId}/requirements/new`}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + New Requirement
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by key or title"
          className="min-w-60 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <select
          value={coverageFilter}
          onChange={(e) => setCoverageFilter(e.target.value as 'all' | RequirementCoverageStatus)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="all">All coverage</option>
          <option value="not_covered">Not Covered</option>
          <option value="covered">Covered</option>
          <option value="executed_pass">Executed Pass</option>
          <option value="executed_fail">Executed Fail</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No requirements found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Key</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Title</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Coverage</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Linked Cases</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Latest Exec</th>
                <th className="px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {filtered.map((item) => {
                const coverage = item.coverageStatus || 'not_covered';
                return (
                  <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{item.key}</td>
                    <td className="px-4 py-3">
                      <Link href={`/projects/${projectId}/requirements/${item.id}`} className="text-zinc-900 hover:underline dark:text-zinc-50">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${coverageStyles[coverage]}`}>
                        {coverageLabels[coverage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{item.linkedTestCasesCount ?? item.testCases?.length ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {item.latestExecutionAt ? new Date(item.latestExecutionAt).toLocaleString() : 'Not executed'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
