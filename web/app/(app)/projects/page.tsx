'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get, del } from '@/lib/api';
import type { Project } from '@/lib/types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<Project[]>('/projects')
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    if (!confirm('Delete this project? All test cases and runs will be lost.')) return;
    try {
      await del(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Failed to delete project');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Projects
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your test management projects
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + New Project
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mint-card dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">No projects yet</p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Link href={`/projects/${project.id}`} className="flex-1">
                <p className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                  {project.name}
                </p>
                {project.description && (
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {project.description}
                  </p>
                )}
              </Link>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    project.isActive
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {project.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="text-sm text-zinc-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
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
