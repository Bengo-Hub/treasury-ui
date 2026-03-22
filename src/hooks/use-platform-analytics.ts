import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/lib/api/client';

const BASE = '/api/v1';

export interface PlatformOverview {
  period: string;
  total_revenue: string;
  total_transactions: number;
  succeeded_count: number;
  active_tenants: number;
  currency: string;
}

export interface TenantRevenue {
  tenant_id: string;
  total_revenue: string;
  transaction_count: number;
}

export function usePlatformOverview(from?: string, to?: string) {
  return useQuery({
    queryKey: ['platform_analytics_overview', from, to],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      return api.get<PlatformOverview>(`${BASE}/platform/analytics/overview`, params);
    },
  });
}

export function usePlatformByTenant(from?: string, to?: string) {
  return useQuery({
    queryKey: ['platform_analytics_by_tenant', from, to],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      return api.get<{ tenants: TenantRevenue[] }>(`${BASE}/platform/analytics/by-tenant`, params);
    },
  });
}

export function getTransactionsExportURL(from?: string, to?: string, status?: string, source_service?: string, tenant_id?: string) {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (status) params.append('status', status);
  if (source_service) params.append('source_service', source_service);
  if (tenant_id) params.append('tenant_id', tenant_id);
  return `${BASE}/platform/analytics/transactions/export?${params.toString()}`;
}
