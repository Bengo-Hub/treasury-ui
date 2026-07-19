'use client';

import {
  getBills,
  createBill,
  payBill,
  getAPAging,
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
      qc.invalidateQueries({ queryKey: ['bills', 'list', tenantIdOrSlug] });
      qc.invalidateQueries({ queryKey: ['bills', 'aging', tenantIdOrSlug] });
      qc.invalidateQueries({ queryKey: arpaKeys.vendorBalances(tenantIdOrSlug ?? '') });
      toast.success('Bill paid');
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
