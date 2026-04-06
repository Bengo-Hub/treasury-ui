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
