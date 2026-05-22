'use client';

import { useAuthStore } from '@/store/auth';

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
  if (!token || !tenantId) return [];

  const url = new URL('/api/crm/contacts', window.location.origin);
  url.searchParams.set('tenant_id', tenantId);
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

export function crmContactDisplayName(c: CRMContact): string {
  const parts = [c.first_name, c.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : (c.email ?? c.id);
}
