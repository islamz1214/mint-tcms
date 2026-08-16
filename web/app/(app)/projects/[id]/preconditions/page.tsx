'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, del, get, patch, post } from '@/lib/api';
import type {
  CreatePreconditionDto,
  Precondition,
  Project,
  UpdatePreconditionDto,
} from '@/lib/types';

export default function PreconditionsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Precondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      get<Project>(`/projects/${projectId}`),
      get<Precondition[]>(`/projects/${projectId}/preconditions`),
    ])
      .then(([projectData, preconditions]) => {
        setProject(projectData);
        setItems(preconditions);
      })
      .catch(() => router.push(`/projects/${projectId}`))
      .finally(() => setLoading(false));
  }, [projectId, router]);

  function resetForm() {
    setName('');
    setContent('');
    setEditingId(null);
  }

  function startEdit(item: Precondition) {
    setEditingId(item.id);
    setName(item.name);
    setContent(item.content);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingId) {
        const payload: UpdatePreconditionDto = {
          name,
          content,
        };
        const updated = await patch<Precondition>(
          `/projects/${projectId}/preconditions/${editingId}`,
          payload,
        );
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const payload: CreatePreconditionDto = {
          name,
          content,
        };
        const created = await post<Precondition>(`/projects/${projectId}/preconditions`, payload);
        setItems((prev) => [...prev, created].sort((a, b) => a.key.localeCompare(b.key)));
      }

      resetForm();
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to save precondition');
      } else {
        setError('Failed to save precondition');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: Precondition) {
    if (!confirm('Delete this precondition? Linked test cases will keep their custom precondition text only.')) {
      return;
    }

    try {
      await del(`/projects/${projectId}/preconditions/${item.id}`);
      setItems((prev) => prev.filter((value) => value.id !== item.id));
      if (editingId === item.id) {
        resetForm();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to delete precondition');
      } else {
        setError('Failed to delete precondition');
      }
    }
  }

  if (loading || !project) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-56 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-44 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Precondition Library</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Reusable setup blocks for {project.name}. Link them in test cases instead of copy/paste.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {editingId ? 'Edit precondition' : 'New precondition'}
        </h2>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Name
          </label>
          <input
            id="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="User is in a project"
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Steps / setup
          </label>
          <textarea
            id="content"
            rows={4}
            required
            minLength={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"1. User is logged in\n2. User has organization access\n3. User selects a project"}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Create precondition'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No reusable preconditions yet.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{item.content}</pre>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
