/**
 * Accounts Payable / Accounts Receivable balances, summaries, and statements (treasury-api).
 * Base path: /api/v1/{tenantIdOrSlug}
 *
 * Backed by internal/http/handlers/arpa.go:
 *   GET /{tenant}/ap/summary                      -> APSummary
 *   GET /{tenant}/ap/vendors                      -> pagination envelope of VendorBalance
 *   GET /{tenant}/ap/vendors/{vendorID}/statement -> VendorStatement
 *   GET /{tenant}/ar/customers/{contactID}/statement -> CustomerStatement
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
