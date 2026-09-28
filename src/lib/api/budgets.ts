/**
 * Budgets API client (treasury-api modules/budgets).
 *
 * Budgets are planned revenue and spend per chart account, optionally narrowed to a cost centre
 * and/or project, phased by month. Lifecycle: draft -> submitted -> approved -> active -> closed;
 * an approved budget changes through a revision (new version). Actuals come live from the booked
 * ledger, commitments from sent purchase orders, submitted expenses and pending staff claims.
 * Money arrives as decimal strings; use `num()` to read it.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

export type Money = number | string;
export const num = (v: Money | undefined | null): number => (v == null || v === '' ? 0 : Number(v) || 0);

export type BudgetStatus = 'draft' | 'submitted' | 'approved' | 'active' | 'closed' | 'rejected' | 'revised' | 'cancelled';
export type BudgetType = 'operating' | 'capex' | 'project' | 'cash' | 'revenue' | 'forecast';
export type LineCategory = 'expense' | 'revenue' | 'capex' | 'other';
export type ControlAction = 'stop' | 'warn' | 'ignore';

export interface BudgetControl {
  on_actual: ControlAction;
  on_commitment: ControlAction;
  basis: 'annual' | 'ytd_cumulative';
}

export interface BudgetLine {
  id: string;
  category: LineCategory;
  name: string;
  planned_amount: Money;
  actual_amount: Money;
  committed: Money;
  available: Money;
  variance: Money;
  notes?: string;
  account_id?: string;
  cost_center_id?: string;
  project_id?: string;
  period_amounts?: Record<string, Money>;
  sort_order: number;
}

export interface BudgetTotals {
  planned_expense: Money;
  actual_expense: Money;
  committed_expense: Money;
  planned_revenue: Money;
  actual_revenue: Money;
  utilisation_pct: number;
  elapsed_pct: number;
}

export interface Budget {
  id: string;
  tenant_id: string;
  name: string;
  fiscal_year?: string;
  budget_type: BudgetType;
  period_type: 'monthly' | 'quarterly' | 'annual';
  start_date: string;
  end_date: string;
  total_amount: Money;
  currency: string;
  status: BudgetStatus;
  version: number;
  revision_of_id?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  parent_budget_id?: string;
  project_id?: string;
  control: BudgetControl;
  alert_thresholds: number[];
  metadata?: Record<string, unknown>;
  totals: BudgetTotals;
  lines?: BudgetLine[];
  created_at: string;
  updated_at: string;
}

export interface BudgetLineInput {
  category: LineCategory;
  name: string;
  planned_amount: number;
  notes?: string;
  account_id?: string;
  cost_center_id?: string;
  project_id?: string;
  period_amounts?: Record<string, number>;
}

export interface BudgetInput {
  name: string;
  fiscal_year?: string;
  budget_type?: BudgetType;
  period_type?: 'monthly' | 'quarterly' | 'annual';
  start_date: string;
  end_date: string;
  currency?: string;
  parent_budget_id?: string;
  project_id?: string;
  control?: BudgetControl;
  alert_thresholds?: number[];
  lines: BudgetLineInput[];
}

export interface MonthFigure {
  month: string;
  planned: Money;
  actual: Money;
  committed: Money;
  cum_planned: Money;
  cum_actual: Money;
}

export interface VarianceLine extends BudgetLine {
  planned_to_date: Money;
  theoretical: Money;
  variance_to_date: Money;
  variance_pct: number;
  favourable: boolean;
  forecast_plan: Money;
  forecast_run_rate: Money;
  utilisation_pct: number;
  months: MonthFigure[];
}

export interface BudgetVariance {
  budget: Budget;
  as_of: string;
  current_month: string;
  lines: VarianceLine[];
  months: MonthFigure[];
  children?: { id: string; name: string; status: string; project_id?: string; totals: BudgetTotals; planned: Money }[];
  summary: {
    expense_planned: Money;
    expense_planned_to_date: Money;
    expense_actual: Money;
    expense_committed: Money;
    expense_forecast: Money;
    revenue_planned: Money;
    revenue_planned_to_date: Money;
    revenue_actual: Money;
    revenue_forecast: Money;
    lines_over_budget: number;
  };
}

export interface Commitment {
  id: string;
  source_type: 'purchase_order' | 'vendor_bill' | 'expense' | 'expense_claim';
  source_id: string;
  source_ref?: string;
  account_id?: string;
  cost_center_id?: string;
  project_id?: string;
  amount: Money;
  currency: string;
  amount_kes: Money;
  commit_date: string;
  status: 'open' | 'consumed' | 'released';
}

export interface BudgetCheckLine {
  budget_id: string;
  budget_name: string;
  budget_line_id: string;
  line_name: string;
  basis: string;
  planned: Money;
  actual: Money;
  committed: Money;
  available: Money;
  requested: Money;
  action: 'ok' | 'warn' | 'stop';
}

export interface BudgetCheckResult {
  action: 'ok' | 'warn' | 'stop';
  lines: BudgetCheckLine[];
}

/** The budget result of a 409 over_budget answer, or null for any other error. */
export function overBudgetOf(err: unknown): BudgetCheckResult | null {
  const res = (err as { response?: { status?: number; data?: { code?: string; budget?: BudgetCheckResult } } })?.response;
  return res?.status === 409 && res.data?.code === 'over_budget' && res.data.budget ? res.data.budget : null;
}

