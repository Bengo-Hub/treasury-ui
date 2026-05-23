/**
 * Invoice and quotation API (treasury-api).
 * Base path: /api/v1/{tenant}
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Shared Line Types ----

export interface LineRequest {
  description: string;
  item_id?: string;
  item_sku?: string;
  item_type?: string;
  image_url?: string;
  unit?: string;
  quantity: number | string;
  unit_price: number | string;
  tax_code?: string;
  tax_rate?: number | string;
  discount_amount?: number | string;
}

// ---- Invoice Types ----

export interface InvoiceLine {
  id: string;
  description: string;
  item_id?: string;
  item_sku?: string;
  item_type?: string;
  image_url?: string;
  unit?: string;
  quantity: string;
  unit_price: string;
  tax_code?: string;
  tax_rate: string;
  tax_amount: string;
  discount_amount: string;
  line_total: string;
  sort_order: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  public_token: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  crm_customer_id?: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  discount_amount?: string;
  discount_mode?: string;
  total_amount: string;
  currency: string;
  transaction_currency?: string;
  notes?: string;
  terms?: string;
  status: string;
  payment_status: string;
  reference_id?: string;
  reference_type?: string;
  lines?: InvoiceLine[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceRequest {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  crm_customer_id?: string;
  invoice_type?: string;
  invoice_date: string;
  due_date: string;
  currency?: string;
  transaction_currency?: string;
  notes?: string;
  terms?: string;
  discount_mode?: string;
  reference_id?: string;
  reference_type?: string;
  lines: LineRequest[];
  metadata?: Record<string, unknown>;
}

export interface UpdateInvoiceRequest {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  invoice_type?: string;
  invoice_date?: string;
  due_date?: string;
  currency?: string;
  notes?: string;
  terms?: string;
  lines?: LineRequest[];
  metadata?: Record<string, unknown>;
}

export interface ListInvoicesResponse {
  invoices: Invoice[];
  total: number;
  limit: number;
  offset: number;
}

export interface InvoiceFilters {
  status?: string;
  payment_status?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceStats {
  total_count: number;
  total_amount: string;
  amount_due: string;
  amount_paid: string;
  currency: string;
}

export interface InvoiceStatusCount {
  status: string;
  count: number;
}

export interface InvoiceGraphPoint {
  month: string;
  count: number;
  total_amount: string;
}

// ---- Quotation Types ----

export interface QuotationLine {
  id: string;
  description: string;
  item_id?: string;
  item_sku?: string;
  item_type?: string;
  image_url?: string;
  unit?: string;
  quantity: string;
  unit_price: string;
  tax_code?: string;
  tax_rate: string;
  tax_amount: string;
  discount_amount: string;
  line_total: string;
  sort_order: number;
}

export interface Quotation {
  id: string;
  tenant_id: string;
  quote_number: string;
  public_token: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  quote_date: string;
  valid_until: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  currency: string;
  status: string;
  notes?: string;
  terms?: string;
  converted_invoice_id?: string;
  converted_at?: string;
  created_by: string;
  reference_type?: string;
  reference_id?: string;
  lines?: QuotationLine[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateQuotationRequest {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  quote_date: string;
  valid_until: string;
  currency?: string;
  notes?: string;
  terms?: string;
  reference_type?: string;
  reference_id?: string;
  lines: LineRequest[];
  metadata?: Record<string, unknown>;
}

export interface UpdateQuotationRequest {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  quote_date?: string;
  valid_until?: string;
  currency?: string;
  notes?: string;
  terms?: string;
  lines?: LineRequest[];
  metadata?: Record<string, unknown>;
}

export interface ListQuotationsResponse {
  quotations: Quotation[];
  total: number;
  limit: number;
  offset: number;
}

export interface QuotationFilters {
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface QuotationStats {
  total_count: number;
  total_amount: string;
  currency: string;
}

export interface QuotationStatusCount {
  status: string;
  count: number;
}

export interface QuotationGraphPoint {
  month: string;
  count: number;
  total_amount: string;
}

// ---- Public Quotation Types ----

export interface PublicQuotation {
  quote_number: string;
  public_token: string;
  customer_name?: string;
  quote_date: string;
  valid_until: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  currency: string;
  status: string;
  notes?: string;
  terms?: string;
  tenant_slug: string;
  tenant_name: string;
  lines?: QuotationLine[];
}

/** Fetch a public quotation by share token — no auth required. */
export async function fetchPublicQuotation(token: string): Promise<PublicQuotation> {
  const TREASURY_URL =
    process.env.TREASURY_API_URL || 'https://treasuryapi.codevertexitsolutions.com';
  const res = await fetch(`${TREASURY_URL}/api/v1/public/quotations/${token}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch quotation: ${res.status}`);
  return res.json();
}

// ---- Invoice API Functions ----

export function listInvoices(tenant: string, filters?: InvoiceFilters): Promise<ListInvoicesResponse> {
  const params: Record<string, unknown> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.payment_status) params.payment_status = filters.payment_status;
  if (filters?.type) params.type = filters.type;
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.page) params.offset = (filters.page - 1) * (filters.limit || 50);
  return apiClient.get<ListInvoicesResponse>(`${BASE}/${tenant}/invoices`, params);
}

