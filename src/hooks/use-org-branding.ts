'use client';

import { fetchTenantBySlug, type TenantBrand } from '@/lib/api/tenant';
import { useQuery } from '@tanstack/react-query';

/**
 * Returns tenant branding (name, orgName, logoUrl, colors) fetched from auth-api.
 * Data is cached for 10 minutes — same order of magnitude as JWT TTL.
 */
export function useOrgBranding(slug: string) {
  return useQuery<TenantBrand | null>({
    queryKey: ['tenant-brand', slug],
    queryFn: () => fetchTenantBySlug(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
