'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPlatformGateway,
  getTenantPayoutConfig,
  getTenantSelectedGateways,
  listPlatformGateways,
  listTenantAvailableGateways,
  selectTenantGateway,
  testPlatformGateway,
  updatePlatformGateway,
  upsertTenantPayoutConfig,
  type CreateGatewayRequest,
  type ListGatewaysResponse,
  type PayoutConfigRequest,
  type PayoutConfigResponse,
  type UpdateGatewayRequest,
} from '@/lib/api/gateways';

const STALE_MS = 5 * 60 * 1000;

export const gatewayKeys = {
  tenant: (orgSlug: string) => ['gateways', 'tenant', orgSlug] as const,
  tenantSelected: (orgSlug: string) => ['gateways', 'tenant', orgSlug, 'selected'] as const,
  tenantPayoutConfig: (orgSlug: string) => ['gateways', 'tenant', orgSlug, 'payout-config'] as const,
  platform: () => ['gateways', 'platform'] as const,
};

export interface TenantGatewayOption {
  gateway_type: string;
  name: string;
  transaction_fee_type: string;
  supports_stk_push: boolean;
}

export function useTenantGateways(orgSlug: string) {
  return useQuery({
    queryKey: gatewayKeys.tenant(orgSlug),
    queryFn: async () => {
      const res = await listTenantAvailableGateways(orgSlug);
      return (res.gateways || []) as TenantGatewayOption[];
    },
    enabled: !!orgSlug,
    staleTime: STALE_MS,
  });
}

export function useTenantSelectedGateways(orgSlug: string) {
  return useQuery({
    queryKey: gatewayKeys.tenantSelected(orgSlug),
    queryFn: () => getTenantSelectedGateways(orgSlug),
    enabled: !!orgSlug,
    staleTime: STALE_MS,
  });
}

export function useTenantPayoutConfig(orgSlug: string, enabled = true) {
  return useQuery<PayoutConfigResponse | null>({
    queryKey: gatewayKeys.tenantPayoutConfig(orgSlug),
    queryFn: async () => {
      try {
        return await getTenantPayoutConfig(orgSlug);
      } catch {
        return null;
      }
    },
    enabled: !!orgSlug && enabled,
    staleTime: STALE_MS,
  });
}

export function useSelectTenantGateway(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gatewayType: string) => selectTenantGateway(orgSlug, gatewayType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.tenant(orgSlug) });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.tenantSelected(orgSlug) });
    },
  });
}

export function useUpsertTenantPayoutConfig(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PayoutConfigRequest) => upsertTenantPayoutConfig(orgSlug, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.tenantPayoutConfig(orgSlug) });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.tenantSelected(orgSlug) });
    },
  });
}

export function usePlatformGateways(enabled = true) {
  return useQuery<ListGatewaysResponse>({
    queryKey: gatewayKeys.platform(),
    queryFn: listPlatformGateways,
    enabled,
    staleTime: STALE_MS,
  });
}

export function useTestPlatformGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testPlatformGateway(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.platform() });
    },
  });
}

export function useCreatePlatformGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGatewayRequest) => createPlatformGateway(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.platform() });
    },
  });
}

export function useUpdatePlatformGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGatewayRequest }) => updatePlatformGateway(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.platform() });
    },
  });
}
