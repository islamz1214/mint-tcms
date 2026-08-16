'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { del, get } from '@/lib/api';
import type { Defect, DefectSeverity, DefectStatus, Project } from '@/lib/types';

const severityStyles: Record<DefectSeverity, string> = {
  low: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  critical: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const statusStyles: Record<DefectStatus, string> = {
  open: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  resolved: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  closed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
};

const statusLabels: Record<DefectStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function DefectsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | DefectStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | DefectSeverity>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      get<Project>(`/projects/${projectId}`),
      get<Defect[]>(`/projects/${projectId}/defects`),
    ])
      .then(([projectData, defectsData]) => {
        setProject(projectData);
        setDefects(defectsData);
      })
      .catch(() => router.push(`/projects/${projectId}`))
      .finally(() => setLoading(false));
  }, [projectId, router]);

  const filtered = useMemo(() => {
    return defects.filter((d) => {
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        d.title.toLowerCase().includes(q) ||
        (d.externalKey?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [defects, statusFilter, severityFilter, search]);

  async function handleDelete(defectId: number) {
    if (!confirm('Delete this defect?')) return;
    try {
      await del(`/projects/${projectId}/defects/${defectId}`);
      setDefects((prev) => prev.filter((d) => d.id !== defectId));
    } catch {
      alert('Failed to delete defect.');
    }
  }

  if (loading || !project) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-56 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to project
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Defects</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{project.name}</p>
          </div>
          <Link
            href={`/projects/${projectId}/defects/new`}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + New Defect
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or key"
          className="min-w-48 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | DefectStatus)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as 'all' | DefectSeverity)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No defects found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Title</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Severity</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Priority</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Source</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Results</th>
                <th className="px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {filtered.map((defect) => (
                <tr key={defect.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${projectId}/defects/${defect.id}`}
                      className="font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
                    >
                      {defect.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${severityStyles[defect.severity]}`}
                    >
                      {defect.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${severityStyles[defect.priority]}`}
                    >
                      {defect.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[defect.status]}`}>
                      {statusLabels[defect.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {defect.sourceType === 'external' && defect.externalUrl ? (
                      <a
                        href={defect.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {defect.externalKey ?? 'External'} ↗
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Internal</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {defect.results?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/projects/${projectId}/defects/${defect.id}`}
                        className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(defect.id)}
                        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
