'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listCostCenters,
  suggestCostCenter,
  type SuggestCostCenterParams,
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

/**
 * Default cost centre for a record being entered (same rules the ledger applies when it posts).
 * Pass `enabled: false` once the user has picked one, so the suggestion never overrides a choice.
 */
export function useSuggestedCostCenter(
  tenantSlug: string,
  params: SuggestCostCenterParams,
  enabled = true,
) {
  const hasInput = !!(params.account_id || params.project_id || params.category_id || params.name || params.kind);
  return useQuery({
    queryKey: [...costCenterKeys.all(tenantSlug), 'suggest', params],
    queryFn: () => suggestCostCenter(tenantSlug, params),
    enabled: !!tenantSlug && enabled && hasInput,
    staleTime: STALE_MS,
    select: (r) => r.cost_center,
  });
}

/**
 * Keeps a new record's cost-centre field on the suggested default, following it as the category,
 * account or project change, until the user picks a value themselves (clearing it included).
 * Only for new records: an edit form shows the stored value.
 */
export function useCostCenterDefault(
  tenantSlug: string,
  params: SuggestCostCenterParams,
  value: string | undefined,
  setValue: (id: string) => void,
  /** False on edit forms, where the stored value must be shown untouched. */
  active = true,
) {
  const [touched, setTouched] = useState(false);
  const following = active && !touched;
  const { data } = useSuggestedCostCenter(tenantSlug, params, following);
  useEffect(() => {
    if (following && data?.id && data.id !== value) setValue(data.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id, following]);
  return {
    suggested: data ?? null,
    /** Use as the field's onChange so a manual choice stops the defaulting. */
    onUserChange: (id: string) => {
      setTouched(true);
      setValue(id);
    },
    /** Call when the form is reset for another entry. */
    reset: () => setTouched(false),
  };
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