/** A budget warning attached to a successful response ({ budget: { action: "warn" } }), if any. */
export function budgetWarningOf(body: unknown): BudgetCheckResult | null {
  const b = (body as { budget?: BudgetCheckResult } | null)?.budget;
  return b && b.action === 'warn' ? b : null;
}

/** Query params that ask the server to push a stopped spend through (budget approvers only). */
export const budgetOverrideParams = (override?: boolean) => (override ? { override_budget: 'true' } : undefined);

export interface ListBudgetsParams {
  status?: string;
  budget_type?: string;
  project_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const path = (tenant: string, rest = '') => `${BASE}/${tenant}/budgets${rest}`;

/** Unwraps the shared pagination envelope ({ data, total, ... }). */
export async function listBudgets(tenant: string, params?: ListBudgetsParams): Promise<{ budgets: Budget[]; total: number }> {
  const raw = await apiClient.get<{ data?: Budget[]; total?: number }>(path(tenant), params);
  return { budgets: raw?.data ?? [], total: Number(raw?.total ?? 0) };
}

export const getBudget = (tenant: string, id: string) => apiClient.get<Budget>(path(tenant, `/${id}`));
export const createBudget = (tenant: string, body: BudgetInput) => apiClient.post<Budget>(path(tenant), body);
export const updateBudget = (tenant: string, id: string, body: BudgetInput) => apiClient.put<Budget>(path(tenant, `/${id}`), body);
export const deleteBudget = (tenant: string, id: string) => apiClient.delete<void>(path(tenant, `/${id}`));
export const submitBudget = (tenant: string, id: string) =>
  apiClient.post<{ budget: Budget; approval_required: boolean; status: string }>(path(tenant, `/${id}/submit`));
export const approveBudget = (tenant: string, id: string) => apiClient.post<Budget>(path(tenant, `/${id}/approve`));
export const rejectBudget = (tenant: string, id: string, reason: string) =>
  apiClient.post<Budget>(path(tenant, `/${id}/reject`), { reason });
export const reviseBudget = (tenant: string, id: string) => apiClient.post<Budget>(path(tenant, `/${id}/revise`));
export const cancelBudget = (tenant: string, id: string) => apiClient.post<Budget>(path(tenant, `/${id}/cancel`));
export const closeBudget = (tenant: string, id: string) => apiClient.post<Budget>(path(tenant, `/${id}/close`));
export const copyBudget = (
  tenant: string,
  id: string,
  body: { name?: string; start_date: string; end_date: string; growth_pct?: number; from_actuals?: boolean },
) => apiClient.post<Budget>(path(tenant, `/${id}/copy`), body);
export const getBudgetVariance = (tenant: string, id: string) => apiClient.get<BudgetVariance>(path(tenant, `/${id}/variance`));

/** Booked amount per month on an account (KES, child accounts included), for seasonal spreads. */
export async function getAccountHistory(tenant: string, accountId: string, from: string, to: string): Promise<{ month: string; amount: number }[]> {
  const raw = await apiClient.get<{ data?: { month: string; amount: Money }[] }>(path(tenant, '/account-history'), { account_id: accountId, from, to });
  return (raw?.data ?? []).map((m) => ({ month: m.month, amount: num(m.amount) }));
}

export async function listCommitments(
  tenant: string,
  params?: { status?: string; project_id?: string; cost_center_id?: string; account_id?: string; page?: number; limit?: number },
): Promise<{ commitments: Commitment[]; total: number }> {
  const raw = await apiClient.get<{ data?: Commitment[]; total?: number }>(`${BASE}/${tenant}/budget-commitments`, params);
  return { commitments: raw?.data ?? [], total: Number(raw?.total ?? 0) };
}
