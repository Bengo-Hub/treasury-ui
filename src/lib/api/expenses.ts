/**
 * Expenses & Categories API.
 * Base path: /api/v1/{tenantIdOrSlug}
 */

import { apiClient } from './client';
import { budgetOverrideParams, type BudgetCheckResult } from './budgets';

const BASE = '/api/v1';

// ---- Types ----

export interface Expense {
  id: string;
  tenant_id: string;
  expense_number: string;
  category_id?: string;
  category_name?: string;
  description: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  expense_date: string;
  status: string; // draft, submitted, approved, rejected, paid, reimbursed, cancelled
  submitted_by: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  receipt_url?: string;
  vendor_id?: string;
  account_id?: string;
  cost_center_id?: string;
  payment_intent_id?: string;
  paid_from_account_id?: string;
  source_service?: string;
  source_reference_id?: string;
  is_recurring: boolean;
  // Customer-cost linkage (Phase 9/11): an expense can be linked to an invoice + customer and
  // flagged billable/billed so per-invoice cost/margin and recharge are visible.
  invoice_id?: string;
  customer_id?: string;
  billable?: boolean;
  billed?: boolean;
  outlet_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  /** Owning tenant. Omitted for platform-global (shared) categories. */
  tenant_id?: string;
  /**
   * True for platform-managed common categories shared by every tenant. Global
   * categories appear in every tenant's list but cannot be edited or deleted by a
   * tenant — only tenant-owned categories are editable.
   */
  is_global?: boolean;
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  default_account_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  total: number;
  limit: number;
  offset: number;
}

export interface CategoriesResponse {
  categories: ExpenseCategory[];
  total: number;
}

export interface ExpensesParams {
  status?: string;
  category_id?: string;
  cost_center_id?: string;
  from?: string;
  to?: string;
  /** Expense number, description or vendor name (server-side). */
  search?: string;
  source_service?: string;
  // invoice_id + billable power the per-invoice linked-cost / margin view.
  invoice_id?: string;
  billable?: boolean;
  limit?: number;
  offset?: number;
  /** 1-based page — the shared Bengo-Hub/pagination lib reads this directly (page takes
   * precedence over `offset` when both are present). */
  page?: number;
  tenantId?: string;
}

export interface CreateExpenseRequest {
  // Caller-supplied reference number ("Expense Number" on the Add-Expense form). Omit to let
  // the server autogenerate the next number via the document-sequence service (same pattern as
  // invoice_number/quotation_number) — do not fabricate one client-side.
  expense_number?: string;
  category_id?: string;
  description: string;
  amount: number;
  tax_amount?: number;
  currency?: string;
  expense_date?: string;
  receipt_url?: string;
  vendor_id?: string;
  account_id?: string;
  cost_center_id?: string;
  // Real link to an existing invoice (billable/recharge cost linkage) — pick from the tenant's
  // invoices rather than free-typing a number with no relationship to the actual record.
  invoice_id?: string;
  // Recurrence: is_recurring marks a template; recurring_frequency sets the cycle. The backend
  // worker spawns a fresh draft each period. Sent top-level (not just metadata) so they persist to
  // real columns the scheduler reads.
  is_recurring?: boolean;
  recurring_frequency?: string;
  metadata?: Record<string, any>;
}

// Fields are optional: omit a field to leave it unchanged. Editing is only
// permitted while the expense is in `draft` — the backend returns 409 otherwise.
// total_amount is recomputed server-side from amount + tax_amount.
export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  tax_amount?: number;
  currency?: string;
  expense_date?: string;
  category_id?: string;
  cost_center_id?: string;
  vendor_id?: string;
  receipt_url?: string;
  billable?: boolean;
  invoice_id?: string;
  customer_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateCategoryRequest {
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  default_account_id?: string;
}

// Fields are optional: omit a field to leave it unchanged.
export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  parent_id?: string;
  default_account_id?: string;
}

// ---- API functions ----

