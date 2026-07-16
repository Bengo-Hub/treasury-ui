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

export interface EtimsTransmissionRecord {
  id: string;
  tenant_id: string;
  source: 'invoice' | 'pos_sale' | 'ordering_sale' | 'vendor_bill';
  invoice_id?: string;
  source_id?: string;
  transmission_status: 'pending' | 'transmitted' | 'failed' | 'retrying' | 'dead_letter';
  etims_cu_number?: string;
  etims_receipt_number?: string;
  rcpt_sign?: string;
  /** KRA eTIMS invoice number (invcNo) — the per-device sequential number. 0/absent = not assigned. */
  invc_no?: number;
  error_message?: string;
  retry_count: number;
  transmitted_at?: string;
  created_at: string;
}

// ---- KRA code lists (synced from eTIMS selectCodeList / selectItemClass) ----

/** Known code-list types: TAX_TY, ITEM_CLS, PKG_UNIT, QTY_UNIT, ITEM_TY, PMNT_TY, RFD_RSN, OBLIGATION. */
export interface KraCodeListEntry {
  code_type: string;
  code: string;
  name: string;
  code_detail?: string;
}

export function listEtimsCodeLists(
  tenantSlug: string,
  type: string,
  q?: string,
  limit?: number,
): Promise<{ codes: KraCodeListEntry[]; total: number }> {
  const qs = new URLSearchParams({ type });
  if (q) qs.set('q', q);
  if (limit) qs.set('limit', String(limit));
  return apiClient.get(`${BASE}/${tenantSlug}/tax/etims/code-lists?${qs}`);
}

// ---- Unified KRA eTIMS integration status ----

export interface KraStatus {
  platform: {
    oscu_configured: boolean;
    gavaconnect_configured: boolean;
    environment: string;
  };
  tenant: {
    kra_pin_set: boolean;
    device_registered: boolean;
    device_initialized: boolean;
    feature_entitled: boolean;
    activated: boolean;
    reason?: string;
  };
}

