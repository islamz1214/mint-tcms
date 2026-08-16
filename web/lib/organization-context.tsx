'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { get } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Organization } from '@/lib/types';

const ACTIVE_ORGANIZATION_STORAGE_KEY = 'activeOrganizationId';

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentOrganizationId: number | null;
  loading: boolean;
  setCurrentOrganizationId: (organizationId: number) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const setCurrentOrganizationId = useCallback(
    (organizationId: number) => {
      setCurrentOrganizationIdState(organizationId);
      localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, String(organizationId));
    },
    [],
  );

  const refreshOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganizationIdState(null);
      setLoading(false);
      return;
    }

    const orgs = await get<Organization[]>('/organizations');
    setOrganizations(orgs);

    const stored = localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
    const storedId = stored ? Number(stored) : null;
    const hasStored = storedId !== null && orgs.some((item) => item.id === storedId);
    const nextId = hasStored ? storedId : (orgs[0]?.id ?? null);
    setCurrentOrganizationIdState(nextId);
    if (nextId === null) {
      localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
    } else {
      localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, String(nextId));
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    setLoading(true);
    refreshOrganizations()
      .catch(() => {
        setOrganizations([]);
        setCurrentOrganizationIdState(null);
      })
      .finally(() => setLoading(false));
  }, [authLoading, refreshOrganizations]);

  const currentOrganization = useMemo(
    () => organizations.find((item) => item.id === currentOrganizationId) ?? null,
    [organizations, currentOrganizationId],
  );

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        currentOrganizationId,
        loading,
        setCurrentOrganizationId,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider');
  return ctx;
}
