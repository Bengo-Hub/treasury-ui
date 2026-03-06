'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listPlatformGateways,
  listTenantAvailableGateways,
  testPlatformGateway,
  type GatewayConfig,
  type ListGatewaysResponse,
} from '@/lib/api/gateways';

const STALE_MS = 5 * 60 * 1000;

export const gatewayKeys = {
  tenant: (orgSlug: string) => ['gateways', 'tenant', orgSlug] as const,
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
