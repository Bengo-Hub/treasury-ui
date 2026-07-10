/**
 * Expenses & Categories API.
 * Base path: /api/v1/{tenantIdOrSlug}
 */

import { apiClient } from './client';

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
  status: string; // draft, submitted, approved, rejected, reimbursed, cancelled
  submitted_by: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  receipt_url?: string;
  vendor_id?: string;
  account_id?: string;
  cost_center_id?: string;
  payment_intent_id?: string;
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
  source_service?: string;
  // invoice_id + billable power the per-invoice linked-cost / margin view.
  invoice_id?: string;
  billable?: boolean;
  limit?: number;
  offset?: number;
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

export function submitExpense(tenantIdOrSlug: string, id: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/submit`);
}

export function approveExpense(tenantIdOrSlug: string, id: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/approve`);
}

export function rejectExpense(tenantIdOrSlug: string, id: string, reason?: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/reject`, { reason });
}

export function reimburseExpense(tenantIdOrSlug: string, id: string, paymentIntentId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/reimburse`, { payment_intent_id: paymentIntentId });
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
