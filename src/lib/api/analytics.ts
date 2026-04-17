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
  tenant_id?: string;
  reference_id: string;
  reference_type: string;
  source_service: string;
  payment_method: string;
  amount: string;
  currency: string;
  status: string;
  transaction_cost?: string;
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

/** Get analytics summary for a tenant (revenue, counts). Platform owners can pass tenantId override. */
export function getAnalyticsSummary(tenantIdOrSlug: string, params?: AnalyticsSummaryParams & { tenantId?: string }): Promise<AnalyticsSummary> {
  return apiClient.get<AnalyticsSummary>(`${BASE}/${tenantIdOrSlug}/analytics/summary`, params);
}

/** Get paginated transactions with optional filters. Platform owners can pass tenantId override. */
export function getTransactions(tenantIdOrSlug: string, params?: TransactionsParams & { tenantId?: string }): Promise<TransactionsResponse> {
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

/** Export transactions as CSV. Triggers a file download via hidden link. */
export function exportTransactionsCSV(
  tenantIdOrSlug: string,
  params?: TransactionsParams & { tenantId?: string },
): void {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://booksapi.codevertexitsolutions.com';
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.status) qs.set('status', params.status);
  if (params?.source_service) qs.set('source_service', params.source_service);
  if (params?.payment_method) qs.set('payment_method', params.payment_method);
  if (params?.tenantId) qs.set('tenantId', params.tenantId);
  qs.set('format', 'csv');

  // Retrieve token from Zustand persisted auth store
  let token = '';
  try {
    const stored = localStorage.getItem('treasury-auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      token = parsed?.state?.session?.accessToken ?? '';
    }
  } catch { /* ignore parse errors */ }

  const url = `${baseUrl}${BASE}/${tenantIdOrSlug}/analytics/transactions/export?${qs.toString()}`;

  // Use fetch with auth header, then trigger download from the blob
  fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(res => {
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `transactions_${params?.from ?? 'all'}_${params?.to ?? 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    })
    .catch(err => {
      console.error('CSV export failed:', err);
    });
}

/** Get payout/settlement history for the tenant. */
export function getPayoutHistory(tenantIdOrSlug: string): Promise<PayoutHistoryResponse> {
  return apiClient.get<PayoutHistoryResponse>(`${BASE}/${tenantIdOrSlug}/payout/history`);
}