export function getKraStatus(tenantSlug: string): Promise<KraStatus> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/kra/status`);
}

// ---- Invoice fiscal evidence (KRA eTIMS receipt data recorded at transmission) ----

export interface InvoiceFiscalInfo {
  kra_pin: string;
  branch_id: string;
  device_serial: string;
  receipt_no: string;
  cu_invoice_no: string;
  internal_data?: string;
  signature?: string;
  invc_no?: number;
  qr_url?: string;
  transmitted_at?: string;
}

/** Fiscal info for a fiscalised invoice. Resolves to null on 404 (invoice not fiscalised). */
export async function getInvoiceFiscalInfo(
  tenantSlug: string,
  invoiceID: string,
): Promise<InvoiceFiscalInfo | null> {
  try {
    return await apiClient.get<InvoiceFiscalInfo>(`${BASE}/${tenantSlug}/tax/etims/fiscal/${invoiceID}`);
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

// ---- GavaConnect Types ----

export interface PINData {
  KRAPIN: string;
  TypeOfTaxpayer: string;
  Name: string;
  StatusOfPIN: string;
}

export interface PINResponse {
  ResponseCode?: string;
  Message?: string;
  Status?: string;
  PINDATA?: PINData;
  errorMessage?: string;
}

// PIN Checker by ID returns a FLAT payload (no PINDATA) — see backend GCPINByIDResponse.
export interface PINByIDResponse {
  TaxpayerPIN?: string;
  TaxpayerName?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export interface TCCData {
  KRAPIN: string;
  TCCNumber: string;
  TCCStatus: string;
  TCCIssueDate: string;
  TCCExpiryDate: string;
}

export interface TCCResponse {
  ResponseCode?: string;
  Message?: string;
  Status?: string;
  TCCData?: TCCData;
  errorMessage?: string;
}

export interface Obligation {
  obligationId: string;
  obligationName: string;
  obligationType: string; // NRM | SPL
}

export interface ObligationsResponse {
  ResponseCode?: string;
  ResponseMsg?: string;
  Status?: string;
  ObligationsList?: Obligation[];
  errorMessage?: string;
}

// KRA WHT PRN — nested header + details[] (taxObligation: WHTIT | WHTRENT | WHTVAT).
export interface WHTTransactionHeader {
  withholderPin: string;
  transactionUniqueNo: string;
  noOfTransactions: number;
  taxObligation?: string;
  taxPeriodFrom: string; // ISO 8601
  taxPeriodTo: string;
  totalGrossAmount: string;
  totalTaxAmount: string;
}

export interface WHTTransactionDetail {
  invoiceNo?: string;
  invoiceDate?: string;
  paymentDate?: string;
  grossAmount?: string;
  taxRate?: number;
  taxAmount?: number;
  // Income Tax
  natureOfTransaction?: string;
  residentialStatus?: string;
  country?: string;
  withholdeePin?: string;
  withholdeeName?: string;
  // Rental
  typeOfProperty?: string;
  landlordPin?: string;
  lrNumber?: string;
  building?: string;
  street?: string;
  town?: string;
}

export interface WHTPaymentRequest {
  transactionHeader: WHTTransactionHeader;
  transactionDetails: WHTTransactionDetail[];
}

export interface PRNResponse {
  responseCode?: string;
  responseDesc?: string;
  status?: string;
  responseData?: {
    prnNumber: string;
    prnDate: string;
    prnAmount: number;
  };
  errorMessage?: string;
}

export interface TOTReturnRequest {
  TAXPAYERDETAILS: {
    TaxpayerPIN: string;
    Month: string;
    Year: string;
    GrossTurnover: number;
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
  ResponseCode?: string;
  Message?: string;
  Status?: string;
  AckNumber?: string;
  PRN?: string;
  ComputedTax?: string;
  TaxPayable?: string;
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

// ---- Tax liabilities (PRN ledger) + M-Pesa remittance ----

export interface TaxLiability {
  id: string;
  obligation: string;
  prn_number: string;
  prn_amount: number;
  currency: string;
  status: 'unpaid' | 'submitted' | 'remitted' | 'failed';
  payout_reference?: string;
  withholder_pin?: string;
  generated_at?: string;
  remitted_at?: string;
}

export function listTaxLiabilities(
  tenantSlug: string,
  status?: string,
): Promise<{ items: TaxLiability[]; total: number }> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiClient.get(`${BASE}/${tenantSlug}/tax/liabilities${q}`);
}

// remitTaxLiability disburses a PRN to the KRA PayBill via M-Pesa B2B. It is approval+OTP gated:
// a 409 response ({ error: 'approval_required', approval_request_id }) means an approver must
// approve it (with OTP) in the Approvals inbox before it can be released.
export function remitTaxLiability(tenantSlug: string, liabilityID: string): Promise<TaxLiability> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/liabilities/${liabilityID}/remit`, {});
}

// initEtimsDevice initializes a device with KRA (fetching its CMC key). An optional
// cmcKey activates a device that is already installed at KRA (a fresh /initialize
// returns 902 and won't re-issue the key) — supply the key from the original init.
export function initEtimsDevice(tenantSlug: string, deviceId: string, cmcKey?: string): Promise<EtimsDevice> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/etims/devices/${deviceId}/init`, cmcKey ? { cmc_key: cmcKey } : {});
}

export function listEtimsTransmissions(
  tenantSlug: string,
  params?: { status?: string; limit?: number; offset?: number },
): Promise<{ transmissions: EtimsTransmissionRecord[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs}` : '';
  return apiClient.get(`${BASE}/${tenantSlug}/tax/etims/transmissions${query}`);
}

