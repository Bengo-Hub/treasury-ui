'use client';

import {
  getBills,
  getAllBills,
  createBill,
  payBill,
  settleVendorBills,
  getAPAging,
  listBillPayments,
  voidBillPayment,
  type BillsParams,
  type CreateBillRequest,
  type PayBillRequest,
  type SettleVendorBillsRequest,
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
    onSuccess: () => {
      invalidateVendorPaymentViews(qc, tenantIdOrSlug);
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

/** Every cached view a vendor payment changes: bill lists, aging, AP balances/summary, the
 * inventory supplier pickers (which show what is owed) and bill payment histories. */
function invalidateVendorPaymentViews(qc: ReturnType<typeof useQueryClient>, tenant: string | undefined) {
  qc.invalidateQueries({ queryKey: ['bills', 'list', tenant] });
  qc.invalidateQueries({ queryKey: ['bills', 'all', tenant ?? ''] });
  qc.invalidateQueries({ queryKey: ['bills', 'aging', tenant] });
  qc.invalidateQueries({ queryKey: arpaKeys.vendorBalances(tenant ?? '') });
  qc.invalidateQueries({ queryKey: arpaKeys.apSummary(tenant ?? '') });
  qc.invalidateQueries({ queryKey: ['arpa', 'vendor-statement', tenant ?? ''] });
  qc.invalidateQueries({ queryKey: ['inventory', tenant, 'vendors'] });
  qc.invalidateQueries({ queryKey: ['bill-payments', tenant] });
}

/** Live allocation preview for a consolidated settlement (dry run, writes nothing). */
export function useVendorSettlementPreview(tenant: string | undefined, req: SettleVendorBillsRequest | null) {
  return useQuery({
    queryKey: ['vendor-settlement-preview', tenant, req],
    queryFn: () => settleVendorBills(tenant!, { ...req!, dry_run: true }),
    enabled: !!tenant && !!req,
    placeholderData: (prev) => prev,
    staleTime: 0,
    retry: false,
  });
}

/** Records a consolidated settlement: one amount across the supplier's open bills. */
export function useSettleVendorBills(tenant: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SettleVendorBillsRequest) => settleVendorBills(tenant!, { ...data, dry_run: false }),
    onSuccess: (res) => {
      invalidateVendorPaymentViews(qc, tenant);
      if (res.already_recorded) {
        toast.info('This settlement was already recorded.');
        return;
      }
      const parts = [
        res.bills_paid ? `${res.bills_paid} bill${res.bills_paid === 1 ? '' : 's'} paid` : '',
        res.bills_partial ? `${res.bills_partial} part-paid` : '',
      ].filter(Boolean);
      toast.success(`Settlement ${res.reference} recorded${parts.length ? `: ${parts.join(', ')}` : ''}`);
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data?.error === 'approval_required') {
        toast.warning('This payment needs approval before it can be released. Approve it in the Approvals inbox, then submit it again.');
        return;
      }
      toast.error(data?.error || 'Failed to record the settlement');
    },
  });
}
