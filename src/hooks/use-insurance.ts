'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  listProviders,
  createProvider,
  getConnectorConfig,
  upsertConnectorConfig,
  testConnection,
  type CreateProviderRequest,
  type UpsertConnectorConfigRequest,
} from '@/lib/api/insurance';

export function useInsuranceProviders() {
  const { tenantPathId } = useResolvedTenant();
  return useQuery({
    queryKey: ['insurance-providers', tenantPathId],
    queryFn: () => listProviders(tenantPathId),
    enabled: !!tenantPathId,
    select: (res) => res.data ?? [],
  });
}

export function useCreateInsuranceProvider() {
  const { tenantPathId } = useResolvedTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProviderRequest) => createProvider(tenantPathId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance-providers', tenantPathId] }),
  });
}

export function useConnectorConfig(providerId: string | null) {
  const { tenantPathId } = useResolvedTenant();
  return useQuery({
    queryKey: ['insurance-connector', tenantPathId, providerId],
    queryFn: () => getConnectorConfig(tenantPathId, providerId as string),
    enabled: !!tenantPathId && !!providerId,
    retry: false,
  });
}

export function useUpsertConnectorConfig(providerId: string | null) {
  const { tenantPathId } = useResolvedTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertConnectorConfigRequest) => upsertConnectorConfig(tenantPathId, providerId as string, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance-connector', tenantPathId, providerId] }),
  });
}

export function useTestConnection(providerId: string | null) {
  const { tenantPathId } = useResolvedTenant();
  return useMutation({
    mutationFn: ({ operation, sample }: { operation: string; sample: Record<string, string> }) =>
      testConnection(tenantPathId, providerId as string, operation, sample),
  });
}
