/**
 * Invoice and quotation API (treasury-api).
 * Base path: /api/v1/{tenant}
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Invoice Types ----

export interface InvoiceLine {
  id: string;
  description: string;
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
  customer_id?: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  status: string;
  payment_status: string;
  reference_id?: string;
  reference_type?: string;
  lines?: InvoiceLine[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LineRequest {
  description: string;
  quantity: number | string;
  unit_price: number | string;
  tax_code?: string;
  tax_rate?: number | string;
  discount_amount?: number | string;
}

export interface CreateInvoiceRequest {
  customer_id?: string;
  invoice_type?: string;
  invoice_date: string;
  due_date: string;
  currency?: string;
  reference_id?: string;
  reference_type?: string;
  lines: LineRequest[];
  metadata?: Record<string, any>;
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

// ---- Quotation Types ----

export interface QuotationLine {
  id: string;
  description: string;
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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
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

// ---- Invoice API Functions ----

/** List invoices with optional filters. */
export function listInvoices(tenant: string, filters?: InvoiceFilters): Promise<ListInvoicesResponse> {
  const params: Record<string, any> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.payment_status) params.payment_status = filters.payment_status;
  if (filters?.type) params.type = filters.type;
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.page) params.offset = ((filters.page - 1) * (filters.limit || 50));
  return apiClient.get<ListInvoicesResponse>(`${BASE}/${tenant}/invoices`, params);
}

/** Create a new invoice. */
export function createInvoice(tenant: string, body: CreateInvoiceRequest): Promise<Invoice> {
  return apiClient.post<Invoice>(`${BASE}/${tenant}/invoices`, body);
}

/** Get a single invoice. */
export function getInvoice(tenant: string, invoiceId: string): Promise<Invoice> {
  return apiClient.get<Invoice>(`${BASE}/${tenant}/invoices/${invoiceId}`);
}

/** Send an invoice to the customer. */
export function sendInvoice(tenant: string, invoiceId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/send`, {});
}

/** Void an invoice. */
export function voidInvoice(tenant: string, invoiceId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/void`, {});
}

/** Record a payment against an invoice. */
export function recordPayment(tenant: string, invoiceId: string, amount: number | string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/record-payment`, { amount: String(amount) });
}

// ---- Quotation API Functions ----

/** List quotations with optional filters. */
export function listQuotations(tenant: string, filters?: QuotationFilters): Promise<ListQuotationsResponse> {
  const params: Record<string, any> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.page) params.offset = ((filters.page - 1) * (filters.limit || 50));
  return apiClient.get<ListQuotationsResponse>(`${BASE}/${tenant}/quotations`, params);
}

/** Create a new quotation. */
export function createQuotation(tenant: string, body: CreateQuotationRequest): Promise<Quotation> {
  return apiClient.post<Quotation>(`${BASE}/${tenant}/quotations`, body);
}

/** Get a single quotation. */
export function getQuotation(tenant: string, quotationId: string): Promise<Quotation> {
  return apiClient.get<Quotation>(`${BASE}/${tenant}/quotations/${quotationId}`);
}

/** Send a quotation to the customer. */
export function sendQuotation(tenant: string, quotationId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/quotations/${quotationId}/send`, {});
}

/** Accept a quotation (converts to invoice). */
export function acceptQuotation(tenant: string, quotationId: string): Promise<{ status: string; invoice: Invoice }> {
  return apiClient.post<{ status: string; invoice: Invoice }>(`${BASE}/${tenant}/quotations/${quotationId}/accept`, {});
}

/** Decline a quotation. */
export function declineQuotation(tenant: string, quotationId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/quotations/${quotationId}/decline`, {});
}
