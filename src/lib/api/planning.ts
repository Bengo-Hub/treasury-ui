/**
 * Planning and BI API client (treasury-api modules/planning and modules/bi).
 *
 * Cash forecast: 13-week direct-method forecast with scenario knobs.
 * Rolling forecast: last 12 months actual plus up to 12 months forecast against the approved budget.
 * BI: profit and loss by cost centre or project, and a RAG overview of active budgets.
 * Money arrives as decimal strings; read it with `num()` from ./budgets.
 */

import { apiClient } from './client';
import type { Money } from './budgets';

const BASE = '/api/v1';

export interface CashForecastScenario {
  weeks?: number;
  collection_delay_days?: number;
  receipts_change_pct?: number;
  spend_change_pct?: number;
  minimum_cash?: number;
}

export interface CashWeek {
  start: string;
  end: string;
  opening: Money;
  trading_receipts: Money;
  collections: Money;
  supplier_payments: Money;
  direct_spend: Money;
  payroll: Money;
  statutory: Money;
  /** VAT or TOT on the 20th and income tax instalments. */
  tax: Money;
  net_flow: Money;
  closing: Money;
  below_minimum: boolean;
}

export interface CashForecast {
  as_of: string;
  currency: string;
  opening_cash: Money;
  weeks: CashWeek[];
  lowest_closing: Money;
  lowest_week: string;
  first_negative_week?: string;
  scenario: CashForecastScenario;
  assumptions: {
    weekly_trading_receipts: Money;
    weekly_direct_spend: Money;
    monthly_payroll_net: Money;
    monthly_statutory: Money;
    open_receivables: Money;
    open_payables: Money;
    trailing_weeks: number;
    tax_payments: { due: string; amount: Money; kind: 'vat' | 'tot' | 'instalment' }[];
  };
  method: string;
  warnings?: string[];
}

export interface RollingMonth {
  month: string;
  kind: 'actual' | 'forecast';
  revenue: Money;
  revenue_low?: Money;
  revenue_high?: Money;
  costs: Money;
  net_profit: Money;
  cash_balance: Money;
  budget_revenue: Money;
  budget_costs: Money;
  revenue_vs_budget: Money;
  costs_vs_budget: Money;
}

export interface RollingForecast {
  months: RollingMonth[];
  year_revenue: Money;
  year_budget: Money;
  year_net_profit: Money;
  has_budget: boolean;
  forecast_method: string;
}

export interface DimensionPnLRow {
  id: string | null;
  name: string;
  revenue: Money;
  cost_of_sales: Money;
  expenses: Money;
  gross_profit: Money;
  net_profit: Money;
  margin_pct: number | null;
  cost_share_pct: number;
}

export interface DimensionReport {
  by: 'cost_center' | 'project';
  from: string;
  to: string;
  rows: DimensionPnLRow[];
  total: DimensionPnLRow;
}

export interface UtilisationRow {
  budget_id: string;
  name: string;
  budget_type: string;
  project_id?: string;
  planned: Money;
  actual: Money;
  committed: Money;
  utilisation_pct: number;
  elapsed_pct: number;
  status: 'green' | 'amber' | 'red';
}

export const getCashForecast = (tenant: string, scenario?: CashForecastScenario) =>
  apiClient.get<CashForecast>(`${BASE}/${tenant}/planning/cash-forecast`, scenario);

export const getRollingForecast = (tenant: string, horizon = 12) =>
  apiClient.get<RollingForecast>(`${BASE}/${tenant}/planning/rolling-forecast`, { horizon });

export interface DimensionPnLParams {
  by: 'cost_center' | 'project';
  from?: string;
  to?: string;
  /** Narrows to one outlet (the header outlet filter). */
  outlet_id?: string;
}

export const getDimensionPnL = (tenant: string, params: DimensionPnLParams) =>
  apiClient.get<DimensionReport>(`${BASE}/${tenant}/reports/bi/dimension-pnl`, params);

export async function getBudgetUtilisation(tenant: string): Promise<UtilisationRow[]> {
  const raw = await apiClient.get<{ data?: UtilisationRow[] }>(`${BASE}/${tenant}/reports/bi/budget-utilisation`);
  return raw?.data ?? [];
}

export interface TaxPayment {
  due: string;
  kind: 'statutory' | 'vat' | 'tot' | 'wht' | 'instalment';
  amount: Money;
  basis: string;
}

export interface TaxCalendar {
  from: string;
  until: string;
  payments: TaxPayment[];
  by_month: Record<string, Money>;
  total: Money;
  warnings?: string[];
}

export const getTaxCalendar = (tenant: string, months: number) =>
  apiClient.get<TaxCalendar>(`${BASE}/${tenant}/planning/tax-calendar`, { months });

export interface SavedScenario extends Required<CashForecastScenario> {
  name: string;
  updated_by?: string;
  updated_at?: string;
}

export async function listScenarios(tenant: string): Promise<SavedScenario[]> {
  const raw = await apiClient.get<{ data?: SavedScenario[] }>(`${BASE}/${tenant}/planning/scenarios`);
  return raw?.data ?? [];
}

export async function saveScenario(tenant: string, scenario: SavedScenario): Promise<SavedScenario[]> {
  const raw = await apiClient.put<{ data?: SavedScenario[] }>(`${BASE}/${tenant}/planning/scenarios`, scenario);
  return raw?.data ?? [];
}

export async function deleteScenario(tenant: string, name: string): Promise<SavedScenario[]> {
  const raw = await apiClient.delete<{ data?: SavedScenario[] }>(`${BASE}/${tenant}/planning/scenarios?name=${encodeURIComponent(name)}`);
  return raw?.data ?? [];
}