// retryTransmission requeues a failed OR dead_letter transmission record.
export function retryTransmission(tenantSlug: string, recordId: string): Promise<{ status: string }> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/etims/retry/${recordId}`);
}

export function refreshCodeLists(tenantSlug: string): Promise<{ status: string }> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/etims/code-lists/refresh`);
}

export function transmitVendorBill(tenantSlug: string, billId: string): Promise<{ status: string }> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/etims/transmit/bill/${billId}`);
}

// ---- GavaConnect: PIN & Compliance ----

export function validateKRAPIN(tenantSlug: string, pin: string): Promise<PINResponse> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/pin/validate`, { pin });
}

// taxpayerType is a KRA ID-type code: KE (Kenyan resident), NKE (non-Kenyan resident),
// NKENR (non-Kenyan non-resident), COMP (company) — NOT "Individual"/"Company".
export function lookupKRAPINByID(
  tenantSlug: string,
  idNumber: string,
  taxpayerType: string,
): Promise<PINByIDResponse> {
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

// ---- Tax eligibility / registration profile (Phase 2) ----

export interface EligibilityPosition {
  tenant_id: string;
  rolling_turnover_12m: string;
  currency: string;
  vat_threshold: string;
  vat_eligible: boolean;
  vat_registered: boolean;
  etims_activated: boolean;
  vat_compliant: boolean;
  auto_charge_vat: boolean;
  tot_eligible: boolean;
  tot_threshold_min: string;
  tot_threshold_max: string;
  kra_pin?: string;
  severity: 'ok' | 'info' | 'warning' | 'critical';
  warnings: string[];
  actions: string[];
}

export interface TaxProfile {
  id: string;
  tenant_id: string;
  kra_pin?: string;
  vat_registered: boolean;
  tot_registered: boolean;
  auto_charge_vat: boolean;
  etims_activated: boolean;
  registered_obligations?: { id: string; name: string; type: string }[];
  obligations_synced_at?: string;
}

export function getEligibilityPosition(tenantSlug: string): Promise<EligibilityPosition> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/eligibility-position`);
}

export function getTaxProfile(tenantSlug: string): Promise<TaxProfile> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/profile`);
}

export function updateTaxProfile(
  tenantSlug: string,
  body: Partial<Pick<TaxProfile, 'kra_pin' | 'vat_registered' | 'tot_registered' | 'auto_charge_vat'>>,
): Promise<TaxProfile> {
  return apiClient.put(`${BASE}/${tenantSlug}/tax/profile`, body);
}

export function syncTaxObligations(tenantSlug: string): Promise<TaxProfile> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/profile/sync-obligations`, {});
}

export interface ObligationPosition {
  obligation: string;
  categories: string[];
  frequency: string;
  next_due_date: string;
  days_until_due: number;
  overdue: boolean;
  amount_estimate?: string;
  penalty_rule?: string;
}

export interface TaxPositionEstimate {
  tenant_id: string;
  period_start: string;
  period_end: string;
  currency: string;
  vat_registered: boolean;
  output_vat: string;
  input_vat: string;
  vat_payable: string;
  tot_registered: boolean;
  tot_payable: string;
  obligations: ObligationPosition[];
  notes: string[];
}

export function getTaxPositionEstimate(tenantSlug: string): Promise<TaxPositionEstimate> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/position-estimate`);
}

export interface FlaggedExpense {
  source: string;
  reference: string;
  description: string;
  date: string;
  amount: string;
  tax_amount: string;
  reason: string;
}

export interface DeductionsSummary {
  tenant_id: string;
  period_start: string;
  period_end: string;
  currency: string;
  deductible_amount: string;
  at_risk_amount: string;
  non_deductible_amount: string;
  recoverable_input_vat: string;
  missed_input_vat: string;
  taxable_revenue: string;
  capital_allowance: string;
  estimated_taxable_profit: string;
  estimated_cit: string;
  estimated_tax_at_risk: string;
  cit_rate: string;
  flagged: FlaggedExpense[];
  notes: string[];
}

