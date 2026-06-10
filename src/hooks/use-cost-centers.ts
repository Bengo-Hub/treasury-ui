'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  type CostCentersResponse,
  type CreateCostCenterRequest,
  type UpdateCostCenterRequest,
  type ListCostCentersParams,
} from '@/lib/api/cost-centers';

const STALE_MS = 5 * 60 * 1000;

export const costCenterKeys = {
  all: (orgSlug: string) => ['cost-centers', orgSlug] as const,
};

export function useCostCenters(tenantSlug: string, params?: ListCostCentersParams) {
  return useQuery<CostCentersResponse>({
    queryKey: [...costCenterKeys.all(tenantSlug), params],
    queryFn: () => listCostCenters(tenantSlug, params),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}

export function useCreateCostCenter(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCostCenterRequest) => createCostCenter(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costCenterKeys.all(tenantSlug) });
    },
  });
}

export function useUpdateCostCenter(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCostCenterRequest }) =>
      updateCostCenter(tenantSlug, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costCenterKeys.all(tenantSlug) });
    },
  });
}

export function useDeleteCostCenter(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCostCenter(tenantSlug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costCenterKeys.all(tenantSlug) });
    },
  });
}
