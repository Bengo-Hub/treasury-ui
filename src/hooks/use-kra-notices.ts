'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as taxApi from '@/lib/api/tax';
import { useTaxProfile } from '@/hooks/use-tax';
import {
  NOTICE_CACHE_MS,
  activeNotices,
  parseNotices,
  readNoticeCache,
  writeNoticeCache,
  type KraNotice,
} from '@/lib/kra-notices';

/**
 * The tenant's current KRA notices for the dashboard banner, newest first, expired ones removed.
 * The list is cached in the browser for a week and fetched from KRA again only once that cache has
 * expired, so a login never waits on KRA and KRA is not called on every page view. Expiry is applied
 * when the list is read, so a notice drops off on its own date without a refetch. Off when the
 * business has switched eTIMS off; a failed fetch just shows nothing.
 */
export function useKraNotices(tenant: string): KraNotice[] {
  const { data: profile } = useTaxProfile(tenant);
  const etimsOn = !!profile && profile.metadata?.etims_enabled !== false;

  const { data } = useQuery({
    queryKey: ['kra-notices', tenant],
    // The browser copy is read here, not as initialData, so the server render and the first client
    // render agree (both empty) and the banner appears right after hydration without a network call.
    queryFn: async () => {
      const cached = readNoticeCache(tenant);
      if (cached) return cached.notices;
      const notices = parseNotices(await taxApi.getEtimsNoticeList(tenant));
      writeNoticeCache(tenant, notices);
      return notices;
    },
    enabled: !!tenant && etimsOn,
    staleTime: NOTICE_CACHE_MS,
    gcTime: NOTICE_CACHE_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  return useMemo(() => activeNotices(data ?? []), [data]);
}
