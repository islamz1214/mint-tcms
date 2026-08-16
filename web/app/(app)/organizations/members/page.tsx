'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiError, del, get, patch, post } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useOrganization } from '@/lib/organization-context';
import type {
  OrganizationInvitation,
  OrganizationMember,
  OrganizationMemberRole,
} from '@/lib/types';

const roleOptions: OrganizationMemberRole[] = ['admin', 'test_manager', 'tester', 'viewer'];

export default function OrganizationMembersPage() {
  const { user } = useAuth();
  const { currentOrganization, currentOrganizationId, loading: organizationsLoading } = useOrganization();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationMemberRole>('tester');
  const [loading, setLoading] = useState(true);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const currentMembership = useMemo(
    () => members.find((member) => member.userId === user?.id) ?? null,
    [members, user?.id],
  );
  const canManage = currentMembership?.role === 'admin';

  useEffect(() => {
    if (!currentOrganizationId) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    Promise.all([
      get<OrganizationMember[]>(`/organizations/${currentOrganizationId}/members`),
      get<OrganizationInvitation[]>(`/organizations/${currentOrganizationId}/invitations`),
    ])
      .then(([membersData, invitationsData]) => {
        setMembers(membersData);
        setInvitations(invitationsData);
      })
      .catch(() => {
        setError('Failed to load organization members');
      })
      .finally(() => setLoading(false));
  }, [currentOrganizationId]);

  async function refreshMembersData() {
    if (!currentOrganizationId) return;
    const [membersData, invitationsData] = await Promise.all([
      get<OrganizationMember[]>(`/organizations/${currentOrganizationId}/members`),
      get<OrganizationInvitation[]>(`/organizations/${currentOrganizationId}/invitations`),
    ]);
    setMembers(membersData);
    setInvitations(invitationsData);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganizationId) return;

    setError('');
    setNotice('');
    setSubmittingInvite(true);
    try {
      await post<OrganizationInvitation>(`/organizations/${currentOrganizationId}/invitations`, {
        email,
        role: inviteRole,
      });
      setEmail('');
      setInviteRole('tester');
      await refreshMembersData();
      setNotice('Invitation created');
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to invite member');
      } else {
        setError('Something went wrong while inviting');
      }
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleRoleChange(member: OrganizationMember, role: OrganizationMemberRole) {
    if (!currentOrganizationId) return;
    setError('');
    setNotice('');

    try {
      const updated = await patch<OrganizationMember>(
        `/organizations/${currentOrganizationId}/members/${member.id}`,
        { role },
      );
      setMembers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(`Updated ${member.user.email} to ${role.replace('_', ' ')}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to update role');
      } else {
        setError('Something went wrong while updating role');
      }
    }
  }

  async function handleRemoveMember(member: OrganizationMember) {
    if (!currentOrganizationId) return;
    if (!confirm(`Remove ${member.user.email} from organization?`)) return;

    setError('');
    setNotice('');

    try {
      await del(`/organizations/${currentOrganizationId}/members/${member.id}`);
      setMembers((prev) => prev.filter((item) => item.id !== member.id));
      setNotice(`Removed ${member.user.email}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to remove member');
      } else {
        setError('Something went wrong while removing member');
      }
    }
  }

  async function handleRevokeInvitation(invitation: OrganizationInvitation) {
    if (!currentOrganizationId) return;

    setError('');
    setNotice('');
    try {
      const updated = await del<OrganizationInvitation>(
        `/organizations/${currentOrganizationId}/invitations/${invitation.id}`,
      );
      setInvitations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(`Revoked invitation for ${invitation.email}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.body?.message;
        setError(Array.isArray(msg) ? msg.join(', ') : (msg as string) || 'Failed to revoke invitation');
      } else {
        setError('Something went wrong while revoking invitation');
      }
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Members and Invitations
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {currentOrganization.name}
          </p>
        </div>
        <Link
          href="/organizations/settings"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Organization Settings
        </Link>
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

      <section className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Invite Member</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Add collaborators by email and assign their default role.
        </p>

        <form onSubmit={handleInvite} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="email"
            required
            disabled={!canManage}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <select
            disabled={!canManage}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as OrganizationMemberRole)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!canManage || submittingInvite}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submittingInvite ? 'Sending...' : 'Send Invite'}
          </button>
        </form>

        {!canManage && (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Only organization admins can change membership and invitations.
          </p>
        )}
      </section>

      <section className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Members</h2>
        {loading ? (
          <div className="mt-3 h-10 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        ) : members.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No members found.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {members.map((member) => {
              const isSelf = member.userId === user?.id;
              return (
                <div
                  key={member.id}
                  className="grid grid-cols-1 items-center gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_auto_auto] dark:border-zinc-700"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{member.user.name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{member.user.email}</p>
                  </div>
                  <select
                    aria-label={`Role for ${member.user.email}`}
                    value={member.role}
                    disabled={!canManage || isSelf}
                    onChange={(e) => handleRoleChange(member, e.target.value as OrganizationMemberRole)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveMember(member)}
                    disabled={!canManage || isSelf}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mint-card mint-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Invitations</h2>
        {loading ? (
          <div className="mt-3 h-10 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        ) : invitations.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No invitations yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="grid grid-cols-1 items-center gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_auto_auto] dark:border-zinc-700"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{invitation.email}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Role: {invitation.role.replace('_', ' ')} · Status: {invitation.status}
                  </p>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(invitation.createdAt).toLocaleString()}
                </p>
                <button
                  onClick={() => handleRevokeInvitation(invitation)}
                  disabled={!canManage || invitation.status !== 'pending'}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
