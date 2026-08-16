'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, get, patch } from '@/lib/api';
import { useOrganization } from '@/lib/organization-context';
import type { Organization } from '@/lib/types';

export default function OrganizationSettingsPage() {
  const {
    currentOrganization,
    currentOrganizationId,
    loading: organizationsLoading,
    refreshOrganizations,
  } = useOrganization();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name);
      setError('');
      setNotice('');
    }
  }, [currentOrganization]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganizationId) return;

    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      await patch<Organization>(`/organizations/${currentOrganizationId}`, {
        name,
      });
      await refreshOrganizations();
      setNotice('Organization updated successfully');
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to update organization');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (organizationsLoading) {
    return <div className="h-10 w-72 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />;
  }

  if (!currentOrganizationId || !currentOrganization) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No organization selected.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Organization Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Update your organization profile and manage access from one place.
        </p>
      </div>

      <div className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <dl className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          <div className="flex items-center justify-between gap-3">
            <dt>Organization ID</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">#{currentOrganization.id}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Your role</dt>
            <dd className="font-medium uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
              {currentOrganization.membership.role.replace('_', ' ')}
            </dd>
          </div>
        </dl>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Organization Name
          </label>
          <input
            id="name"
            type="text"
            minLength={2}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/organizations/members"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Manage Members
          </Link>
        </div>
      </form>
    </div>
  );
}
