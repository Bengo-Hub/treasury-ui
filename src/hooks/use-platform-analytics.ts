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

export interface ServiceRevenue {
  source_service: string;
  gross_revenue: string;
  transaction_costs: string;
  net_revenue: string;
  transaction_count: number;
}

export function usePlatformOverview(from?: string, to?: string, tenantIds?: string) {
  return useQuery({
    queryKey: ['platform_analytics_overview', from, to, tenantIds],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (tenantIds) params.tenant_ids = tenantIds;
      return api.get<PlatformOverview>(`${BASE}/platform/analytics/overview`, params);
    },
  });
}

export function usePlatformByTenant(from?: string, to?: string, tenantIds?: string) {
  return useQuery({
    queryKey: ['platform_analytics_by_tenant', from, to, tenantIds],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (tenantIds) params.tenant_ids = tenantIds;
      return api.get<{ tenants: TenantRevenue[] }>(`${BASE}/platform/analytics/by-tenant`, params);
    },
  });
}

export function usePlatformByService(from?: string, to?: string, tenantIds?: string) {
  return useQuery({
    queryKey: ['platform_analytics_by_service', from, to, tenantIds],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (tenantIds) params.tenant_ids = tenantIds;
      return api.get<{ breakdown: ServiceRevenue[] }>(`${BASE}/platform/analytics/revenue-by-service`, params);
    },
  });
}

export interface PlatformTransactionParams {
  from?: string;
  to?: string;
  status?: string;
  payment_method?: string;
  source_service?: string;
  /** Comma-separated UUIDs — maps to ?tenant_ids= query param */
  tenant_ids?: string;
  page?: number;
  limit?: number;
}

export function usePlatformTransactions(params?: PlatformTransactionParams) {
  return useQuery({
    queryKey: ['platform_analytics_transactions', params],
    queryFn: async () => {
      const p: Record<string, string> = {};
      if (params?.from) p.from = params.from;
      if (params?.to) p.to = params.to;
      if (params?.status) p.status = params.status;
      if (params?.payment_method) p.payment_method = params.payment_method;
      if (params?.source_service) p.source_service = params.source_service;
      if (params?.tenant_ids) p.tenant_ids = params.tenant_ids;
      if (params?.page) p.page = String(params.page);
      if (params?.limit) p.limit = String(params.limit);
      return api.get<{ data: import('@/lib/api/analytics').TransactionItem[]; total: number; limit: number; page: number; hasMore: boolean }>(
        `${BASE}/platform/analytics/transactions`,
        p,
      );
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function getTransactionsExportURL(from?: string, to?: string, status?: string, source_service?: string, tenant_ids?: string) {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (status) params.append('status', status);
  if (source_service) params.append('source_service', source_service);
  if (tenant_ids) params.append('tenant_ids', tenant_ids);
  return `${BASE}/platform/analytics/transactions/export?${params.toString()}`;
}
