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
  tin?: string;
  branch_id?: string;
  cmc_key?: string;
  environment: string;
  last_invoice_no: number;
  status: string;
  last_heartbeat?: string;
}

export interface RegisterDeviceRequest {
  device_serial: string;
  branch_id?: string;
  tin?: string;
  environment?: string;
}

// ---- GavaConnect Types ----

export interface PINData {
  KRAPIN: string;
  TypeOfTaxpayer: string;
  Name: string;
  StatusOfPIN: string;
}

export interface PINResponse {
  PINDATA?: PINData;
  ErrorMessage?: string;
}

export interface TCCData {
  Number: string;
  Status: string;
  ExpiryDate: string;
  IssuedDate: string;
  TaxpayerName: string;
}

export interface TCCResponse {
  TCCDATA?: TCCData;
  ErrorMessage?: string;
}

export interface Obligation {
  ObligationCode: string;
  ObligationDescription: string;
  DueDate: string;
  Amount: number;
  Status: string;
}

export interface ObligationsResponse {
  OBLIGATIONS?: Obligation[];
  ErrorMessage?: string;
}

export interface WHTPaymentRequest {
  WithholdeePIN: string;
  WithholderPIN: string;
  Amount: number;
  PaymentPeriod: string;
  PaymentDate: string;
}

export interface PRNResponse {
  PRN: string;
  Amount: number;
  PaymentSlip?: {
    SlipNumber: string;
    GeneratedDate: string;
    ExpiryDate: string;
  };
  ErrorMessage?: string;
}

export interface TOTReturnRequest {
  TAXPAYERDETAILS: {
    TaxpayerPIN: string;
    Period: string;
    TurnoverAmount: number;
    TaxAmount: number;
    ObligationCode: string;
  };
}

export interface NILReturnRequest {
  TAXPAYERDETAILS: {
    TaxpayerPIN: string;
    ObligationCode: string;
    Month: string;
    Year: string;
    ReturnType: string;
  };
}

export interface ReturnResponse {
  AcknowledgementNumber?: string;
  Status?: string;
  Message?: string;
  ErrorMessage?: string;
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

export function initEtimsDevice(tenantSlug: string, deviceId: string): Promise<EtimsDevice> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/etims/devices/${deviceId}/init`);
}

// ---- GavaConnect: PIN & Compliance ----

export function validateKRAPIN(tenantSlug: string, pin: string): Promise<PINResponse> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/pin/validate`, { pin });
}

export function lookupKRAPINByID(
  tenantSlug: string,
  idNumber: string,
  taxpayerType: string,
): Promise<PINResponse> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/pin/lookup`, {
    id_number: idNumber,
    taxpayer_type: taxpayerType,
  });
}

export function checkTaxCompliance(
  tenantSlug: string,
  pin: string,
  tccNumber?: string,
): Promise<TCCResponse> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/compliance/check`, { pin, tcc_number: tccNumber });
}

export function getTaxpayerObligations(tenantSlug: string, pin: string): Promise<ObligationsResponse> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/kra/obligations/${pin}`);
}

// ---- GavaConnect: WHT PRN Generation ----

export function generateRentalWHTPRN(
  tenantSlug: string,
  req: WHTPaymentRequest,
): Promise<PRNResponse> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/wht/rental/prn`, req);
}

export function generateIncomeTaxWHTPRN(
  tenantSlug: string,
  req: WHTPaymentRequest,
): Promise<PRNResponse> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/wht/income-tax/prn`, req);
}

export function generateVATWHTPRN(
  tenantSlug: string,
  req: WHTPaymentRequest,
): Promise<PRNResponse> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/wht/vat/prn`, req);
}

// ---- GavaConnect: Tax Return Filing ----

export function fileTOTReturn(tenantSlug: string, req: TOTReturnRequest): Promise<ReturnResponse> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/filing/tot`, req);
}

export function fileNILReturn(tenantSlug: string, req: NILReturnRequest): Promise<ReturnResponse> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/filing/nil`, req);
}
