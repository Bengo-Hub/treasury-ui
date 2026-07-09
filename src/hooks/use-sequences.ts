'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSequenceConfig,
  listSequenceConfigs,
  previewNextNumber,
  resetSequenceCounter,
  setSequenceCounter,
  updateSequenceConfig,
  type DocType,
  type UpdateSequenceConfigRequest,
} from '@/lib/api/sequences';

const STALE_MS = 5 * 60 * 1000;

export const sequenceKeys = {
  all: (tenant: string) => ['sequences', tenant] as const,
  list: (tenant: string) => ['sequences', tenant, 'list'] as const,
  detail: (tenant: string, docType: string) => ['sequences', tenant, docType] as const,
  preview: (tenant: string, docType: string) => ['sequences', tenant, docType, 'preview'] as const,
};

export function useSequenceConfigs(tenant: string, enabled = true) {
  return useQuery({
    queryKey: sequenceKeys.list(tenant),
    queryFn: () => listSequenceConfigs(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useSequenceConfig(tenant: string, docType: DocType, enabled = true) {
  return useQuery({
    queryKey: sequenceKeys.detail(tenant, docType),
    queryFn: () => getSequenceConfig(tenant, docType),
    enabled: !!tenant && !!docType && enabled,
    staleTime: STALE_MS,
  });
}

export function usePreviewNextNumber(tenant: string, docType: DocType, enabled = true) {
  return useQuery({
    queryKey: sequenceKeys.preview(tenant, docType),
    queryFn: () => previewNextNumber(tenant, docType),
    enabled: !!tenant && !!docType && enabled,
    staleTime: 30 * 1000,
  });
}

export function useUpdateSequenceConfig(tenant: string, docType: DocType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSequenceConfigRequest) => updateSequenceConfig(tenant, docType, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sequenceKeys.all(tenant) });
    },
  });
}

export function useResetSequenceCounter(tenant: string, docType: DocType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetSequenceCounter(tenant, docType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sequenceKeys.all(tenant) });
    },
  });
}

export function useSetSequenceCounter(tenant: string, docType: DocType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (currentVal: number) => setSequenceCounter(tenant, docType, currentVal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sequenceKeys.all(tenant) });
    },
  });
}