export function getDeductionsSummary(
  tenantSlug: string,
  params?: { from?: string; to?: string },
): Promise<DeductionsSummary> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const q = qs.toString() ? `?${qs}` : '';
  return apiClient.get(`${BASE}/${tenantSlug}/tax/deductions${q}`);
}

// ---- Capital allowances ----

export interface CAClassLine {
  class_code: string;
  class_name: string;
  rate: string;
  method: string;
  asset_count: number;
  pool_cost: string;
  opening_wdv: string;
  annual_allowance: string;
  closing_wdv: string;
}

export interface CapitalAllowanceSchedule {
  tenant_id: string;
  year: number;
  currency: string;
  classes: CAClassLine[];
  total_annual_allowance: string;
  notes: string[];
}

export interface CAAsset {
  id: string;
  name: string;
  description?: string;
  ca_class_code: string;
  method: string;
  cost: string;
  written_down_value: string;
  purchase_date: string;
  disposed: boolean;
  /** Set when this row was auto-synced from the inventory asset register. */
  source_asset_id?: string | null;
}

export interface CAClassOption {
  code: string;
  name: string;
  rate: string;
}

export function getCapitalAllowanceSchedule(tenantSlug: string): Promise<CapitalAllowanceSchedule> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/capital-allowances`);
}

export function listCAAssets(tenantSlug: string): Promise<{ assets: CAAsset[]; classes: CAClassOption[]; total: number }> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/capital-allowances/assets`);
}

export function createCAAsset(
  tenantSlug: string,
  body: { name: string; description?: string; ca_class_code: string; method?: string; cost: number; purchase_date?: string },
): Promise<CAAsset> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/capital-allowances/assets`, body);
}

export function deleteCAAsset(tenantSlug: string, assetID: string): Promise<{ status: string }> {
  return apiClient.delete(`${BASE}/${tenantSlug}/tax/capital-allowances/assets/${assetID}`);
}

/** Reclassify an asset's KRA class/method — used to classify UNCLASSIFIED auto-synced rows. */
export function updateCAAsset(
  tenantSlug: string,
  assetID: string,
  body: { ca_class_code?: string; method?: string; name?: string },
): Promise<CAAsset> {
  return apiClient.patch(`${BASE}/${tenantSlug}/tax/capital-allowances/assets/${assetID}`, body);
}

// ---- Structuring guidance ----

export interface StructuringOption {
  key: string;
  title: string;
  when_to_use: string;
  tax_treatment: string;
  documentation: string[];
  red_flags: string[];
}

export interface InterestCapResult {
  ebitda: string;
  gross_interest: string;
  cap_rate: string;
  interest_cap: string;
  allowed_interest: string;
  disallowed_interest: string;
  additional_tax: string;
  cit_rate: string;
  note: string;
}

export interface StructuringGuidance {
  tenant_id: string;
  options: StructuringOption[];
  interest_cap: InterestCapResult;
  notes: string[];
}

export function getStructuringGuidance(
  tenantSlug: string,
  params?: { ebitda?: number; gross_interest?: number },
): Promise<StructuringGuidance> {
  const qs = new URLSearchParams();
  if (params?.ebitda) qs.set('ebitda', String(params.ebitda));
  if (params?.gross_interest) qs.set('gross_interest', String(params.gross_interest));
  const q = qs.toString() ? `?${qs}` : '';
  return apiClient.get(`${BASE}/${tenantSlug}/tax/structuring${q}`);
}

// ---- VAT bad-debt relief (s.31) ----

export interface BadDebtReliefCandidate {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  total_amount: string;
  output_vat: string;
  recoverable_vat: string;
  payment_status: string;
  waiting_years: number;
  eligible_from: string;
  claim_deadline: string;
  days_until_eligible: number;
  status: 'eligible' | 'upcoming' | 'expired';
}

export interface BadDebtReliefSummary {
  tenant_id: string;
  currency: string;
  as_of: string;
  total_unpaid_with_vat: string;
  output_vat_at_risk: string;
  reclaimable_now: string;
  reclaimable_upcoming: string;
  expired_vat: string;
  candidates: BadDebtReliefCandidate[];
  notes: string[];
}

export function getBadDebtRelief(tenantSlug: string): Promise<BadDebtReliefSummary> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/bad-debt-relief`);
}