export async function getExpenses(tenantIdOrSlug: string, params?: ExpensesParams): Promise<ExpensesResponse> {
  // The list endpoint returns a pagination envelope { data, total, limit, page, hasMore }.
  // Normalize into the typed { expenses, total, ... } shape (mirrors getInvoices) — the page reads
  // `data.expenses`, so without this the table always rendered "No expenses match your filters".
  const raw = await apiClient.get<any>(`${BASE}/${tenantIdOrSlug}/expenses`, params);
  return {
    expenses: (raw?.expenses ?? raw?.data ?? []) as Expense[],
    total: raw?.total ?? 0,
    limit: raw?.limit ?? 0,
    offset: raw?.offset ?? raw?.page ?? 0,
  };
}

/**
 * Summary of the expenses matching the list filters (server-side SQL aggregates over every
 * matching row, not just the current page). total_spend is incurred cost: approved, reimbursed
 * and paid, the same definition the P&L uses.
 */
export interface ExpenseStats {
  currency: string;
  total_count: number;
  total_spend: string;
  tax_amount: string;
  paid: string;
  outstanding: string;
  pending_approval: string;
  /** Payments settling an invoice's job cost: cash out, never spend (counted in paid only). */
  job_cost_payments: string;
  job_cost_count: number;
  by_status: { status: string; count: number; amount: string }[];
  by_category: { category_id?: string; category_name: string; count: number; amount: string }[];
  monthly: { month: string; count: number; amount: string }[];
}

/** Stats accept the list filters; paging params are ignored. */
export function getExpenseStats(tenantIdOrSlug: string, params?: ExpensesParams): Promise<ExpenseStats> {
  const { page: _page, limit: _limit, offset: _offset, ...filters } = params ?? {};
  return apiClient.get<ExpenseStats>(`${BASE}/${tenantIdOrSlug}/expenses/stats`, filters);
}

/**
 * An invoice's job costs. Goods: the COGS it expensed, what came from stock already held, what was
 * bought for the job (purchase-order bills, purchases paid here, tagged journals) and what is still
 * to buy. Services: SERVICE/VOUCHER line costs accrued with the revenue (Dr 5410 / Cr 2150), paid
 * and outstanding.
 */
/** One good to buy (or bought) for a job. */
export interface JobGoodsLine {
  item_id?: string;
  sku?: string;
  description: string;
  quantity: string | number;
  unit_cost: string | number;
}

export interface InvoiceJobCosts {
  invoice_id: string;
  goods: {
    cost: string;
    from_stock: string;
    bought: string;
    to_buy: string;
    /** Closed: purchasing complete; variance = actual (from stock + bought) minus costed. */
    variance: string;
    closed: boolean;
    /** False: inventory has not reported the stock position, so all goods count as to buy. */
    evaluated: boolean;
    po_numbers: string[];
    to_buy_lines: JobGoodsLine[];
  };
  /** own_staff: labour done by the business's own staff (wages reassigned, no bank movement). */
  services: { accrued: string; paid: string; own_staff: string; outstanding: string };
}

/** service_own_staff covers a service cost with own staff: no bank account, wages reassigned. */
export type JobCostKind = 'goods' | 'service' | 'service_own_staff';

export function getInvoiceJobCosts(tenantIdOrSlug: string, invoiceId: string): Promise<InvoiceJobCosts> {
  return apiClient.get<InvoiceJobCosts>(`${BASE}/${tenantIdOrSlug}/expenses/job-costs/${invoiceId}`);
}

export interface PayJobCostBody {
  kind: JobCostKind;
  amount: number;
  /** Required except for service_own_staff. */
  paid_from_account_id?: string;
  paid_at?: string;
  description?: string;
  /** Goods: what was bought (received into stock for the sale). */
  lines?: JobGoodsLine[];
  /** Goods: this completes the purchasing (the actual price may differ; the variance is posted). */
  close_after_pay?: boolean;
}

/**
 * Records a job cost: goods bought for the job (paid from a bank against Inventory), the accrued
 * service cost paid from a bank, or a service cost covered by own staff. Capped at what is unpaid.
 */
