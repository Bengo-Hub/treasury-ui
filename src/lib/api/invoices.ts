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
  /** Buying / cost price per unit (business-only — never rendered on the customer PDF). */
  unit_cost?: number | string;
  tax_code?: string;
  tax_rate?: number | string;
  discount_amount?: number | string;
  /** Progress/milestone billing: bill this % of qty×rate (0<pct<100). Transient — the backend
   *  folds it into the billed line total; not stored as its own field. */
  completion_percent?: number;
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
  /** Buying / cost price per unit (business-only). */
  unit_cost?: string;
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
  /** Owning tenant display name — only populated by the platform-wide (all-tenants) list. */
  tenant_name?: string;
  /** Owning tenant slug — only populated by the platform-wide (all-tenants) list. */
  tenant_slug?: string;
  invoice_number: string;
  public_token: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_kra_pin?: string;
  crm_customer_id?: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  discount_amount?: string;
  discount_mode?: string;
  shipping_amount?: string;
  /** Captured shipping/transport block (shipped-from/to, transporter own/third-party, mode, vehicle, doc). */
  transport?: Record<string, any>;
  total_amount: string;
  currency: string;
  transaction_currency?: string;
  notes?: string;
  terms?: string;
  status: string;
  payment_status: string;
  /** Cumulative amount received (sum of active payment records) — drives paid/partial. */
  amount_paid?: string;
  /** Delivery-note goods-dispatch lifecycle: draft | dispatched | delivered | cancelled.
   *  Only meaningful for delivery_challan / delivery_note documents. */
  delivery_status?: string;
  reference_id?: string;
  reference_type?: string;
  /** Originating outlet/branch that made the sale (null = tenant-wide / HQ). */
  outlet_id?: string;
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
  customer_kra_pin?: string;
  crm_customer_id?: string;
  invoice_type?: string;
  invoice_date: string;
  due_date: string;
  currency?: string;
  transaction_currency?: string;
  notes?: string;
  terms?: string;
  discount_mode?: string;
  shipping_amount?: number | string;
  transport?: Record<string, any>;
  reference_id?: string;
  reference_type?: string;
  /** Originating outlet/branch that made the sale (optional; null/omit = tenant-wide / HQ). */
  outlet_id?: string;
  lines: LineRequest[];
  metadata?: Record<string, unknown>;
}