export function createInvoice(tenant: string, body: CreateInvoiceRequest): Promise<Invoice> {
  return apiClient.post<Invoice>(`${BASE}/${tenant}/invoices`, body);
}

export function getInvoice(tenant: string, invoiceId: string): Promise<Invoice> {
  return apiClient.get<Invoice>(`${BASE}/${tenant}/invoices/${invoiceId}`);
}

export function updateInvoice(tenant: string, invoiceId: string, body: UpdateInvoiceRequest): Promise<Invoice> {
  return apiClient.put<Invoice>(`${BASE}/${tenant}/invoices/${invoiceId}`, body);
}

export function deleteInvoice(tenant: string, invoiceId: string): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}`);
}

export function duplicateInvoice(tenant: string, invoiceId: string): Promise<Invoice> {
  return apiClient.post<Invoice>(`${BASE}/${tenant}/invoices/${invoiceId}/duplicate`, {});
}

export function sendInvoice(tenant: string, invoiceId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/send`, {});
}

export function voidInvoice(tenant: string, invoiceId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/void`, {});
}

export function recordPayment(tenant: string, invoiceId: string, amount: number | string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/record-payment`, { amount: String(amount) });
}

export function getInvoiceStats(tenant: string): Promise<InvoiceStats> {
  return apiClient.get<InvoiceStats>(`${BASE}/${tenant}/invoices/stats`);
}

export function getInvoiceSummary(tenant: string): Promise<{ summary: InvoiceStatusCount[] }> {
  return apiClient.get<{ summary: InvoiceStatusCount[] }>(`${BASE}/${tenant}/invoices/summary`);
}

export function getInvoiceGraph(tenant: string): Promise<{ graph: InvoiceGraphPoint[] }> {
  return apiClient.get<{ graph: InvoiceGraphPoint[] }>(`${BASE}/${tenant}/invoices/graph`);
}

export function downloadInvoicePDF(tenant: string, publicToken: string, download = false): string {
  return `/api/v1/public/invoices/${publicToken}/pdf${download ? '?download=true' : ''}`;
}

export function exportInvoice(tenant: string, publicToken: string, format: 'csv' | 'xlsx'): string {
  return `/api/v1/public/invoices/${publicToken}/export?format=${format}`;
}

// ---- Quotation API Functions ----

export function listQuotations(tenant: string, filters?: QuotationFilters): Promise<ListQuotationsResponse> {
  const params: Record<string, unknown> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.page) params.offset = (filters.page - 1) * (filters.limit || 50);
  return apiClient.get<ListQuotationsResponse>(`${BASE}/${tenant}/quotations`, params);
}

export function createQuotation(tenant: string, body: CreateQuotationRequest): Promise<Quotation> {
  return apiClient.post<Quotation>(`${BASE}/${tenant}/quotations`, body);
}

export function getQuotation(tenant: string, quotationId: string): Promise<Quotation> {
  return apiClient.get<Quotation>(`${BASE}/${tenant}/quotations/${quotationId}`);
}

export function updateQuotation(tenant: string, quotationId: string, body: UpdateQuotationRequest): Promise<Quotation> {
  return apiClient.put<Quotation>(`${BASE}/${tenant}/quotations/${quotationId}`, body);
}

export function deleteQuotation(tenant: string, quotationId: string): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenant}/quotations/${quotationId}`);
}

export function duplicateQuotation(tenant: string, quotationId: string): Promise<Quotation> {
  return apiClient.post<Quotation>(`${BASE}/${tenant}/quotations/${quotationId}/duplicate`, {});
}

export function sendQuotation(tenant: string, quotationId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/quotations/${quotationId}/send`, {});
}

export function acceptQuotation(tenant: string, quotationId: string): Promise<{ status: string; invoice: Invoice }> {
  return apiClient.post<{ status: string; invoice: Invoice }>(`${BASE}/${tenant}/quotations/${quotationId}/accept`, {});
}

export function declineQuotation(tenant: string, quotationId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/quotations/${quotationId}/decline`, {});
}

export function cancelQuotation(tenant: string, quotationId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/quotations/${quotationId}/cancel`, {});
}

export function getQuotationStats(tenant: string): Promise<QuotationStats> {
  return apiClient.get<QuotationStats>(`${BASE}/${tenant}/quotations/stats`);
}

export function getQuotationSummary(tenant: string): Promise<{ summary: QuotationStatusCount[] }> {
  return apiClient.get<{ summary: QuotationStatusCount[] }>(`${BASE}/${tenant}/quotations/summary`);
}

export function getQuotationGraph(tenant: string): Promise<{ graph: QuotationGraphPoint[] }> {
  return apiClient.get<{ graph: QuotationGraphPoint[] }>(`${BASE}/${tenant}/quotations/graph`);
}

export function downloadQuotationPDF(publicToken: string, download = false): string {
  return `/api/v1/public/quotations/${publicToken}/pdf${download ? '?download=true' : ''}`;
}

export function exportQuotation(publicToken: string, format: 'csv' | 'xlsx'): string {
  return `/api/v1/public/quotations/${publicToken}/export?format=${format}`;
}
