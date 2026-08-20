'use client';

import {
    getAnalyticsSummary,
    getPayoutHistory,
    getTransactions,
    getTimeseries,
    getMoneyFlow,
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

export function useTimeseries(
  tenant: string | undefined,
  // outletId scopes the series to one branch (OutletFilter dropdown); undefined/"" means "all
  // outlets". Included in the query key so switching outlets refetches instead of showing a
  // stale cached response for the previously selected outlet.
  params: { from: string; to: string; outletId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ['analytics-timeseries', tenant, params.from, params.to, params.outletId ?? ''],
    queryFn: () => getTimeseries(tenant!, { from: params.from, to: params.to, outlet_id: params.outletId }),
    enabled: enabled && !!tenant,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMoneyFlow(tenant: string | undefined, params: { from: string; to: string }, enabled = true) {
  return useQuery({
    queryKey: ['analytics-money-flow', tenant, params.from, params.to],
    queryFn: () => getMoneyFlow(tenant!, params),
    enabled: enabled && !!tenant,
    staleTime: 2 * 60 * 1000,
  });
}