export interface UpdateInvoiceRequest {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_kra_pin?: string;
  invoice_type?: string;
  invoice_date?: string;
  due_date?: string;
  currency?: string;
  notes?: string;
  terms?: string;
  shipping_amount?: number | string;
  transport?: Record<string, any>;
  /** Originating outlet/branch that made the sale (optional; null/omit = tenant-wide / HQ). */
  outlet_id?: string;
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
  /** Comma-separated invoice_types (e.g. "standard,pos_receipt"); takes precedence over `type`. */
  types?: string;
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
  /** Buying / cost price per unit (business-only). */
  unit_cost?: string;
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
  /** Owning tenant display name — only populated by the platform-wide (all-tenants) list. */
  tenant_name?: string;
  /** Owning tenant slug — only populated by the platform-wide (all-tenants) list. */
  tenant_slug?: string;
  quote_number: string;
  public_token: string;
  customer_id?: string;
  crm_customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
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
  /** Originating outlet/branch that made the sale (null = tenant-wide / HQ). */
  outlet_id?: string;
  lines?: QuotationLine[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateQuotationRequest {
  customer_id?: string;
  crm_customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  quote_date: string;
  valid_until: string;
  currency?: string;
  notes?: string;
  terms?: string;
  reference_type?: string;
  reference_id?: string;
  /** Originating outlet/branch that made the sale (optional; null/omit = tenant-wide / HQ). */
  outlet_id?: string;
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
  /** Originating outlet/branch that made the sale (optional; null/omit = tenant-wide / HQ). */
  outlet_id?: string;
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

// ---- Public Invoice Types ----

export interface PublicInvoice {
  invoice_number: string;
  public_token: string;
  customer_name?: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  discount_amount?: string;
  total_amount: string;
  currency: string;
  status: string;
  payment_status: string;
  notes?: string;
  terms?: string;
  tenant_slug: string;
  tenant_name: string;
  lines?: InvoiceLine[];
}

/** Fetch a public invoice by share token — no auth required. */
export async function fetchPublicInvoice(token: string): Promise<PublicInvoice> {
  const TREASURY_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://booksapi.codevertexitsolutions.com';
  const res = await fetch(`${TREASURY_URL}/api/v1/public/invoices/${token}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch invoice: ${res.status}`);
  return res.json();
}

/** Fetch a public quotation by share token — no auth required. */
export async function fetchPublicQuotation(token: string): Promise<PublicQuotation> {
  const TREASURY_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://booksapi.codevertexitsolutions.com';
  const res = await fetch(`${TREASURY_URL}/api/v1/public/quotations/${token}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch quotation: ${res.status}`);
  return res.json();
}

// ---- Invoice API Functions ----

export async function listInvoices(tenant: string, filters?: InvoiceFilters): Promise<ListInvoicesResponse> {
  const params: Record<string, unknown> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.payment_status) params.payment_status = filters.payment_status;
  if (filters?.types) params.types = filters.types;
  else if (filters?.type) params.type = filters.type;
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.page) params.offset = (filters.page - 1) * (filters.limit || 50);
  const raw = await apiClient.get<Record<string, unknown>>(`${BASE}/${tenant}/invoices`, params);
  return unwrapInvoiceList(raw, (params.offset as number) ?? 0);
}

/**
 * The treasury-api list endpoints return a pagination envelope
 * (`{ data, total, limit, page, hasMore }`). Map it into the typed
 * `{ invoices, total, limit, offset }` shape the components consume,
 * tolerating both the enveloped and legacy named-key responses.
 */
function unwrapInvoiceList(raw: any, fallbackOffset: number): ListInvoicesResponse {
  return {
    invoices: (raw?.invoices ?? raw?.data ?? []) as Invoice[],
    total: Number(raw?.total ?? 0),
    limit: Number(raw?.limit ?? 0),
    offset: Number(raw?.offset ?? fallbackOffset),
  };
}

export function createInvoice(tenant: string, body: CreateInvoiceRequest): Promise<Invoice> {
  return apiClient.post<Invoice>(`${BASE}/${tenant}/invoices`, body);
}

export interface BulkUploadRowError {
  row: number;
  message: string;
}

export interface BulkUploadResult {
  created: number;
  failed: number;
  errors?: BulkUploadRowError[];
}

/**
 * Upload a CSV file of documents to be created in bulk for the given invoice
 * `type` (e.g. 'credit_note', 'sales_order'). Sent as multipart/form-data; axios
 * sets the boundary automatically for the FormData body.
 */
export function bulkUploadInvoices(tenant: string, type: string, file: File): Promise<BulkUploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);
  return apiClient.post<BulkUploadResult>(`${BASE}/${tenant}/invoices/bulk`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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

// ---- Invoice approval (shared approval engine, entity_type="invoice") ----
// submit -> backend sets status "pending_approval" (or auto-approves below the tenant
// workflow threshold). approve advances the multi-step chain (final step -> "approved").
// reject sends the invoice back to "draft" so it can be revised and re-submitted.

export function submitInvoiceForApproval(tenant: string, invoiceId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/submit-for-approval`, {});
}

export function approveInvoice(tenant: string, invoiceId: string, comment?: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/approve`, { comment });
}

export function rejectInvoice(tenant: string, invoiceId: string, reason?: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/reject`, { reason });
}

/** One recorded payment against an invoice (View Payments modal row). Soft-voided, never deleted. */
export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: string;
  currency: string;
  method: string;
  reference?: string;
  note?: string;
  account_id?: string;
  paid_at: string;
  status: 'active' | 'voided';
  void_reason?: string;
  created_at: string;
}

export interface RecordPaymentInput {
  amount: number | string;
  method?: string;
  reference?: string;
  note?: string;
  account_id?: string;
  paid_at?: string;
}

export function recordPayment(tenant: string, invoiceId: string, input: RecordPaymentInput): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/record-payment`, {
    ...input,
    amount: String(input.amount),
  });
}

export function listInvoicePayments(tenant: string, invoiceId: string): Promise<{ data: InvoicePayment[] }> {
  return apiClient.get<{ data: InvoicePayment[] }>(`${BASE}/${tenant}/invoices/${invoiceId}/payments`);
}

