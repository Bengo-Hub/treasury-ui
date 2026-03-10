import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/lib/api/client';

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
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      const data = await api.get<PlatformOverview>(`/platform/analytics/overview?${params.toString()}`);
      return data;
    },
  });
}

export function usePlatformByTenant(from?: string, to?: string) {
  return useQuery({
    queryKey: ['platform_analytics_by_tenant', from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      const data = await api.get<{ tenants: TenantRevenue[] }>(`/platform/analytics/by-tenant?${params.toString()}`);
      return data;
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
  
  // Note: the URL prefix should match your API base. For exports accessed via window.location.href, we might need full URL including orgSlug.
  // Using relative path for the frontend router vs the absolute API route is handled elsewhere, so we just return the query params.
  return `/platform/analytics/transactions/export?${params.toString()}`;
}
