'use client';

import {
    getAnalyticsSummary,
    getPayoutHistory,
    getTransactions,
    type TransactionsParams,
} from '@/lib/api/analytics';
import { useQuery } from '@tanstack/react-query';

const STALE_MS = 2 * 60 * 1000; // 2 min

export const analyticsKeys = {
  summary: (tenantIdOrSlug: string, params?: { from?: string; to?: string }) =>
    ['analytics', 'summary', tenantIdOrSlug, params] as const,
  transactions: (tenantIdOrSlug: string, params?: TransactionsParams) =>
    ['analytics', 'transactions', tenantIdOrSlug, params] as const,
  payouts: (tenantIdOrSlug: string) => ['analytics', 'payouts', tenantIdOrSlug] as const,
};

/** Tenant analytics summary (revenue, succeeded/pending/failed counts). */
export function useAnalyticsSummary(
  tenantIdOrSlug: string | undefined,
  params?: { from?: string; to?: string },
  enabled = true
) {
  return useQuery({
    queryKey: analyticsKeys.summary(tenantIdOrSlug ?? '', params),
    queryFn: () => getAnalyticsSummary(tenantIdOrSlug!, params),
    enabled: !!tenantIdOrSlug && enabled,
    staleTime: STALE_MS,
  });
}

/** Paginated transactions with filters. */
export function useTransactions(
  tenantIdOrSlug: string | undefined,
  params?: TransactionsParams,
  enabled = true
) {
  return useQuery({
    queryKey: analyticsKeys.transactions(tenantIdOrSlug ?? '', params),
    queryFn: () => getTransactions(tenantIdOrSlug!, params),
    enabled: !!tenantIdOrSlug && enabled,
    staleTime: STALE_MS,
  });
}

/** Payout/settlement history for the tenant. */
export function usePayoutHistory(tenantIdOrSlug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.payouts(tenantIdOrSlug ?? ''),
    queryFn: () => getPayoutHistory(tenantIdOrSlug!),
    enabled: !!tenantIdOrSlug && enabled,
    staleTime: STALE_MS,
  });
}