/** Edit a payment's descriptive fields — never the amount (void + re-record to change money). */
export function updateInvoicePayment(
  tenant: string,
  invoiceId: string,
  paymentId: string,
  input: { method?: string; reference?: string; note?: string; paid_at?: string; account_id?: string },
): Promise<InvoicePayment> {
  return apiClient.patch<InvoicePayment>(`${BASE}/${tenant}/invoices/${invoiceId}/payments/${paymentId}`, input);
}

/** Soft-void a payment: reversing journal, amount_paid + payment_status recomputed. */
export function voidInvoicePayment(tenant: string, invoiceId: string, paymentId: string, reason?: string): Promise<InvoicePayment> {
  return apiClient.delete<InvoicePayment>(`${BASE}/${tenant}/invoices/${invoiceId}/payments/${paymentId}`, { data: { reason } });
}

/** Send the customer the payment-received notification for one payment. */
export function notifyInvoicePayment(tenant: string, invoiceId: string, paymentId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/payments/${paymentId}/notify`, {});
}

export function markPaid(tenant: string, invoiceId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/mark-paid`, {});
}

export function createCreditNote(tenant: string, invoiceId: string): Promise<Invoice> {
  return apiClient.post<Invoice>(`${BASE}/${tenant}/invoices/${invoiceId}/create-credit-note`, {});
}

export function createDebitNote(tenant: string, invoiceId: string): Promise<Invoice> {
  return apiClient.post<Invoice>(`${BASE}/${tenant}/invoices/${invoiceId}/create-debit-note`, {});
}

/** Generate a delivery note (delivery challan, DC-prefixed) document from an invoice. */
export function generateDeliveryNote(tenant: string, invoiceId: string): Promise<Invoice> {
  return apiClient.post<Invoice>(`${BASE}/${tenant}/invoices/${invoiceId}/delivery-note`, {});
}

// ---- Delivery-note goods-dispatch lifecycle (draft → dispatched → delivered, + cancel) ----
// Backed by the merged delivery-note FSM. Only valid for delivery_challan/delivery_note docs;
// each transition is gated to the valid current delivery_status by the backend.

export type DeliveryStatus = 'draft' | 'dispatched' | 'delivered' | 'cancelled';

/** Mark a delivery note as dispatched (draft → dispatched). Emits the goods-issue event. */
export function dispatchDeliveryNote(tenant: string, invoiceId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/dispatch`, {});
}

/** Mark a delivery note as delivered (dispatched → delivered), with optional receiver + note. */
export function deliverDeliveryNote(
  tenant: string,
  invoiceId: string,
  body?: { received_by?: string; note?: string },
): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/deliver`, body ?? {});
}

/** Cancel a delivery note (draft | dispatched → cancelled). */
export function cancelDeliveryNote(tenant: string, invoiceId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/cancel-delivery`, {});
}

/** Set an explicit delivery status (status + optional note + received_by). */
export function setDeliveryStatus(
  tenant: string,
  invoiceId: string,
  body: { status: DeliveryStatus; note?: string; received_by?: string },
): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/invoices/${invoiceId}/delivery-status`, body);
}

export function convertProformaToInvoice(tenant: string, invoiceId: string): Promise<{ status: string; invoice: Invoice }> {
  return apiClient.post<{ status: string; invoice: Invoice }>(`${BASE}/${tenant}/invoices/${invoiceId}/convert-to-invoice`, {});
}

export function getInvoiceStats(tenant: string, types?: string): Promise<InvoiceStats> {
  return apiClient.get<InvoiceStats>(`${BASE}/${tenant}/invoices/stats`, types ? { types } : undefined);
}

// ---- Platform (cross-tenant) Invoice API ----
// Platform owners see invoices across ALL tenants (incl. platform-level subscription
// invoices) without selecting a tenant. `scope` narrows to platform-level or business
// invoices; `tenant_ids` narrows to specific tenants.

export type PlatformInvoiceScope = 'all' | 'platform' | 'business';

export interface PlatformInvoiceFilters extends InvoiceFilters {
  scope?: PlatformInvoiceScope;
  tenant_ids?: string;
}