// ---- VAT-3 return prep (reconcile-before-file) ----

export interface VATReturnSummary {
  tenant_id: string;
  currency: string;
  period_start: string;
  period_end: string;
  output_vat: string;
  input_vat: string;
  whvat_withheld: string;
  net_vat_payable: string;
  gl_output_vat: string;
  gl_input_vat: string;
  gl_net_vat: string;
  reconciliation_variance: string;
  reconciled: boolean;
  due_date: string;
  notes: string[];
}

export function getVATReturnSummary(
  tenantSlug: string,
  params?: { from?: string; to?: string },
): Promise<VATReturnSummary> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const query = qs.toString() ? `?${qs}` : '';
  return apiClient.get(`${BASE}/${tenantSlug}/tax/vat-return${query}`);
}

// ---- eTIMS ↔ treasury reconciliation ----

export interface EtimsReconItem {
  receipt_no: string;
  invoice_no?: number;
  customer?: string;
  amount?: number;
  date?: string;
  source?: string;
}

export interface EtimsReconciliation {
  tenant_id: string;
  as_of: string;
  last_req_dt: string;
  configured: boolean;
  kra_sales_count: number;
  kra_sales_total: number;
  treasury_transmitted_count: number;
  matched_count: number;
  only_in_kra: EtimsReconItem[];
  only_in_treasury: EtimsReconItem[];
  in_sync: boolean;
  notes: string[];
}

export function getEtimsReconciliation(tenantSlug: string, lastReqDt?: string): Promise<EtimsReconciliation> {
  const q = lastReqDt ? `?lastReqDt=${encodeURIComponent(lastReqDt)}` : '';
  return apiClient.get(`${BASE}/${tenantSlug}/tax/etims/reconcile${q}`);
}

// ---- VAT bad-debt relief claim (write-off) ----

export function claimVATRelief(tenantSlug: string, invoiceID: string): Promise<unknown> {
  return apiClient.post(`${BASE}/${tenantSlug}/invoices/${invoiceID}/write-off-vat`);
}

// ---- Statutory rate reference + compliance calendar ----

export interface StatutoryRate {
  category: string;
  code: string;
  name: string;
  jurisdiction: string;
  rate: number | string;
  rate_type: string;
  filing_frequency?: string;
  obligation_code?: string;
  notes?: string;
  source?: string;
  effective_from?: string;
  threshold_min?: number | string;
  threshold_max?: number | string;
  due_day?: number;
}

export interface ComplianceCalendarItem {
  obligation: string;
  frequency: string;
  due_day?: number;
  next_due_date: string;
  categories: string[];
  note?: string;
}

export function listStatutoryRates(tenantSlug: string, category?: string): Promise<{ rates: StatutoryRate[]; total: number }> {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiClient.get(`${BASE}/${tenantSlug}/tax/statutory-rates${q}`);
}

export function getComplianceCalendar(tenantSlug: string): Promise<{ items: ComplianceCalendarItem[]; total: number }> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/compliance-calendar`);
}

// ---- eTIMS item master (KRA item registration — prerequisite for sales transmission) ----

export interface EtimsItem {
  id: string;
  item_cd: string;
  item_cls_cd?: string;
  item_nm: string;
  item_ty_cd?: string;
  tax_ty_cd?: string;
  pkg_unit_cd?: string;
  qty_unit_cd?: string;
  dft_prc?: number;
  registered: boolean;
  last_synced_at?: string;
}

export interface RegisterEtimsItemRequest {
  item_cd: string;
  item_nm: string;
  item_cls_cd?: string;
  item_ty_cd?: string;
  tax_ty_cd?: string;
  pkg_unit_cd?: string;
  qty_unit_cd?: string;
  dft_prc?: number;
}

export function listEtimsItems(tenantSlug: string): Promise<{ items: EtimsItem[]; total: number }> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/etims/items`);
}

