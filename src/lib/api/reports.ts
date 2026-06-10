/**
 * Reports API client (treasury-api).
 * Covers P&L, balance sheet, cash flow, and tax summary reports.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

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

export interface FinancialReport {
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
export interface ProfitLossSummaryReport {
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
}

// ---- API Functions ----

export function getProfitLoss(
  tenantSlug: string,
  params: { from: string; to: string },
): Promise<FinancialReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/profit-loss`, params);
}

export function getBalanceSheet(
  tenantSlug: string,
  params?: { as_of?: string },
): Promise<FinancialReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/balance-sheet`, params);
}

export function getCashFlow(
  tenantSlug: string,
  params: { from: string; to: string },
): Promise<FinancialReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/cash-flow`, params);
}

export function getTaxSummary(
  tenantSlug: string,
  params: { from: string; to: string },
): Promise<FinancialReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/tax-summary`, params);
}

export function getProfitLossSummary(
  tenantSlug: string,
  params: { from: string; to: string; currency?: string },
): Promise<ProfitLossSummaryReport> {
  return apiClient.get(`${BASE}/${tenantSlug}/reports/profit-loss-summary`, params);
}
