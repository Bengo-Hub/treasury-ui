/**
 * Reports API client (treasury-api).
 * Covers P&L, balance sheet, cash flow, and tax summary reports.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

/**
 * Fiscal-period selectors shared by the period-aware reports. Mirrors the
 * treasury-api contract (precedence: period > fiscal_year/fy > from/to). A
 * report request may carry any one basis; the backend resolves the window and
 * echoes the chosen context back on the response (see ReportFiscalContext).
 */
export interface ReportFiscalParams {
  /** accounting_period_id — highest precedence. */
  period?: string;
  /** explicit fiscal year, e.g. "2025". */
  fiscal_year?: string;
  /** relative fiscal year. */
  fy?: 'current' | 'previous';
}

/**
 * Fiscal context echoed back by every period-aware report so the UI can show
 * which window was actually used and whether it is final (closed) or
 * provisional (open).
 */
export interface ReportFiscalContext {
  /** fiscal-year label, present when resolved via fiscal_year/fy. */
  fiscal_year?: string;
  /** accounting-period name, present when resolved via a period id. */
  period?: string;
  /** "open" (provisional) | "closed" (final). */
  period_status?: 'open' | 'closed';
  /** how the window was resolved by the backend. */
  window_source?: 'period' | 'fiscal_year' | 'date_range';
}

export interface ReportRow {
  account_code: string;
  account_name: string;
  amount: string;
}

export interface ReportSection {
  name: string;
  rows: ReportRow[];
  total: string;
}

export interface FinancialReport extends ReportFiscalContext {
  title: string;
  tenant_id: string;
  as_of: string;
  from?: string;
  to?: string;
  sections: ReportSection[];
  total?: string;
}

/**
 * A single named bucket in a P&L summary breakdown (expense category or cost
 * center). `amount` is a fixed-2 decimal string from the backend.
 */
export interface ProfitLossBreakdown {
  name: string;
  amount: string;
}

/**
 * Source-document P&L summary (non-ledger). Distinct from the double-entry
 * `getProfitLoss` statement: revenue is from paid invoices, COGS from vendor
 * bills, and expenses from approved Expense rows. All amounts are fixed-2
 * decimal strings — parse with Number() at the display site.
 */
export interface ProfitLossSummaryReport extends ReportFiscalContext {
  currency: string;
  from: string;
  to: string;
  total_revenue: string;
  total_expenses: string;
  cost_of_goods: string;
  gross_profit: string;
  net_profit: string;
  by_category: ProfitLossBreakdown[];
  by_cost_center: ProfitLossBreakdown[];

  /**
   * GL-based reconciliation (additive). These restate the same period from the
   * authoritative General Ledger so the UI can flag drift between the
   * source-document P&L above and the double-entry ledger.
   * `reconciliation_variance` = source-doc net_profit − gl_net_profit; ~0 means
   * the two views agree. All fixed-2 decimal strings.
   */
  gl_revenue: string;
  gl_expenses: string;
  gl_net_profit: string;
  reconciliation_variance: string;

  /**
   * Cash-basis view (collected income only) + the accrual→cash timing gap. `cash_revenue`
   * / `cash_net_profit` recognise only paid invoices; `outstanding_ar` is accrued-but-
   * uncollected revenue (shown as "Outstanding", NOT as a variance). All fixed-2 strings.
   */
  cash_revenue: string;
  cash_net_profit: string;
  outstanding_ar: string;
}

// ---- API Functions ----

/**
 * Window params for the date-range reports. The fiscal selectors
 * (period/fiscal_year/fy) are optional and take precedence over from/to on the
 * backend; when a fiscal basis is used, from/to may be omitted. All keys are
 * forwarded verbatim as query params.
 */
export type ReportRangeParams = ReportFiscalParams & { from?: string; to?: string };

export function getProfitLoss(
  tenantSlug: string,
  params: ReportRangeParams,
): Promise<FinancialReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/profit-loss`, params);
}

export function getBalanceSheet(
  tenantSlug: string,
  params?: ReportFiscalParams & { as_of?: string },
): Promise<FinancialReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/balance-sheet`, params);
}

export function getCashFlow(
  tenantSlug: string,
  params: ReportRangeParams,
): Promise<FinancialReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/cash-flow`, params);
}

export function getTaxSummary(
  tenantSlug: string,
  params: ReportRangeParams,
): Promise<FinancialReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/tax-summary`, params);
}

export function getProfitLossSummary(
  tenantSlug: string,
  params: ReportRangeParams & { currency?: string },
): Promise<ProfitLossSummaryReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/profit-loss-summary`, params);
}
