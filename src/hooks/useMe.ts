'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { SSO_ME_URL } from '@/lib/auth/api';

/** Auth-api GET /me response: user profile with roles and permissions (source of truth for RBAC). */
export interface MeResponse {
  id: string;
  email?: string;
  fullName?: string;
  organizationId?: string;
  roles: string[];
  permissions: string[];
  isPlatformOwner: boolean;
  isSuperUser: boolean;
  tenantSlug?: string;
  tenantId?: string;
  [key: string]: unknown;
}

const ME_QUERY_KEY = ['auth', 'me'] as const;
const ME_STALE_MS = 5 * 60 * 1000; // 5 min TTL

const TREASURY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://booksapi.codevertexitsolutions.com';

/** Merge arrays, deduplicating values. */
function mergeUnique(a: string[], b: string[]): string[] {
  const set = new Set(a);
  for (const v of b) set.add(v);
  return Array.from(set);
}

/**
 * Fetch service-level roles/permissions from treasury-api GET /api/v1/auth/me.
 * Returns null on any error (non-blocking — SSO profile is the primary source).
 */
async function fetchServiceMe(token: string): Promise<{ roles: string[]; permissions: string[] } | null> {
  try {
    const res = await fetch(`${TREASURY_API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      roles: Array.isArray(data.roles) ? data.roles : [],
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
    };
  } catch {
    return null;
  }
}

async function fetchMe(): Promise<MeResponse> {
  const token = useAuthStore.getState().session?.accessToken;
  if (!token) throw new Error('No session');

  // Fetch SSO profile (primary) and treasury-api service-level RBAC in parallel
  const [ssoRes, serviceData] = await Promise.all([
    fetch(SSO_ME_URL, { headers: { Authorization: `Bearer ${token}` } }),
    fetchServiceMe(token),
  ]);

  if (!ssoRes.ok) {
    const err = await ssoRes.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || `Me failed: ${ssoRes.status}`);
  }
  const data = await ssoRes.json();
  let roles: string[] = Array.isArray(data.roles) ? data.roles : [];
  let permissions: string[] = Array.isArray(data.permissions) ? data.permissions : [];
  const slug = data.tenant_slug ?? data.tenant?.slug ?? '';

  // Merge service-level roles/permissions from treasury-api
  if (serviceData) {
    roles = mergeUnique(roles, serviceData.roles);
    permissions = mergeUnique(permissions, serviceData.permissions);
  }

  return {
    ...data,
    roles,
    permissions,
    isPlatformOwner: data.is_platform_owner === true || slug === 'codevertex',
    isSuperUser: roles.includes('superuser'),
    tenantSlug: slug,
    tenantId: data.tenant_id ?? data.primary_tenant ?? '',
  };
}

/** Load current user and RBAC (roles/permissions) from auth-api GET /me with TanStack Query and TTL. */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled,
    staleTime: ME_STALE_MS,
    gcTime: ME_STALE_MS * 2,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useHasRole(role: string): boolean {
  const { data } = useMe();
  return data?.roles?.includes(role) ?? false;
}

export function useHasPermission(permission: string): boolean {
  const { data } = useMe();
  return data?.permissions?.includes(permission) ?? false;
}

export function useIsSuperAdmin(): boolean {
  return useHasRole('superuser');
}

export function useIsPlatformOwner(): boolean {
  const { data } = useMe();
  return data?.isPlatformOwner ?? false;
}
