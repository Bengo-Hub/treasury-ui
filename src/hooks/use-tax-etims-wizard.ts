// React Query hooks for the KRA certification-wizard-only endpoints: the 4 test cases that had
// no individually-triggerable route until this was closed, plus the read-only verification
// endpoints the wizard reuses to confirm a "manual" step actually reached KRA. Split out from
// use-tax.ts / use-tax-etims-branch.ts (both already large) per this project's file-length
// convention. Mirrors the existing lazy-fetch-on-demand useQuery pattern (enabled starts false,
// the caller triggers refetch()) used by kra-branch-tools-tab.tsx's LookupCard.

import * as taxApi from '@/lib/api/tax';
import { useQuery } from '@tanstack/react-query';

export function useEtimsCustomerPinInfo(tenantSlug: string, tin: string) {
  return useQuery({
    queryKey: ['etims-customer-pin-info', tenantSlug, tin],
    queryFn: () => taxApi.getEtimsCustomerPinInfo(tenantSlug, tin),
    enabled: false,
  });
}

export function useEtimsItemClassList(tenantSlug: string) {
  return useQuery({
    queryKey: ['etims-item-class-list', tenantSlug],
    queryFn: () => taxApi.getEtimsItemClassList(tenantSlug),
    enabled: false,
  });
}

export function useEtimsItemInfo(tenantSlug: string) {
  return useQuery({
    queryKey: ['etims-item-info', tenantSlug],
    queryFn: () => taxApi.getEtimsItemInfo(tenantSlug),
    enabled: false,
  });
}

export function useEtimsStockMoveList(tenantSlug: string) {
  return useQuery({
    queryKey: ['etims-stock-move-list', tenantSlug],
    queryFn: () => taxApi.getEtimsStockMoveList(tenantSlug),
    enabled: false,
  });
}

export function useEtimsSalesTransactionsCheck(tenantSlug: string) {
  return useQuery({
    queryKey: ['etims-sales-transactions-check', tenantSlug],
    queryFn: () => taxApi.getEtimsSalesTransactions(tenantSlug),
    enabled: false,
  });
}
