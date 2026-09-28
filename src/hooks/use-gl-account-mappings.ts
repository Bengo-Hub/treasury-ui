'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listGLAccountMappings,
  createGLAccountMapping,
  updateGLAccountMapping,
  deleteGLAccountMapping,
  getGLMappingCatalog,
  type GLAccountMappingsResponse,
  type CreateGLAccountMappingRequest,
  type UpdateGLAccountMappingRequest,
  type ListGLAccountMappingsParams,
} from '@/lib/api/gl-account-mappings';

const STALE_MS = 5 * 60 * 1000;

export const glAccountMappingKeys = {
  all: (orgSlug: string) => ['gl-account-mappings', orgSlug] as const,
};

export function useGLAccountMappings(tenantSlug: string, params?: ListGLAccountMappingsParams) {
  return useQuery<GLAccountMappingsResponse>({
    queryKey: [...glAccountMappingKeys.all(tenantSlug), params],
    queryFn: () => listGLAccountMappings(tenantSlug, params),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}

/** Every posting key with its default account; static, so cached for the session. */
export function useGLMappingCatalog(tenantSlug: string) {
  return useQuery({
    queryKey: [...glAccountMappingKeys.all(tenantSlug), 'catalog'],
    queryFn: () => getGLMappingCatalog(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: Infinity,
    select: (r) => r.keys,
  });
}

export function useCreateGLAccountMapping(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGLAccountMappingRequest) => createGLAccountMapping(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glAccountMappingKeys.all(tenantSlug) });
    },
  });
}

export function useUpdateGLAccountMapping(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGLAccountMappingRequest }) =>
      updateGLAccountMapping(tenantSlug, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glAccountMappingKeys.all(tenantSlug) });
    },
  });
}

export function useDeleteGLAccountMapping(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGLAccountMapping(tenantSlug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glAccountMappingKeys.all(tenantSlug) });
    },
  });
}
