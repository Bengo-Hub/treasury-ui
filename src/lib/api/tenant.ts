/**
 * Tenant API (auth-api). Used for tenant-by-slug lookup and platform admin listing.
 * Auth-api: GET /api/v1/tenants/by-slug/{slug} (public).
 * Auth-api: GET /api/v1/admin/tenants (platform admin, JWT required).
 */

import { useAuthStore } from '@/store/auth';

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  process.env.NEXT_PUBLIC_SSO_URL ||
  'https://sso.codevertexitsolutions.com';

export interface TenantBrandMetadata {
  logo_url?: string;
  logoUrl?: string;
  primary_color?: string;
  primaryColor?: string;
  secondary_color?: string;
  secondaryColor?: string;
  org_name?: string;
  orgName?: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface TenantBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  orgName: string;
}

export function parseBrandFromTenant(t: TenantResponse): TenantBrand {
  const meta = (t.metadata || {}) as TenantBrandMetadata;
  const logoUrl = meta.logo_url ?? meta.logoUrl ?? null;
  const primaryColor = (meta.primary_color ?? meta.primaryColor) ?? null;
  const secondaryColor = (meta.secondary_color ?? meta.secondaryColor) ?? null;
  const orgName = (meta.org_name ?? meta.orgName) ?? t.name ?? '';

  return {
    id: t.id,
    name: t.name ?? '',
    slug: t.slug ?? '',
    logoUrl: typeof logoUrl === 'string' ? logoUrl : null,
    primaryColor: typeof primaryColor === 'string' ? primaryColor : null,
    secondaryColor: typeof secondaryColor === 'string' ? secondaryColor : null,
    orgName: typeof orgName === 'string' ? orgName : (t.name ?? ''),
  };
}

/**
 * List all active tenants (platform admin only).
 * Calls auth-api GET /api/v1/admin/tenants with the current JWT.
 */
export async function listPlatformTenants(search?: string): Promise<TenantResponse[]> {
  const token = useAuthStore.getState().session?.accessToken;
  if (!token) return [];
  const url = new URL(`${AUTH_API_URL}/api/v1/admin/tenants`);
  if (search) url.searchParams.set('search', search);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // auth-api returns an array directly
    return Array.isArray(data) ? data : (data.tenants ?? []);
  } catch {
    return [];
  }
}

export async function fetchTenantBySlug(slug: string): Promise<TenantBrand | null> {
  if (!slug) return null;
  const url = `${AUTH_API_URL}/api/v1/tenants/by-slug/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TenantResponse;
    return parseBrandFromTenant(data);
  } catch {
    return null;
  }
}
