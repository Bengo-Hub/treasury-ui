import { apiClient } from './client';

const BASE = '/api/v1';

export interface ServiceConfig {
  id: string;
  config_key: string;
  config_value: string;
  config_type: string;
  created_at: string;
  updated_at: string;
}

/** List all settings for a tenant. */
export async function listSettings(tenantSlug: string): Promise<{ settings: ServiceConfig[] }> {
  return apiClient.get<{ settings: ServiceConfig[] }>(`${BASE}/${tenantSlug}/settings`);
}

/** Update (upsert) a single setting by key. */
export async function updateSetting(
  tenantSlug: string,
  key: string,
  value: any,
  configType?: string,
): Promise<ServiceConfig> {
  return apiClient.put<ServiceConfig>(`${BASE}/${tenantSlug}/settings/${key}`, {
    config_value: JSON.stringify(value),
    config_type: configType || 'string',
  });
}

/** Delete a setting by key. */
export async function deleteSetting(tenantSlug: string, key: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`${BASE}/${tenantSlug}/settings/${key}`);
}

// ── Fiscal Year ───────────────────────────────────────────────────────────────

export interface FiscalYearConfig {
  /** 1-12 (1 = January). */
  start_month: number;
  /** 1-28 (day of the start month). */
  start_day: number;
  /** Derived label of the current fiscal year, e.g. "FY2026" or "FY2025-2026". */
  fy_label: string;
  /** Inclusive start date of the current fiscal year (YYYY-MM-DD). */
  fy_start: string;
  /** Inclusive last date of the current fiscal year (YYYY-MM-DD). */
  fy_end: string;
  /** Selectable presets (Calendar Jan-Dec, Government Jul-Jun) for quick-select. */
  presets?: { key: string; label: string; start_month: number; start_day: number; description?: string }[];
}

/** Read the tenant's fiscal-year config + the derived current FY window. */
export async function getFiscalYear(tenantSlug: string): Promise<FiscalYearConfig> {
  return apiClient.get<FiscalYearConfig>(`${BASE}/${tenantSlug}/settings/fiscal-year`);
}

/** Upsert the tenant's fiscal-year config (start month/day). */
export async function updateFiscalYear(
  tenantSlug: string,
  body: { start_month: number; start_day: number },
): Promise<FiscalYearConfig> {
  return apiClient.put<FiscalYearConfig>(`${BASE}/${tenantSlug}/settings/fiscal-year`, body);
}

// ── Fiscal Year-End Close ───────────────────────────────────────────────────────

/** One proposed (or posted) journal line of the close. Amounts are pre-formatted strings. */
export interface FYProposedLine {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: string;
  credit: string;
}

export interface FYPeriodRef {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

/** Write-free preview of a fiscal-year close. */
export interface FYClosePreview {
  fiscal_year: number;
  fiscal_year_label: string;
  fy_start: string;
  fy_end: string;
  next_fy_start: string;
  closing_lines: FYProposedLine[];
  total_revenue: string;
  total_expense: string;
  net_income: string;
  closing_total_debit: string;
  closing_total_credit: string;
  opening_lines: FYProposedLine[];
  opening_total_debit: string;
  opening_total_credit: string;
  periods_to_close: FYPeriodRef[];
  already_closed: boolean;
  warning?: string;
}

export interface FYCloseResult {
  fiscal_year: number;
  fiscal_year_label: string;
  closing_entry_id?: string;
  closing_entry_number?: string;
  opening_entry_id?: string;
  net_income: string;
  periods_closed: number;
  reference: string;
  already_closed: boolean;
}

/** GET the write-free close preview for a fiscal year (YYYY = year the FY ends). */
export async function getFYClosePreview(
  tenantSlug: string,
  fiscalYear: number,
): Promise<FYClosePreview> {
  return apiClient.get<FYClosePreview>(
    `${BASE}/${tenantSlug}/fiscal-year/close-preview?fiscal_year=${fiscalYear}`,
  );
}

/** POST the close. confirm:true actually posts; otherwise it is a dry-run (returns preview). */
export async function postFYClose(
  tenantSlug: string,
  body: { fiscal_year: number; confirm: boolean; post_opening_balances?: boolean },
): Promise<FYCloseResult> {
  return apiClient.post<FYCloseResult>(`${BASE}/${tenantSlug}/fiscal-year/close`, body);
}
