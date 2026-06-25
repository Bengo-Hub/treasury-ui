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
