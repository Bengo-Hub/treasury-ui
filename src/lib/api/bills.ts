/**
 * Bills / Accounts Payable API.
 * Base path: /api/v1/{tenantIdOrSlug}
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

export interface BillLine {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_amount: string;
  line_total: string;
  sort_order: number;
}

export interface Bill {
  id: string;
  tenant_id: string;
  bill_number: string;
  document_type: 'bill' | 'credit_note';
  vendor_id?: string;
  vendor_name?: string;
  bill_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  status: string; // draft, pending, paid, overdue, cancelled
  payment_intent_id?: string;
  paid_from_account_id?: string;
  payment_method?: string;
  payment_reference?: string;
  source_service?: string;
  source_reference_id?: string;
  lines?: BillLine[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Shared pagination envelope (Bengo-Hub/pagination): the list key is `data`. The old `bills`
// key never existed in the response — every consumer reading it rendered an empty list.
export interface BillsResponse {
  data: Bill[];
  total: number;
  page?: number;
  limit?: number;
}

export interface BillsParams {
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  tenantId?: string;
}

export interface BillLineReq {
  description: string;
  quantity: number;
  unit_price: number;
  tax_amount?: number;
}

export interface CreateBillRequest {
  vendor_id?: string;
  vendor_name?: string;
  /** 'bill' (a payable, default) or 'credit_note' (a supplier credit that nets against payables). */
  document_type?: 'bill' | 'credit_note';
  bill_date: string;
  due_date: string;
  currency?: string;
  lines: BillLineReq[];
  metadata?: Record<string, any>;
}

// PayBillRequest is the full vendor-bill settlement payload: an explicit GL account + payment
// method + reference (offline: cash/bank/card), a real online dispatch (mpesa_b2b/mpesa_b2c/
// paystack_bank/paystack_mobile — the backend routes these through the payout Dispatcher), or the
// legacy fallback of linking an already-collected payment intent.
export interface PayBillRequest {
  payment_intent_id?: string;
  paid_from_account_id?: string;
  /** cash|bank|card (offline, requires reference) or mpesa_b2b|mpesa_b2c|paystack_bank|paystack_mobile (online, dispatched for real). */
  payment_method?: string;
  reference?: string;
  /** Recipient* are only used for online payment methods — the supplier's payout destination. */
  recipient_phone?: string;
  recipient_bank_code?: string;
  recipient_account_number?: string;
  recipient_account_name?: string;
  user_id?: string;
}

/** payment_method values PayBill dispatches for real via the payout Dispatcher rather than merely recording. */
export const ONLINE_PAYMENT_METHODS = ['mpesa_b2b', 'mpesa_b2c', 'paystack_bank', 'paystack_mobile'] as const;

export interface AgingRow {
  entity_id: string;
  entity_name: string;
  current: string;
  days_1_to_30: string;
  days_31_to_60: string;
  days_61_to_90: string;
  over_90: string;
  total: string;
}

export interface AgingReport {
  tenant_id: string;
  as_of: string;
  type: string;
  rows: AgingRow[];
}

// ---- API functions ----

export function getBills(tenantIdOrSlug: string, params?: BillsParams): Promise<BillsResponse> {
  return apiClient.get<BillsResponse>(`${BASE}/${tenantIdOrSlug}/ap/bills`, params);
}

export function getBill(tenantIdOrSlug: string, id: string): Promise<Bill> {
  return apiClient.get<Bill>(`${BASE}/${tenantIdOrSlug}/ap/bills/${id}`);
}

export function createBill(tenantIdOrSlug: string, data: CreateBillRequest): Promise<Bill> {
  return apiClient.post<Bill>(`${BASE}/${tenantIdOrSlug}/ap/bills`, data);
}

export function payBill(tenantIdOrSlug: string, id: string, data: PayBillRequest): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/ap/bills/${id}/pay`, data);
}

export function getAPAging(tenantIdOrSlug: string): Promise<AgingReport> {
  return apiClient.get<AgingReport>(`${BASE}/${tenantIdOrSlug}/ap/aging`);
}
