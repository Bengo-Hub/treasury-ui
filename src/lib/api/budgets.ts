/**
 * Budgets API client (treasury-api).
 * Covers budget creation, listing, detail, and approval.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

export interface BudgetLine {
  id: string;
  category: string;
  name: string;
  planned_amount: number | string;
  actual_amount: number | string;
  variance: number | string;
  notes?: string;
}

export interface Budget {
  id: string;
  tenant_id: string;
  name: string;
  fiscal_year?: string;
  start_date: string;
  end_date: string;
  total_amount: number | string;
  currency: string;
  status: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  lines?: BudgetLine[];
  created_at: string;
}

export interface CreateBudgetRequest {
  name: string;
  fiscal_year?: string;
  start_date: string;
  end_date: string;
  currency?: string;
  lines: { category: string; name: string; planned_amount: number; notes?: string }[];
}

// ---- API Functions ----

/**
 * treasury-api's list endpoints return the shared pagination envelope
 * (`{ data, total, limit, page, hasMore }`); unwrap it the same way
 * unwrapInvoiceList does in invoices.ts, tolerating the legacy `budgets` key too.
 */
export async function listBudgets(
  tenantSlug: string,
): Promise<{ budgets: Budget[]; total: number }> {
  const raw = await apiClient.get<any>(`${BASE}/${tenantSlug}/budgets`);
  return { budgets: raw?.budgets ?? raw?.data ?? [], total: Number(raw?.total ?? 0) };
}

export function createBudget(
  tenantSlug: string,
  body: CreateBudgetRequest,
): Promise<Budget> {
  return apiClient.post(`${BASE}/${tenantSlug}/budgets`, body);
}

export function getBudget(
  tenantSlug: string,
  budgetID: string,
): Promise<Budget> {
  return apiClient.get(`${BASE}/${tenantSlug}/budgets/${budgetID}`);
}

export function approveBudget(
  tenantSlug: string,
  budgetID: string,
): Promise<{ status: string }> {
  return apiClient.post(`${BASE}/${tenantSlug}/budgets/${budgetID}/approve`);
}

/** Recomputes each line's actual_amount from the posted ledger and returns the refreshed budget. */
export function recomputeBudgetActuals(
  tenantSlug: string,
  budgetID: string,
): Promise<Budget> {
  return apiClient.post(`${BASE}/${tenantSlug}/budgets/${budgetID}/recompute-actuals`);
}
