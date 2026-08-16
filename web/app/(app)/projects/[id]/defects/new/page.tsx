'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, post } from '@/lib/api';
import type { Defect } from '@/lib/types';

export default function NewDefectPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [sourceType, setSourceType] = useState<'internal' | 'external'>('internal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('open');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [environment, setEnvironment] = useState('');
  const [component, setComponent] = useState('');
  const [externalKey, setExternalKey] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const defect = await post<Defect>(`/projects/${projectId}/defects`, {
        title,
        sourceType,
        ...(sourceType === 'internal'
          ? {
              description: description || undefined,
              severity,
              priority,
              status,
              expectedResult: expectedResult || undefined,
              actualResult: actualResult || undefined,
              environment: environment || undefined,
              component: component || undefined,
            }
          : {
              externalKey: externalKey || undefined,
              externalUrl: externalUrl || undefined,
              severity: 'medium',
              priority: 'medium',
              status: 'open',
            }),
      });
      router.push(`/projects/${projectId}/defects/${defect.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to create defect.');
      } else {
        setError('Failed to create defect.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}/defects`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to defects
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">New Defect</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        {/* Source type toggle */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Source</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSourceType('internal')}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                sourceType === 'internal'
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                  : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              Internal
            </button>
            <button
              type="button"
              onClick={() => setSourceType('external')}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                sourceType === 'external'
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                  : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              External (Jira / GitHub / Linear)
            </button>
          </div>
          {sourceType === 'external' && (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Link to an issue in your tracker. Mint stores the reference; the lifecycle is managed externally.
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder={
              sourceType === 'external'
                ? 'Login button throws 500 on invalid credentials'
                : 'Short description of the defect'
            }
          />
        </div>

        {sourceType === 'external' ? (
          <>
            <div>
              <label htmlFor="externalKey" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Issue key <span className="text-zinc-400 font-normal">(e.g. PROJ-123)</span>
              </label>
              <input
                id="externalKey"
                value={externalKey}
                onChange={(e) => setExternalKey(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="PROJ-123"
              />
            </div>
            <div>
              <label htmlFor="externalUrl" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Issue URL
              </label>
              <input
                id="externalUrl"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="https://yourorg.atlassian.net/browse/PROJ-123"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="Steps to reproduce, environment, etc."
              />
            </div>

            <div>
              <label htmlFor="expectedResult" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Expected result
              </label>
              <textarea
                id="expectedResult"
                rows={2}
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="What should have happened"
              />
            </div>

            <div>
              <label htmlFor="actualResult" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Actual result
              </label>
              <textarea
                id="actualResult"
                rows={2}
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="What actually happened"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="severity" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Severity
                </label>
                <select
                  id="severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label htmlFor="priority" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label htmlFor="component" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Component
                </label>
                <input
                  id="component"
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. Login, Checkout"
                />
              </div>
            </div>

            <div>
              <label htmlFor="environment" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Environment
              </label>
              <input
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="e.g. Chrome 126 / macOS, Staging, iOS 17"
              />
            </div>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? 'Creating...' : 'Create Defect'}
          </button>
          <Link
            href={`/projects/${projectId}/defects`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
