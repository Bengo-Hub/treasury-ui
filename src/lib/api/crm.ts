'use client';

import { useAuthStore } from '@/store/auth';
import { paginateAll, type Page } from './paginate';

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
  // Catch-all bag for details that have no dedicated marketflow Contact column (company,
  // address, country, contact_person, kra_pin, notes) — see CreateClientModal. Keeping these
  // in metadata avoids a marketflow-api schema migration.
  metadata?: Record<string, unknown> | null;
}

/**
 * Search CRM contacts via the local Next.js proxy route.
 * The proxy forwards the Bearer token + X-Tenant-ID to marketflow-api server-side.
 */
export async function searchCRMContacts(
  tenantId: string,
  query: string,
  limit = 20,
  offset = 0,
): Promise<CRMContact[]> {
  const page = await fetchCRMContactsPage(tenantId, query, limit, offset);
  return page.data;
}

async function fetchCRMContactsPage(
  tenantId: string,
  query: string,
  limit: number,
  offset: number,
): Promise<Page<CRMContact>> {
  const token = useAuthStore.getState().session?.accessToken;
  const marketflowTenantId = resolveMarketflowTenantId(tenantId);
  if (!token || !marketflowTenantId) return { data: [], total: 0, hasMore: false };

  const url = new URL('/api/crm/contacts', window.location.origin);
  url.searchParams.set('tenant_id', marketflowTenantId);
  if (query) url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  if (offset > 0) url.searchParams.set('offset', String(offset));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return { data: [], total: 0, hasMore: false };
    const body = await res.json();
    // Same shared `pagination.NewResponse` envelope the treasury API uses: { data, total, hasMore }.
    const data = Array.isArray(body?.data) ? body.data : [];
    const total = Number(body?.total ?? data.length) || data.length;
    return { data, total, hasMore: body?.hasMore ?? false };
  } catch {
    return { data: [], total: 0, hasMore: false };
  }
}

/**
 * List the tenant's ENTIRE CRM customer directory by paging through marketflow via the SAME
 * centralized `paginateAll` helper the treasury AR balances use (marketflow speaks the identical
 * shared pagination envelope). This is what makes the treasury Customers page show ALL of a
 * tenant's customers — the same directory POS resolves a customer against when selling — not
 * just the first page. Beyond the paginateAll page cap, server-side search (searchCRMContacts
 * with a query) still finds any customer.
 */
export async function listAllCRMContacts(tenantId: string): Promise<CRMContact[]> {
  return paginateAll<CRMContact>((limit, offset) => fetchCRMContactsPage(tenantId, '', limit, offset));
}

export interface CreateCRMContactInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  // Fields marketflow's Contact schema has no dedicated column for — persisted as-is on
  // Contact.metadata (JSON). See CreateClientModal for the field set.
  metadata?: Record<string, unknown>;
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
