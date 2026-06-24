'use client';

import {
  getAPSummary,
  getVendorBalances,
  getVendorStatement,
  getCustomerStatement,
  type StatementRange,
} from '@/lib/api/arpa';
import { useQuery } from '@tanstack/react-query';

const STALE_MS = 2 * 60 * 1000;

export const arpaKeys = {
  apSummary: (tenant: string) => ['arpa', 'ap-summary', tenant] as const,
  vendorBalances: (tenant: string) => ['arpa', 'vendor-balances', tenant] as const,
  vendorStatement: (tenant: string, vendorId: string, range?: StatementRange) =>
    ['arpa', 'vendor-statement', tenant, vendorId, range] as const,
  customerStatement: (tenant: string, contactId: string, range?: StatementRange) =>
    ['arpa', 'customer-statement', tenant, contactId, range] as const,
};

export function useAPSummary(tenant: string | undefined, enabled = true) {
  return useQuery({
    queryKey: arpaKeys.apSummary(tenant ?? ''),
    queryFn: () => getAPSummary(tenant!),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorBalances(tenant: string | undefined, enabled = true) {
  return useQuery({
    queryKey: arpaKeys.vendorBalances(tenant ?? ''),
    queryFn: () => getVendorBalances(tenant!),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useVendorStatement(
  tenant: string | undefined,
  vendorId: string | undefined,
  range?: StatementRange,
  enabled = true,
) {
  return useQuery({
    queryKey: arpaKeys.vendorStatement(tenant ?? '', vendorId ?? '', range),
    queryFn: () => getVendorStatement(tenant!, vendorId!, range),
    enabled: !!tenant && !!vendorId && enabled,
    staleTime: STALE_MS,
  });
}

export function useCustomerStatement(
  tenant: string | undefined,
  contactId: string | undefined,
  range?: StatementRange,
  enabled = true,
) {
  return useQuery({
    queryKey: arpaKeys.customerStatement(tenant ?? '', contactId ?? '', range),
    queryFn: () => getCustomerStatement(tenant!, contactId!, range),
    enabled: !!tenant && !!contactId && enabled,
    staleTime: STALE_MS,
  });
}
