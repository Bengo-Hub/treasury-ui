'use client';

import { useAuthStore } from '@/store/auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a treasury tenant identifier (slug OR UUID) to the tenant UUID that
 * marketflow-api expects in its `X-Tenant-ID` header.
 *
 * treasury pages resolve their "effective tenant" to a *slug* for the platform
 * owner's own books (`codevertex`) and for regular tenants (their orgSlug), but
 * only to a UUID when a platform owner drills into another tenant. marketflow —
 * like treasury, synced from auth-api — keys contacts by tenant UUID and rejects
 * a slug with `invalid_tenant`. Both services share the same auth-api tenant IDs,
 * so the current user's `tenantId` is the authoritative UUID for their own slug.
 *
 * - already a UUID → pass through (platform owner viewing a specific tenant).
 * - slug matching the signed-in user → their `tenantId` UUID (own / regular tenant).
 * - anything else → returned unchanged so the call fails loudly rather than
 *   silently targeting the wrong tenant.
 */
export function resolveMarketflowTenantId(tenantId: string): string {
  if (!tenantId) return '';
  if (UUID_REGEX.test(tenantId)) return tenantId;
  const user = useAuthStore.getState().user;
  if (user?.tenantSlug === tenantId && UUID_REGEX.test(user.tenantId ?? '')) {
    return user.tenantId;
  }
  return tenantId;
}

export interface CRMContact {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_type?: string;
}

/**
 * Search CRM contacts via the local Next.js proxy route.
 * The proxy forwards the Bearer token + X-Tenant-ID to marketflow-api server-side.
 */
export async function searchCRMContacts(
  tenantId: string,
  query: string,
  limit = 20,
): Promise<CRMContact[]> {
  const token = useAuthStore.getState().session?.accessToken;
  const marketflowTenantId = resolveMarketflowTenantId(tenantId);
  if (!token || !marketflowTenantId) return [];

  const url = new URL('/api/crm/contacts', window.location.origin);
  url.searchParams.set('tenant_id', marketflowTenantId);
  if (query) url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

export interface CreateCRMContactInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

/**
 * Create a CRM contact (customer) in marketflow via the local Next.js proxy route.
 * marketflow is the customer source of truth; the proxy forwards the Bearer token + X-Tenant-ID.
 */
export async function createCRMContact(tenantId: string, input: CreateCRMContactInput): Promise<CRMContact | null> {
  const token = useAuthStore.getState().session?.accessToken;
  const marketflowTenantId = resolveMarketflowTenantId(tenantId);
  if (!token || !marketflowTenantId) return null;

  const url = new URL('/api/crm/contacts', window.location.origin);
  url.searchParams.set('tenant_id', marketflowTenantId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...input, contact_type: 'customer' }),
  });
  if (!res.ok) throw new Error(`create contact failed: ${res.status}`);
  const data = await res.json();
  // marketflow returns the created contact (possibly wrapped in { data }).
  return (data?.data ?? data) as CRMContact;
}

export function crmContactDisplayName(c: CRMContact): string {
  const parts = [c.first_name, c.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : (c.email ?? c.id);
}
