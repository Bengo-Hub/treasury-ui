'use client';

import { searchCRMContacts, listAllCRMContacts, type CRMContact } from '@/lib/api/crm';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * Debounced CRM contact hook backing the treasury Customers directory.
 *
 * Empty query → loads the tenant's ENTIRE customer directory (paged through marketflow) so the
 * Customers page lists ALL of a tenant's CRM customers, the same set POS resolves against when
 * selling. A 2+ char query → server-side search across the whole book (limit 100) so any
 * customer is findable even in a directory too large to fully preload. 300 ms debounce.
 */
export function useCRMContacts(tenantId: string, rawQuery: string) {
  const [query, setQuery] = useState(rawQuery);

  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  return useQuery<CRMContact[]>({
    queryKey: ['crm-contacts', tenantId, query],
    queryFn:  () => (query ? searchCRMContacts(tenantId, query, 100) : listAllCRMContacts(tenantId)),
    // List all contacts when the query is empty (default) and search when 2+ chars are typed;
    // skip the single-char in-between state.
    enabled:  !!tenantId && query.length !== 1,
    staleTime: 60_000,
    placeholderData: [],
  });
}