export function registerEtimsItem(tenantSlug: string, body: RegisterEtimsItemRequest): Promise<EtimsItem> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/etims/items`, body);
}

// ---- eTIMS historical import + VAA reconciliation ----

export interface EtimsImportResult {
  sales_pulled: number;
  sales_new: number;
  purchases_pulled: number;
  purchases_new: number;
  from_cursor: string;
  to_cursor: string;
  notes: string[];
}

export interface VAAReconciliation {
  imported_sales: number;
  imported_purchases: number;
  matched_purchases: number;
  unmatched_purchases: number;
  kra_input_vat: string;
  treasury_input_vat: string;
  input_vat_variance: string;
  overclaim_risk: boolean;
  last_import_cursor: string;
  notes: string[];
}

export function importEtimsTransactions(tenantSlug: string): Promise<EtimsImportResult> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/etims/import`);
}

export function getVAAReconciliation(tenantSlug: string): Promise<VAAReconciliation> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/etims/vaa`);
}

// ---- WHVAT certificates received (withholding-VAT credit) ----

export interface WHVATCertificate {
  id: string;
  certificate_no: string;
  withholder_pin?: string;
  withholder_name?: string;
  invoice_number?: string;
  taxable_amount?: number | string;
  withheld_amount: number | string;
  cert_date?: string;
  status: string;
}

export interface CreateWHVATRequest {
  certificate_no: string;
  withholder_pin?: string;
  withholder_name?: string;
  invoice_number?: string;
  taxable_amount?: number;
  withheld_amount?: number;
  cert_date?: string;
  notes?: string;
}

export function listWHVATCertificates(tenantSlug: string): Promise<{ certificates: WHVATCertificate[]; total: number }> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/whvat`);
}

export function createWHVATCertificate(tenantSlug: string, body: CreateWHVATRequest): Promise<WHVATCertificate> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/whvat`, body);
}

export function deleteWHVATCertificate(tenantSlug: string, certID: string): Promise<{ deleted: boolean }> {
  return apiClient.delete(`${BASE}/${tenantSlug}/tax/whvat/${certID}`);
}

// ---- imported eTIMS transactions list ----

export interface EtimsImportedTxn {
  id: string;
  direction: 'sale' | 'purchase';
  invc_no: number;
  rcpt_no?: string;
  party_tin?: string;
  party_name?: string;
  doc_date?: string;
  tot_amt?: number | string;
  tot_tax_amt?: number | string;
  rcpt_ty_cd?: string;
  matched: boolean;
  imported_at: string;
}

export function listImportedEtimsTxns(tenantSlug: string, direction?: string): Promise<{ items: EtimsImportedTxn[]; total: number }> {
  const q = direction ? `?direction=${encodeURIComponent(direction)}` : '';
  return apiClient.get(`${BASE}/${tenantSlug}/tax/etims/imported${q}`);
}

// ---- KRA verification checkers (GavaConnect) ----

// VAT exemption checker takes a certificate NUMBER (not a PIN).
export function checkVATExemption(tenantSlug: string, certificateNo: string): Promise<any> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/exemption/vat`, { certificate_no: certificateNo });
}

export function checkITExemption(tenantSlug: string, pin: string): Promise<any> {
  return apiClient.post(`${BASE}/${tenantSlug}/tax/kra/exemption/it`, { pin });
}

export function getTaxServiceOffice(tenantSlug: string, pin: string): Promise<any> {
  return apiClient.get(`${BASE}/${tenantSlug}/tax/kra/office/${encodeURIComponent(pin)}`);
}