export function payInvoiceJobCost(tenantIdOrSlug: string, invoiceId: string, body: PayJobCostBody): Promise<Expense | { status: string }> {
  return apiClient.post<Expense | { status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/job-costs/${invoiceId}/pay`, body);
}

/** Completes (closed=true) or reopens the goods purchasing of a job. */
export function closeInvoiceJobGoods(tenantIdOrSlug: string, invoiceId: string, closed: boolean): Promise<InvoiceJobCosts> {
  return apiClient.post<InvoiceJobCosts>(`${BASE}/${tenantIdOrSlug}/expenses/job-costs/${invoiceId}/close`, { closed });
}

export function getExpense(tenantIdOrSlug: string, id: string): Promise<Expense> {
  return apiClient.get<Expense>(`${BASE}/${tenantIdOrSlug}/expenses/${id}`);
}

export function createExpense(tenantIdOrSlug: string, data: CreateExpenseRequest): Promise<Expense> {
  return apiClient.post<Expense>(`${BASE}/${tenantIdOrSlug}/expenses`, data);
}

// Edits a draft expense. The backend rejects (409) any non-draft expense — the
// caller should surface that via the rejected promise (err.response.status === 409).
export function updateExpense(
  tenantIdOrSlug: string,
  id: string,
  data: UpdateExpenseRequest,
): Promise<Expense> {
  return apiClient.put<Expense>(`${BASE}/${tenantIdOrSlug}/expenses/${id}`, data);
}

// Deletes a draft expense. Returns { status: 'deleted' }. A non-draft or
// GL-posted expense responds 409 (handle err.response.status === 409).
export function deleteExpense(tenantIdOrSlug: string, id: string): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}`);
}

/** Submit and approve pass through the budget check: a Stop answers 409 over_budget unless a
 *  budget approver re-sends with override (see overBudgetOf / OverBudgetDialog). */
export function submitExpense(tenantIdOrSlug: string, id: string, override?: boolean): Promise<{ status: string; budget?: BudgetCheckResult }> {
  return apiClient.post(`${BASE}/${tenantIdOrSlug}/expenses/${id}/submit`, undefined, { params: budgetOverrideParams(override) });
}

export function approveExpense(tenantIdOrSlug: string, id: string, override?: boolean): Promise<{ status: string; budget?: BudgetCheckResult }> {
  return apiClient.post(`${BASE}/${tenantIdOrSlug}/expenses/${id}/approve`, undefined, { params: budgetOverrideParams(override) });
}

export function rejectExpense(tenantIdOrSlug: string, id: string, reason?: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/reject`, { reason });
}

export function reimburseExpense(tenantIdOrSlug: string, id: string, paymentIntentId: string, paidAt?: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/reimburse`, { payment_intent_id: paymentIntentId, paid_at: paidAt });
}

// payExpense settles a direct business expense: posts DR Accounts Payable / CR the chosen cash/bank
// account and marks it paid. paid_from_account_id = the cash/bank GL account the money left (omit
// for the tenant default); payment_intent_id = only when paid through a gateway; paid_at = when the
// money actually changed hands (omit to default to now — backdating support).
export function payExpense(
  tenantIdOrSlug: string,
  id: string,
  body?: { paid_from_account_id?: string; payment_intent_id?: string; paid_at?: string },
): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/pay`, body ?? {});
}

// reconcileExpenseJournals posts any missing GL journals for approved/paid expenses (idempotent).
export function reconcileExpenseJournals(tenantIdOrSlug: string): Promise<{ scanned: number; accruals_posted: number; settlements_posted: number; skipped_no_account: number }> {
  return apiClient.post(`${BASE}/${tenantIdOrSlug}/expenses/reconcile-journals`, {});
}

export function getExpenseCategories(tenantIdOrSlug: string): Promise<CategoriesResponse> {
  return apiClient.get<CategoriesResponse>(`${BASE}/${tenantIdOrSlug}/expense-categories`);
}

export function createExpenseCategory(tenantIdOrSlug: string, data: CreateCategoryRequest): Promise<ExpenseCategory> {
  return apiClient.post<ExpenseCategory>(`${BASE}/${tenantIdOrSlug}/expense-categories`, data);
}

export function updateExpenseCategory(
  tenantIdOrSlug: string,
  id: string,
  data: UpdateCategoryRequest,
): Promise<ExpenseCategory> {
  return apiClient.put<ExpenseCategory>(`${BASE}/${tenantIdOrSlug}/expense-categories/${id}`, data);
}

// Returns { status: 'deleted' } on hard delete. When the category is referenced by
// existing expenses the backend responds 409 and soft-deactivates it instead — the
// caller should surface that via the rejected promise (err.response.status === 409).
export function deleteExpenseCategory(tenantIdOrSlug: string, id: string): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expense-categories/${id}`);
}
