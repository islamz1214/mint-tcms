'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, post } from '@/lib/api';
import type { CreateRequirementDto, Requirement, RequirementPriority, RequirementStatus } from '@/lib/types';

export default function NewRequirementPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RequirementStatus>('draft');
  const [priority, setPriority] = useState<RequirementPriority>('medium');
  const [externalSystem, setExternalSystem] = useState('');
  const [externalId, setExternalId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload: CreateRequirementDto = {
      title,
      status,
      priority,
      description: description || undefined,
      key: key || undefined,
      externalSystem: externalSystem || undefined,
      externalId: externalId || undefined,
      externalUrl: externalUrl || undefined,
    };

    try {
      const created = await post<Requirement>(`/projects/${projectId}/requirements`, payload);
      router.push(`/projects/${projectId}/requirements/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.body?.message;
        setError(Array.isArray(message) ? message.join(', ') : (message as string) || 'Failed to create requirement');
      } else {
        setError('Failed to create requirement');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href={`/projects/${projectId}/requirements`} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← Back to requirements
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">New Requirement</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="key" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Key (optional)</label>
          <input
            id="key"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="REQ-123"
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
          <input
            id="title"
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as RequirementStatus)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Priority</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as RequirementPriority)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="external-system" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">External System</label>
            <input
              id="external-system"
              value={externalSystem}
              onChange={(e) => setExternalSystem(e.target.value)}
              placeholder="jira"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="external-id" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">External ID</label>
            <input
              id="external-id"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="PROJ-123"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="external-url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">External URL</label>
            <input
              id="external-url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting ? 'Creating...' : 'Create Requirement'}
        </button>
      </form>
    </div>
  );
}
