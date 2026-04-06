/**
 * Tax API client (treasury-api).
 * Covers tax codes, tax periods, and eTIMS device management.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

export interface TaxCode {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  rate: number | string;
  tax_type: string;
  kra_code?: string;
  is_default: boolean;
  is_active: boolean;
}

export interface CreateTaxCodeRequest {
  code: string;
  name: string;
  rate: number;
  tax_type: string;
  kra_code?: string;
}

export interface TaxPeriod {
  id: string;
  tenant_id: string;
  period_type: string;
  start_date: string;
  end_date: string;
  status: string;
  total_collected: number | string;
  total_payable: number | string;
  kra_filing_reference?: string;
  sync_status: string;
  filed_at?: string;
}

export interface EtimsDevice {
  id: string;
  tenant_id: string;
  device_serial: string;
  branch_id?: string;
  cmc_key?: string;
  status: string;
  last_heartbeat?: string;
}

export interface RegisterDeviceRequest {
  device_serial: string;
  branch_id?: string;
}

// ---- API Functions ----

export function listTaxCodes(
  tenantSlug: string,
): Promise<{ tax_codes: TaxCode[]; total: number }> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/codes`);
}

export function createTaxCode(
  tenantSlug: string,
  body: CreateTaxCodeRequest,
): Promise<TaxCode> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/codes`, body);
}

export function listTaxPeriods(
  tenantSlug: string,
): Promise<{ periods: TaxPeriod[]; total: number }> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/periods`);
}

export function calculateTaxLiability(
  tenantSlug: string,
  periodID: string,
): Promise<TaxPeriod> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/periods/${periodID}/calculate`);
}

export function listEtimsDevices(
  tenantSlug: string,
): Promise<{ devices: EtimsDevice[]; total: number }> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/etims/devices`);
}

export function registerEtimsDevice(
  tenantSlug: string,
  body: RegisterDeviceRequest,
): Promise<EtimsDevice> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/etims/devices`, body);
}
