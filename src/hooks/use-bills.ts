'use client';

import {
  getBills,
  createBill,
  payBill,
  getAPAging,
  type BillsParams,
  type CreateBillRequest,
} from '@/lib/api/bills';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    mutationFn: ({ id, paymentIntentId }: { id: string; paymentIntentId: string }) =>
      payBill(tenantIdOrSlug!, id, paymentIntentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills', 'list', tenantIdOrSlug] });
      qc.invalidateQueries({ queryKey: ['bills', 'aging', tenantIdOrSlug] });
    },
  });
}