function platformInvoiceParams(filters?: PlatformInvoiceFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (filters?.scope && filters.scope !== 'all') params.scope = filters.scope;
  if (filters?.tenant_ids) params.tenant_ids = filters.tenant_ids;
  if (filters?.status) params.status = filters.status;
  if (filters?.payment_status) params.payment_status = filters.payment_status;
  if (filters?.types) params.types = filters.types;
  else if (filters?.type) params.type = filters.type;
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.page) params.offset = (filters.page - 1) * (filters.limit || 50);
  return params;
}

/** List invoices across all tenants (platform-owner view). */
export async function listPlatformInvoices(filters?: PlatformInvoiceFilters): Promise<ListInvoicesResponse> {
  const params = platformInvoiceParams(filters);
  const raw = await apiClient.get<Record<string, unknown>>(`${BASE}/platform/invoices`, params);
  return unwrapInvoiceList(raw, (params.offset as number) ?? 0);
}

/** Aggregate invoice stats across all tenants (platform-owner view). */
export function getPlatformInvoiceStats(filters?: Pick<PlatformInvoiceFilters, 'scope' | 'tenant_ids' | 'types'>): Promise<InvoiceStats> {
  const params: Record<string, unknown> = {};
  if (filters?.scope && filters.scope !== 'all') params.scope = filters.scope;
  if (filters?.tenant_ids) params.tenant_ids = filters.tenant_ids;
  if (filters?.types) params.types = filters.types;
  return apiClient.get<InvoiceStats>(`${BASE}/platform/invoices/stats`, params);
}

export interface PlatformQuotationFilters extends QuotationFilters {
  tenant_ids?: string;
}

/** List quotations across all tenants (platform-owner view). */
export async function listPlatformQuotations(filters?: PlatformQuotationFilters): Promise<ListQuotationsResponse> {
  const params: Record<string, unknown> = {};
  if (filters?.tenant_ids) params.tenant_ids = filters.tenant_ids;
  if (filters?.status) params.status = filters.status;
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.page) params.offset = (filters.page - 1) * (filters.limit || 50);
  const raw = await apiClient.get<Record<string, unknown>>(`${BASE}/platform/quotations`, params);
  return {
    quotations: (raw?.quotations ?? raw?.data ?? []) as Quotation[],
    total: Number(raw?.total ?? 0),
    limit: Number(raw?.limit ?? 0),
    offset: Number(raw?.offset ?? (params.offset as number) ?? 0),
  };
}

export function getInvoiceSummary(tenant: string): Promise<{ summary: InvoiceStatusCount[] }> {
  return apiClient.get<{ summary: InvoiceStatusCount[] }>(`${BASE}/${tenant}/invoices/summary`);
}

export function getInvoiceGraph(tenant: string): Promise<{ graph: InvoiceGraphPoint[] }> {
  return apiClient.get<{ graph: InvoiceGraphPoint[] }>(`${BASE}/${tenant}/invoices/graph`);
}

// ---- Accounts Receivable (aging / summary) ----

export interface ARSummary {
  total_receivable: string;
  overdue: string;
  due_this_week: string;
  current: string;
  customer_count: number;
  open_invoices: number;
}

export interface ARAgingRow {
  entity_id: string;
  entity_name: string;
  current: string;
  days_1_to_30: string;
  days_31_to_60: string;
  days_61_to_90: string;
  over_90: string;
  total: string;
}

export interface ARAgingReport {
  as_of: string;
  type: string;
  rows: ARAgingRow[];
}

export function getARSummary(tenant: string): Promise<ARSummary> {
  return apiClient.get<ARSummary>(`${BASE}/${tenant}/ar/summary`);
}

export function getARAging(tenant: string): Promise<ARAgingReport> {
  return apiClient.get<ARAgingReport>(`${BASE}/${tenant}/ar/aging`);
}

export interface SyncCustomerToCRMResult {
  crm_customer_id: string;
  invoices_updated: number;
  quotations_updated: number;
}

/** Upsert a doc-derived customer into the MarketFlow CRM (customer SoT) and back-link the
 *  tenant's invoices/quotations to the resolved contact. Requires email or phone. */
export function syncCustomerToCRM(
  tenant: string,
  body: { customer_name: string; email?: string; phone?: string },
): Promise<SyncCustomerToCRMResult> {
  return apiClient.post<SyncCustomerToCRMResult>(`${BASE}/${tenant}/ar/customers/sync-crm`, body);
}

