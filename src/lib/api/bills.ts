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
  source_service?: string;
  source_reference_id?: string;
  lines?: BillLine[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BillsResponse {
  bills: Bill[];
  total: number;
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
  bill_date: string;
  due_date: string;
  currency?: string;
  lines: BillLineReq[];
  metadata?: Record<string, any>;
}

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

export function payBill(tenantIdOrSlug: string, id: string, paymentIntentId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/ap/bills/${id}/pay`, { payment_intent_id: paymentIntentId });
}

export function getAPAging(tenantIdOrSlug: string): Promise<AgingReport> {
  return apiClient.get<AgingReport>(`${BASE}/${tenantIdOrSlug}/ap/aging`);
}
