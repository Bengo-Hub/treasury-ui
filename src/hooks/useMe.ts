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

async function fetchMe(): Promise<MeResponse> {
  const token = useAuthStore.getState().session?.accessToken;
  if (!token) throw new Error('No session');
  const res = await fetch(SSO_ME_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || `Me failed: ${res.status}`);
  }
  const data = await res.json();
  const roles: string[] = Array.isArray(data.roles) ? data.roles : [];
  const slug = data.tenant_slug ?? data.tenant?.slug ?? '';
  return {
    ...data,
    roles,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
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
