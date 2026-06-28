/**
 * Accounts Payable / Accounts Receivable balances, summaries, and statements (treasury-api).
 * Base path: /api/v1/{tenantIdOrSlug}
 *
 * Backed by internal/http/handlers/arpa.go:
 *   GET  /{tenant}/ap/summary                      -> APSummary
 *   GET  /{tenant}/ap/vendors                      -> pagination envelope of VendorBalance
 *   POST /{tenant}/ap/vendors                      -> upsert a vendor opening/advance balance
 *   GET  /{tenant}/ap/vendors/{vendorID}/statement -> VendorStatement
 *   POST /{tenant}/ar/customers/opening-balance    -> set a customer's carried-in AR balance
 *   GET  /{tenant}/ar/customers/{contactID}/statement -> CustomerStatement
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

/** AP dashboard rollup (computed live from open vendor bills). */
export interface APSummary {
  tenant_id: string;
  as_of: string;
  total_payable: string;
  overdue: string;
  due_this_week: string;
  current: string;
  vendor_count: number;
  open_bills: number;
}

/** Per-supplier running AP balance row (opening/advance + billed/paid/owed). */
export interface VendorBalance {
  id: string;
  tenant_id: string;
  vendor_id?: string;
  vendor_identifier?: string;
  vendor_name?: string;
  opening_balance?: string;
  advance_balance?: string;
  total_billed: string;
  total_paid: string;
  balance_owed: string;
  payment_terms?: string;
  currency: string;
  last_payment_date?: string;
  last_bill_date?: string;
  updated_at: string;
}

/** One row of a customer/vendor statement (debit/credit + running balance). */
export interface StatementLine {
  date: string;
  doc_type: string;
  reference: string;
  debit: string;
  credit: string;
  balance: string;
  status: string;
}

/** Period statement of a customer's AR activity. */
export interface CustomerStatement {
  tenant_id: string;
  crm_contact_id?: string;
  customer_name?: string;
  from: string;
  to: string;
  total_invoiced: string;
  closing_balance: string;
  lines: StatementLine[];
}

/** Period statement of a supplier's AP activity. */
export interface VendorStatement {
  tenant_id: string;
  vendor_id?: string;
  vendor_name?: string;
  from: string;
  to: string;
  total_billed: string;
  closing_balance: string;
  lines: StatementLine[];
}

export interface StatementRange {
  from?: string;
  to?: string;
}

/**
 * Set a customer's carried-in AR opening balance (POST /ar/customers/opening-balance).
 * Posts DR 1400 (Accounts Receivable) / CR 3200 (Opening Balance Equity). Identify the
 * customer by `crm_contact_id` (preferred) or a free-form `customer_identifier`.
 */
export interface SetCustomerOpeningBalanceRequest {
  crm_contact_id?: string;
  customer_identifier?: string;
  customer_name?: string;
  opening_balance: string | number;
  currency?: string;
}

/**
 * Upsert a vendor's opening / advance balance (POST /ap/vendors). Posts DR 3200
 * (Opening Balance Equity) / CR 2050 (Accounts Payable). Identify the vendor by
 * `vendor_id` (UUID) or a free-form `vendor_identifier`.
 */
export interface UpsertVendorBalanceRequest {
  vendor_id?: string;
  vendor_identifier?: string;
  vendor_name?: string;
  opening_balance?: string | number;
  advance_balance?: string | number;
  payment_terms?: string;
  currency?: string;
}

/** treasury-api list endpoints return a pagination envelope `{ data, total, page, limit }`. */
interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ---- API Functions ----

export function getAPSummary(tenant: string): Promise<APSummary> {
  return apiClient.get<APSummary>(`${BASE}/${tenant}/ap/summary`);
}

export async function getVendorBalances(tenant: string): Promise<VendorBalance[]> {
  const res = await apiClient.get<Paginated<VendorBalance> | VendorBalance[]>(
    `${BASE}/${tenant}/ap/vendors`,
  );
  return Array.isArray(res) ? res : res.data ?? [];
}

export function getVendorStatement(
  tenant: string,
  vendorId: string,
  range?: StatementRange,
): Promise<VendorStatement> {
  return apiClient.get<VendorStatement>(
    `${BASE}/${tenant}/ap/vendors/${vendorId}/statement`,
    range,
  );
}

export function getCustomerStatement(
  tenant: string,
  contactId: string,
  range?: StatementRange,
): Promise<CustomerStatement> {
  return apiClient.get<CustomerStatement>(
    `${BASE}/${tenant}/ar/customers/${contactId}/statement`,
    range,
  );
}

/** Set a customer's carried-in AR opening balance (posts DR 1400 / CR 3200). */
export function setCustomerOpeningBalance(
  tenant: string,
  body: SetCustomerOpeningBalanceRequest,
): Promise<CustomerBalanceRow> {
  return apiClient.post<CustomerBalanceRow>(
    `${BASE}/${tenant}/ar/customers/opening-balance`,
    body,
  );
}

/** Upsert a vendor's opening / advance balance (posts DR 3200 / CR 2050). */
export function upsertVendorBalance(
  tenant: string,
  body: UpsertVendorBalanceRequest,
): Promise<VendorBalance> {
  return apiClient.post<VendorBalance>(`${BASE}/${tenant}/ap/vendors`, body);
}

/** Minimal AR balance row returned by the opening-balance endpoint. */
export interface CustomerBalanceRow {
  id: string;
  tenant_id: string;
  crm_contact_id?: string;
  customer_identifier?: string;
  customer_name?: string;
  balance_due: string;
  currency: string;
  updated_at: string;
}
