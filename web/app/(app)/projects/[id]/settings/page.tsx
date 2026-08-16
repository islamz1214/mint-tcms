'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { get, patch, del, ApiError } from '@/lib/api';
import type { Project, UpdateProjectDto } from '@/lib/types';

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    get<Project>(`/projects/${id}`)
      .then((p) => {
        setName(p.name);
        setDescription(p.description ?? '');
      })
      .catch(() => router.push('/projects'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const body: UpdateProjectDto = {};
      if (name.trim()) body.name = name.trim();
      body.description = description.trim() || undefined;
      await patch<Project>(`/projects/${id}`, body);
      router.push(`/projects/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to update project');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProject() {
    setDeleteError('');
    setIsDeleting(true);
    try {
      await del(`/projects/${id}`);
      router.push('/projects');
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setDeleteError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to delete project');
      } else {
        setDeleteError('Failed to delete project');
      }
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-10 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-24 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/projects/${id}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to project
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Project Settings
        </h1>
      </div>

      {/* Edit Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          General Information
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveChanges} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Project Name
            </label>
            <input
              id="name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="What is this project about?"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
            <Link
              href={`/projects/${id}`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Delete Section */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
        <h2 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
          Danger Zone
        </h2>
        <p className="mb-4 text-sm text-red-700 dark:text-red-400">
          Once you delete a project, there is no going back. Please be certain.
        </p>

        <button
          type="button"
          onClick={() => setIsDeleteConfirmOpen(true)}
          className="rounded-lg border border-red-200 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:border-red-900 dark:hover:bg-red-700"
        >
          Delete Project
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <div
        className={`fixed inset-0 z-30 bg-zinc-950/60 transition-opacity duration-200 ${
          isDeleteConfirmOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)}
        aria-hidden="true"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        className={`fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/20 transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 ${
          isDeleteConfirmOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
        }`}
      >
        <div className="px-6 py-5">
          <h2 id="delete-confirm-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Delete "{name}"?
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This action cannot be undone. The project, all test cases, test runs, and associated data will be permanently deleted.
          </p>

          {deleteError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {deleteError}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeleting}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="rounded-lg border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-700"
            >
              {isDeleting ? 'Deleting…' : 'Delete Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