// Per-customer running AR balances (the operational AR ledger — includes POS credit sales,
// which create no invoice). The `id`/`crm_contact_id` is used to receive a repayment.
export interface CustomerBalance {
  id: string;
  crm_contact_id?: string;
  customer_identifier?: string;
  customer_name?: string;
  // opening_balance is carried in at onboarding; total_credits doubles as issued store credit.
  opening_balance?: string;
  total_invoiced: string;
  total_paid: string;
  total_credits: string;
  balance_due: string;
  credit_limit?: string;
  currency: string;
  last_payment_date?: string;
  last_invoice_date?: string;
  updated_at: string;
}

interface Paginated<T> { data: T[]; total: number; page: number; limit: number }

export async function getCustomerBalances(tenant: string): Promise<CustomerBalance[]> {
  const res = await apiClient.get<Paginated<CustomerBalance> | CustomerBalance[]>(`${BASE}/${tenant}/ar/customers`);
  return Array.isArray(res) ? res : res.data ?? [];
}

// Receive a customer's repayment against their AR balance. `contactId` = crm_contact_id (or the
// customer_identifier for non-CRM rows). Returns the updated balance.
export function recordCustomerPayment(
  tenant: string,
  contactId: string,
  body: { amount: number; payment_method?: string; reference?: string },
): Promise<CustomerBalance> {
  return apiClient.post<CustomerBalance>(`${BASE}/${tenant}/ar/customers/${contactId}/payment`, {
    amount: String(body.amount),
    payment_method: body.payment_method,
    reference: body.reference,
  });
}

export function downloadInvoicePDF(tenant: string, publicToken: string, download = false): string {
  return `/api/v1/public/invoices/${publicToken}/pdf${download ? '?download=true' : ''}`;
}

export function exportInvoice(tenant: string, publicToken: string, format: 'csv' | 'xlsx'): string {
  return `/api/v1/public/invoices/${publicToken}/export?format=${format}`;
}

// Generate a payment receipt (RCP-YYMMDD-NNNNNN) from a paid invoice.
export function generateReceiptFromInvoice(tenant: string, invoiceId: string): Promise<Invoice> {
  return apiClient.post<Invoice>(`${BASE}/${tenant}/invoices/${invoiceId}/generate-receipt`, {});
}

// Generate a payment receipt from a payment intent.
// tenantId (UUID) is appended as ?tenantId= so ResolveTenantForRequest on the backend
// uses it directly — critical for platform-admin cross-tenant calls where the JWT tenant
// is the platform owner, not the selected tenant.
export function generateReceiptFromIntent(tenant: string, intentId: string, tenantId?: string): Promise<Invoice> {
  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return apiClient.post<Invoice>(`${BASE}/${tenant}/payments/intents/${intentId}/generate-receipt${qs}`, {});
}

// ---- Quotation API Functions ----

export async function listQuotations(tenant: string, filters?: QuotationFilters): Promise<ListQuotationsResponse> {
  const params: Record<string, unknown> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.page) params.offset = (filters.page - 1) * (filters.limit || 50);
  const raw = await apiClient.get<Record<string, unknown>>(`${BASE}/${tenant}/quotations`, params);
  return {
    quotations: (raw?.quotations ?? raw?.data ?? []) as Quotation[],
    total: Number(raw?.total ?? 0),
    limit: Number(raw?.limit ?? 0),
    offset: Number(raw?.offset ?? (params.offset as number) ?? 0),
  };
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

export function convertQuotationToProforma(tenant: string, quotationId: string): Promise<{ status: string; proforma_invoice: Invoice }> {
  return apiClient.post<{ status: string; proforma_invoice: Invoice }>(`${BASE}/${tenant}/quotations/${quotationId}/convert-to-proforma`, {});
}

export function convertQuotationToSalesOrder(tenant: string, quotationId: string): Promise<{ status: string; sales_order: Invoice }> {
  return apiClient.post<{ status: string; sales_order: Invoice }>(`${BASE}/${tenant}/quotations/${quotationId}/convert-to-sales-order`, {});
}

export function generateDeliveryChallan(tenant: string, quotationId: string): Promise<{ task_id: string; tracking_code: string }> {
  return apiClient.post<{ task_id: string; tracking_code: string }>(`${BASE}/${tenant}/quotations/${quotationId}/delivery-challan`, {});
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
