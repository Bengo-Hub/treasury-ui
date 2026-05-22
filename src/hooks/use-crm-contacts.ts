'use client';

import { searchCRMContacts, type CRMContact } from '@/lib/api/crm';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * Debounced CRM contact search hook.
 * Returns contacts matching the query, with a 300 ms debounce to avoid hammering the API.
 */
export function useCRMContacts(tenantId: string, rawQuery: string) {
  const [query, setQuery] = useState(rawQuery);

  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  return useQuery<CRMContact[]>({
    queryKey: ['crm-contacts', tenantId, query],
    queryFn:  () => searchCRMContacts(tenantId, query),
    enabled:  !!tenantId && query.length >= 2,
    staleTime: 60_000,
    placeholderData: [],
  });
}
