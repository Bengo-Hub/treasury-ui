import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/lib/api/client';

const BASE = '/api/v1';

export interface PlatformOverview {
  period: string;
  /** TOTAL recorded sales volume, every channel (cash/manual/gateway) — NOT a custody claim. */
  gmv: string;
  /** Alias of gmv. */
  payment_volume: string;
  /** Subset of gmv actually collected into the platform's own gateway account — the real settlement-liability figure. */
  platform_collected_gmv: string;
  /** gmv − platform_collected_gmv: recorded sales the platform never held (cash/mpesa_manual/card_manual/etc). */
  tenant_collected_gmv: string;
  /** PAYG per-transaction commission, all channels (owed regardless of how the sale was collected). */
  payg_commission: string;
  /** Platform's own GL revenue: subscription fees, platform fees, payment processing, direct sales. */
  platform_own_revenue: string;
  /** TOTAL platform income = payg_commission + platform_own_revenue. This is the headline figure. */
  platform_revenue: string;
  /** Owed to tenants = platform_collected_gmv − commission on that same subset. */
  tenant_net: string;
  /** Alias of platform_revenue. */
  total_revenue: string;
  total_transactions: number;
  succeeded_count: number;
  active_tenants: number;
  currency: string;
}

export interface TenantRevenue {
  tenant_id: string;
  tenant_name?: string;
  tenant_slug?: string;
  /** Tenant's own gross volume (alias of gmv). */
  total_revenue: string;
  gmv: string;
  /** Platform commission earned from this tenant. */
  commission: string;
  /** Owed to this tenant at settlement (gross − commission). */
  net_payable: string;
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

// ── New platform-owner BI endpoints (timeseries / revenue-streams / equity-obligations /
// referral-performance) — added for the Ecosystem Analytics BI redesign. Kept separate from the
// overview/by-tenant/by-service section above (which stays untouched) so those existing
// interfaces/hooks are never at risk of an accidental edit.

export interface PlatformTimeseriesPoint {
  date: string;
  /** All money fields are decimal STRINGS — parseFloat/Number before formatting. */
  gmv: string;
  payg_commission: string;
  platform_own_revenue: string;
  platform_revenue: string;
  net_profit: string;
}

export interface PlatformTimeseriesResponse {
  series: PlatformTimeseriesPoint[];
  from: string;
  to: string;
  total_gmv: string;
  total_payg_commission: string;
  total_platform_own_revenue: string;
  total_platform_revenue: string;
  total_net_profit: string;
  currency: string;
}

/** Platform-wide revenue trend — GMV / PAYG commission / platform's own revenue / net profit per day (or bucket). */
export function usePlatformTimeseries(from?: string, to?: string, tenantIds?: string) {
  return useQuery({
    queryKey: ['platform_analytics_timeseries', from, to, tenantIds],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (tenantIds) params.tenant_ids = tenantIds;
      return api.get<PlatformTimeseriesResponse>(`${BASE}/platform/analytics/timeseries`, params);
    },
  });
}

export interface PlatformRevenueStreams {
  period: string;
  subscription_revenue: string;
  platform_fee_revenue: string;
  payment_processing_revenue: string;
  payg_commission: string;
  other_own_revenue: string;
  /** Sum of the five streams above (subscriptions + fees + processing + PAYG + other). */
  platform_own_revenue: string;
  platform_revenue: string;
  currency: string;
}

/** Composition of platform revenue by stream — subscriptions vs. fees vs. processing vs. PAYG vs. other. */
export function usePlatformRevenueStreams(from?: string, to?: string, tenantIds?: string) {
  return useQuery({
    queryKey: ['platform_analytics_revenue_streams', from, to, tenantIds],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (tenantIds) params.tenant_ids = tenantIds;
      return api.get<PlatformRevenueStreams>(`${BASE}/platform/analytics/revenue-streams`, params);
    },
  });
}

export interface PlatformEquityObligations {
  period: string;
  currency: string;
  /** Owed to royalty/revenue-share holders but not yet paid out. OMITTED (not "0.00") when the
   *  equity handler isn't wired — treat `undefined` as "unknown", never as zero. */
  accrued_non_dividend_obligations?: string;
  /** Already disbursed this period to royalty/revenue-share holders. Always present ("0.00" if none). */
  paid_to_non_dividend_holders: string;
  /** Net profit remaining for dividends. OMITTED unless exactly one umbrella dividend holder
   *  resolves for the period — never fabricate a fallback value when this is absent. */
  available_for_dividend?: string;
  /** Present only alongside `available_for_dividend`. */
  dividend_umbrella_holder_id?: string;
  dividend_umbrella_holder_name?: string;
}

/** Dividend-availability panel data: what's already spoken for vs. what's free to declare. Platform-wide only — no tenant_ids param on this endpoint. */
export function usePlatformEquityObligations(from?: string, to?: string) {
  return useQuery({
    queryKey: ['platform_analytics_equity_obligations', from, to],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      return api.get<PlatformEquityObligations>(`${BASE}/platform/analytics/equity-obligations`, params);
    },
  });
}

export interface ReferralTopEarner {
  holder_id: string;
  holder_name: string;
  referral_id?: string;
  referred_tenant_id?: string;
  referred_tenant_name?: string;
  gross: string;
  tax_withheld: string;
  net: string;
}

export interface PlatformReferralPerformance {
  period: string;
  currency: string;
  active_programs: number;
  top_earners: ReferralTopEarner[];
}

/** Referral-program leaderboard: active program count + top-earning referrers for the period. */
export function usePlatformReferralPerformance(from?: string, to?: string, limit?: number) {
  return useQuery({
    queryKey: ['platform_analytics_referral_performance', from, to, limit],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (limit != null) params.limit = String(limit);
      return api.get<PlatformReferralPerformance>(`${BASE}/platform/analytics/referral-performance`, params);
    },
  });
}
