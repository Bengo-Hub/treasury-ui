'use client';

import {
  getAPSummary,
  getVendorBalances,
  getVendorStatement,
  getCustomerStatement,
  setCustomerOpeningBalance,
  upsertVendorBalance,
  recordVendorRefund,
  applyVendorCredit,
  payoutVendorCredit,
  type StatementRange,
  type SetCustomerOpeningBalanceRequest,
  type UpsertVendorBalanceRequest,
  type RecordVendorRefundRequest,
  type ApplyVendorCreditRequest,
  type PayoutVendorCreditRequest,
} from '@/lib/api/arpa';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

// ---- Mutations ----

const errMessage = (e: unknown, fallback: string): string => {
  const data = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  return data?.error || data?.message || (e instanceof Error ? e.message : fallback);
};

/**
 * Set a customer's carried-in AR opening balance (POST /ar/customers/opening-balance).
 * Refreshes the operational AR customer balances + AR summary/aging so the new
 * opening figure shows immediately. Toasts success/error.
 */
export function useSetCustomerOpeningBalance(tenant: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SetCustomerOpeningBalanceRequest) => setCustomerOpeningBalance(tenant!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar-customer-balances', tenant ?? ''] });
      queryClient.invalidateQueries({ queryKey: ['ar-summary', tenant ?? ''] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging', tenant ?? ''] });
      toast.success('Customer opening balance saved.');
    },
    onError: (e: unknown) => toast.error(errMessage(e, 'Failed to set opening balance.')),
  });
}

/**
 * Upsert a vendor opening / advance balance (POST /ap/vendors).
 * Refreshes the AP vendor balances + AP summary. Toasts success/error.
 */
export function useUpsertVendorBalance(tenant: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertVendorBalanceRequest) => upsertVendorBalance(tenant!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arpaKeys.vendorBalances(tenant ?? '') });
      queryClient.invalidateQueries({ queryKey: arpaKeys.apSummary(tenant ?? '') });
      toast.success('Vendor balance saved.');
    },
    onError: (e: unknown) => toast.error(errMessage(e, 'Failed to save vendor balance.')),
  });
}

/**
 * Record cash received back from a supplier on a purchase return
 * (POST /ap/vendors/refund-received). Refreshes the AP vendor balances + AP
 * summary so the new figure shows immediately. Toasts success/error.
 */
export function useRecordVendorRefund(tenant: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordVendorRefundRequest) => recordVendorRefund(tenant!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arpaKeys.vendorBalances(tenant ?? '') });
      queryClient.invalidateQueries({ queryKey: arpaKeys.apSummary(tenant ?? '') });
      toast.success('Vendor refund recorded.');
    },
    onError: (e: unknown) => toast.error(errMessage(e, 'Failed to record vendor refund.')),
  });
}

/**
 * Draw down a supplier's existing stored credit against a NEW bill
 * (POST /ap/vendors/{vendorID}/apply-credit). Refreshes the vendor balances + AP summary +
 * bills list (the target bill flips to paid). Toasts success/error.
 */
export function useApplyVendorCredit(tenant: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorKey, body }: { vendorKey: string; body: ApplyVendorCreditRequest }) =>
      applyVendorCredit(tenant!, vendorKey, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arpaKeys.vendorBalances(tenant ?? '') });
      queryClient.invalidateQueries({ queryKey: arpaKeys.apSummary(tenant ?? '') });
      queryClient.invalidateQueries({ queryKey: ['bills', 'list', tenant ?? ''] });
      toast.success('Vendor credit applied to bill.');
    },
    onError: (e: unknown) => toast.error(errMessage(e, 'Failed to apply vendor credit.')),
  });
}

/**
 * Pay out some/all of a supplier's existing stored credit, independent of any bill
 * (POST /ap/vendors/{vendorID}/payout-credit). Refreshes the vendor balances + AP summary.
 * Toasts success/error.
 */
export function usePayoutVendorCredit(tenant: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorKey, body }: { vendorKey: string; body: PayoutVendorCreditRequest }) =>
      payoutVendorCredit(tenant!, vendorKey, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arpaKeys.vendorBalances(tenant ?? '') });
      queryClient.invalidateQueries({ queryKey: arpaKeys.apSummary(tenant ?? '') });
      toast.success('Vendor credit paid out.');
    },
    onError: (e: unknown) => toast.error(errMessage(e, 'Failed to pay out vendor credit.')),
  });
}
