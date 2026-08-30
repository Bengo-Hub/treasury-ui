'use client';

import {
  getBills,
  getAllBills,
  createBill,
  payBill,
  getAPAging,
  listBillPayments,
  voidBillPayment,
  type BillsParams,
  type CreateBillRequest,
  type PayBillRequest,
} from '@/lib/api/bills';
import { arpaKeys } from '@/hooks/use-arpa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const STALE_MS = 2 * 60 * 1000;

export const billKeys = {
  list: (tenantIdOrSlug: string, params?: BillsParams) =>
    ['bills', 'list', tenantIdOrSlug, params] as const,
  aging: (tenantIdOrSlug: string) =>
    ['bills', 'aging', tenantIdOrSlug] as const,
};

export function useBills(
  tenantIdOrSlug: string | undefined,
  params?: BillsParams,
  enabled = true,
) {
  return useQuery({
    queryKey: billKeys.list(tenantIdOrSlug ?? '', params),
    queryFn: () => getBills(tenantIdOrSlug!, params),
    enabled: !!tenantIdOrSlug && enabled,
    staleTime: STALE_MS,
  });
}

// useAllBills fetches the tenant's COMPLETE bill history (pages through the backend until
// exhausted) — for views that aggregate/derive over every bill rather than showing one page of
// them (e.g. the Vendors page's per-vendor rollup). See getAllBills for why a plain useBills({})
// call silently truncates this to the newest 20.
export function useAllBills(tenantIdOrSlug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['bills', 'all', tenantIdOrSlug ?? ''],
    queryFn: () => getAllBills(tenantIdOrSlug!),
    enabled: !!tenantIdOrSlug && enabled,
    staleTime: STALE_MS,
  });
}

export function useAPAging(tenantIdOrSlug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: billKeys.aging(tenantIdOrSlug ?? ''),
    queryFn: () => getAPAging(tenantIdOrSlug!),
    enabled: !!tenantIdOrSlug && enabled,
    staleTime: STALE_MS,
  });
}

export function useCreateBill(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBillRequest) => createBill(tenantIdOrSlug!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills', 'list', tenantIdOrSlug] });
    },
  });
}

export function usePayBill(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayBillRequest }) =>
      payBill(tenantIdOrSlug!, id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['bills', 'list', tenantIdOrSlug] });
      qc.invalidateQueries({ queryKey: ['bills', 'aging', tenantIdOrSlug] });
      qc.invalidateQueries({ queryKey: arpaKeys.vendorBalances(tenantIdOrSlug ?? '') });
      qc.invalidateQueries({ queryKey: ['bill-payments', tenantIdOrSlug, id] });
      toast.success('Payment recorded');
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data?.error === 'approval_required') {
        toast.warning('This payment needs approval before it can be released. Send it for approval in the Approvals inbox.');
        return;
      }
      toast.error(data?.error || 'Failed to pay bill');
    },
  });
}

// ---- Recorded-payment history (View Payments modal) ----

export function useBillPayments(tenantIdOrSlug: string | undefined, billId: string, enabled = true) {
  return useQuery({
    queryKey: ['bill-payments', tenantIdOrSlug, billId],
    queryFn: () => listBillPayments(tenantIdOrSlug!, billId),
    enabled: !!tenantIdOrSlug && !!billId && enabled,
  });
}

export function useVoidBillPayment(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, paymentId, reason }: { billId: string; paymentId: string; reason?: string }) =>
      voidBillPayment(tenantIdOrSlug!, billId, paymentId, reason),
    onSuccess: (_d, { billId }) => {
      qc.invalidateQueries({ queryKey: ['bill-payments', tenantIdOrSlug, billId] });
      qc.invalidateQueries({ queryKey: ['bills', 'list', tenantIdOrSlug] });
      qc.invalidateQueries({ queryKey: ['bills', 'aging', tenantIdOrSlug] });
      qc.invalidateQueries({ queryKey: arpaKeys.vendorBalances(tenantIdOrSlug ?? '') });
    },
  });
}
