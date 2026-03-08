/**
 * Treasury analytics API (summary, transactions).
 * Base path: /api/v1/{tenantIdOrSlug} — tenant from URL (slug supported via JWT fallback in backend).
 */

import { apiClient } from './client';

const BASE = '/api/v1';

export interface AnalyticsSummary {
  tenant_id: string;
  period: string;
  total_revenue: string;
  succeeded_count: number;
  pending_count: number;
  failed_count: number;
  currency: string;
}

export interface TransactionItem {
  id: string;
  reference_id: string;
  reference_type: string;
  source_service: string;
  payment_method: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
}

export interface TransactionsResponse {
  transactions: TransactionItem[];
  count: number;
}

export interface AnalyticsSummaryParams {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

export interface TransactionsParams extends AnalyticsSummaryParams {
  status?: string;
  payment_method?: string;
  source_service?: string;
}

/** Get analytics summary for a tenant (revenue, counts). */
export function getAnalyticsSummary(tenantIdOrSlug: string, params?: AnalyticsSummaryParams): Promise<AnalyticsSummary> {
  return apiClient.get<AnalyticsSummary>(`${BASE}/${tenantIdOrSlug}/analytics/summary`, params);
}

/** Get paginated transactions with optional filters. */
export function getTransactions(tenantIdOrSlug: string, params?: TransactionsParams): Promise<TransactionsResponse> {
  return apiClient.get<TransactionsResponse>(`${BASE}/${tenantIdOrSlug}/analytics/transactions`, params);
}

// --- Payouts (settlements) ---

export interface PayoutRecord {
  id: string;
  reference: string;
  amount: string;
  fee: string;
  net_amount: string;
  currency: string;
  status: string;
  transaction_count: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface PayoutHistoryResponse {
  payouts: PayoutRecord[];
}

/** Get payout/settlement history for the tenant. */
export function getPayoutHistory(tenantIdOrSlug: string): Promise<PayoutHistoryResponse> {
  return apiClient.get<PayoutHistoryResponse>(`${BASE}/${tenantIdOrSlug}/payout/history`);
}
