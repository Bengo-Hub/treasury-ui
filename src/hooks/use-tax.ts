import * as taxApi from '@/lib/api/tax';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useTaxCodes(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-codes', tenantSlug],
    queryFn: () => taxApi.listTaxCodes(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useCreateTaxCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, data }: { tenantSlug: string; data: taxApi.CreateTaxCodeRequest }) =>
      taxApi.createTaxCode(tenantSlug, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tax-codes', vars.tenantSlug] });
      toast.success('Tax code created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create tax code'),
  });
}

export function useTaxPeriods(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-periods', tenantSlug],
    queryFn: () => taxApi.listTaxPeriods(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useCalculateTaxLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, periodID }: { tenantSlug: string; periodID: string }) =>
      taxApi.calculateTaxLiability(tenantSlug, periodID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tax-periods', vars.tenantSlug] });
      toast.success('Tax liability calculated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to calculate tax'),
  });
}

export function useEtimsDevices(tenantSlug: string) {
  return useQuery({
    queryKey: ['etims-devices', tenantSlug],
    queryFn: () => taxApi.listEtimsDevices(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useRegisterEtimsDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, data }: { tenantSlug: string; data: taxApi.RegisterDeviceRequest }) =>
      taxApi.registerEtimsDevice(tenantSlug, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['etims-devices', vars.tenantSlug] });
      toast.success('Device registered');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to register device'),
  });
}

// ---- eTIMS Transmission History + Actions ----

export function useEtimsTransmissions(tenantSlug: string, status?: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['etims-transmissions', tenantSlug, status, limit, offset],
    queryFn: () => taxApi.listEtimsTransmissions(tenantSlug, { status, limit, offset }),
    enabled: !!tenantSlug,
    staleTime: 30_000,
  });
}

export function useRetryTransmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, recordId }: { tenantSlug: string; recordId: string }) =>
      taxApi.retryTransmission(tenantSlug, recordId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['etims-transmissions', vars.tenantSlug] });
      toast.success('Transmission queued for retry');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Retry failed'),
  });
}

// useTransmitInvoice pushes an invoice/credit note to KRA eTIMS. On success it refreshes the
// invoice's fiscal-info + transmissions so the FiscalInfoPanel populates; the caller opens
// EtimsResponseModal with the returned fiscal record.
export function useTransmitInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, invoiceId }: { tenantSlug: string; invoiceId: string }) =>
      taxApi.transmitInvoice(tenantSlug, invoiceId),
    onSuccess: (data: any, vars) => {
      qc.invalidateQueries({ queryKey: ['invoice-fiscal-info', vars.tenantSlug, vars.invoiceId] });
      qc.invalidateQueries({ queryKey: ['etims-transmissions', vars.tenantSlug] });
      if (data?.status === 'queued') {
        toast.success('Invoice queued for eTIMS transmission');
      } else {
        toast.success('Invoice transmitted to eTIMS');
      }
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'eTIMS transmission failed'),
  });
}

export function useRefreshCodeLists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug }: { tenantSlug: string }) =>
      taxApi.refreshCodeLists(tenantSlug),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['etims-code-lists', vars.tenantSlug] });
      toast.success('KRA code lists refreshed successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Code list refresh failed'),
  });
}

/** KRA code-list entries of one type (TAX_TY, ITEM_CLS, PKG_UNIT, QTY_UNIT, ITEM_TY, PMNT_TY,
 *  RFD_RSN, OBLIGATION). `q` searches server-side (useful for the large ITEM_CLS list). */
export function useEtimsCodeLists(tenantSlug: string, type: string, q?: string, limit?: number) {
  return useQuery({
    queryKey: ['etims-code-lists', tenantSlug, type, q ?? '', limit ?? 0],
    queryFn: () => taxApi.listEtimsCodeLists(tenantSlug, type, q, limit),
    enabled: !!tenantSlug && !!type,
    staleTime: 10 * 60 * 1000,
  });
}

/** ALL synced KRA code lists (every type) for the printable code-lists viewer. `q` searches
 *  server-side across code + name. */
export function useAllEtimsCodeLists(tenantSlug: string, q?: string) {
  return useQuery({
    queryKey: ['etims-code-lists-all', tenantSlug, q ?? ''],
    queryFn: () => taxApi.listEtimsCodeLists(tenantSlug, '', q, 2000),
    enabled: !!tenantSlug,
    staleTime: 10 * 60 * 1000,
  });
}

/** Unified KRA eTIMS integration status (platform credentials + tenant activation checklist). */
export function useKraStatus(tenantSlug: string) {
  return useQuery({
    queryKey: ['kra-status', tenantSlug],
    queryFn: () => taxApi.getKraStatus(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 60 * 1000,
  });
}

/** Fiscal (KRA eTIMS) evidence for an invoice — resolves to null when not fiscalised (404),
 *  so consumers can simply hide the panel; no error toast. */
export function useInvoiceFiscalInfo(tenantSlug: string, invoiceID: string) {
  return useQuery({
    queryKey: ['invoice-fiscal-info', tenantSlug, invoiceID],
    queryFn: () => taxApi.getInvoiceFiscalInfo(tenantSlug, invoiceID),
    enabled: !!tenantSlug && !!invoiceID,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useTransmitVendorBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, billId }: { tenantSlug: string; billId: string }) =>
      taxApi.transmitVendorBill(tenantSlug, billId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['etims-transmissions', vars.tenantSlug] });
      toast.success('Vendor bill transmitted to KRA');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Vendor bill transmission failed'),
  });
}

export function useInitEtimsDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, deviceId, cmcKey }: { tenantSlug: string; deviceId: string; cmcKey?: string }) =>
      taxApi.initEtimsDevice(tenantSlug, deviceId, cmcKey),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['etims-devices', vars.tenantSlug] });
      toast.success(vars.cmcKey ? 'Device activated with the provided CMC key' : 'Device initialized — CMC key received from KRA');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Device initialization failed'),
  });
}

// ---- GavaConnect: PIN & Compliance Hooks ----

export function useValidateKRAPIN() {
  return useMutation({
    mutationFn: ({ tenantSlug, pin }: { tenantSlug: string; pin: string }) =>
      taxApi.validateKRAPIN(tenantSlug, pin),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'PIN validation failed'),
  });
}

export function useLookupKRAPINByID() {
  return useMutation({
    mutationFn: ({ tenantSlug, idNumber, taxpayerType }: { tenantSlug: string; idNumber: string; taxpayerType: string }) =>
      taxApi.lookupKRAPINByID(tenantSlug, idNumber, taxpayerType),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'PIN lookup failed'),
  });
}

export function useCheckTaxCompliance() {
  return useMutation({
    mutationFn: ({ tenantSlug, pin, tccNumber }: { tenantSlug: string; pin: string; tccNumber?: string }) =>
      taxApi.checkTaxCompliance(tenantSlug, pin, tccNumber),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Compliance check failed'),
  });
}

export function useTaxpayerObligations(tenantSlug: string, pin: string) {
  return useQuery({
    queryKey: ['kra-obligations', tenantSlug, pin],
    queryFn: () => taxApi.getTaxpayerObligations(tenantSlug, pin),
    enabled: !!tenantSlug && !!pin,
  });
}

// ---- GavaConnect: WHT PRN Hooks ----

// A KRA GavaConnect call can return HTTP 200 with an error envelope (errorMessage / a
// non-success Status) and no result data — treat those as failures, not success.
function prnResultToast(kind: string, data: taxApi.PRNResponse) {
  const prn = data.responseData?.prnNumber;
  if (prn) toast.success(`${kind} WHT PRN generated: ${prn}`);
  else toast.error(data.errorMessage || data.responseDesc || data.status || `${kind} WHT PRN not generated`);
}

export function useGenerateRentalWHTPRN() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.WHTPaymentRequest }) =>
      taxApi.generateRentalWHTPRN(tenantSlug, req),
    onSuccess: (data) => prnResultToast('Rental', data),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate rental WHT PRN'),
  });
}

export function useGenerateIncomeTaxWHTPRN() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.WHTPaymentRequest }) =>
      taxApi.generateIncomeTaxWHTPRN(tenantSlug, req),
    onSuccess: (data) => prnResultToast('Income tax', data),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate income tax WHT PRN'),
  });
}

export function useGenerateVATWHTPRN() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.WHTPaymentRequest }) =>
      taxApi.generateVATWHTPRN(tenantSlug, req),
    onSuccess: (data) => prnResultToast('VAT', data),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate VAT WHT PRN'),
  });
}

// ---- GavaConnect: Tax Return Hooks ----

function returnResultToast(kind: string, data: taxApi.ReturnResponse) {
  if (data.AckNumber) toast.success(`${kind} return filed — Ack: ${data.AckNumber}`);
  else toast.error(data.ErrorMessage || data.Message || data.Status || `${kind} return not filed`);
}

export function useFileTOTReturn() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.TOTReturnRequest }) =>
      taxApi.fileTOTReturn(tenantSlug, req),
    onSuccess: (data) => returnResultToast('TOT', data),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'TOT return filing failed'),
  });
}

export function useFileNILReturn() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.NILReturnRequest }) =>
      taxApi.fileNILReturn(tenantSlug, req),
    onSuccess: (data) => returnResultToast('NIL', data),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'NIL return filing failed'),
  });
}

// ---- Tax eligibility / profile (Phase 2) ----

export function useTaxEligibility(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-eligibility', tenantSlug],
    queryFn: () => taxApi.getEligibilityPosition(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTaxProfile(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-profile', tenantSlug],
    queryFn: () => taxApi.getTaxProfile(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useUpdateTaxProfile(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<{ kra_pin: string; vat_registered: boolean; tot_registered: boolean; auto_charge_vat: boolean }>) =>
      taxApi.updateTaxProfile(tenantSlug, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-profile', tenantSlug] });
      qc.invalidateQueries({ queryKey: ['tax-eligibility', tenantSlug] });
    },
  });
}

export function useSyncTaxObligations(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taxApi.syncTaxObligations(tenantSlug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-profile', tenantSlug] });
      qc.invalidateQueries({ queryKey: ['tax-eligibility', tenantSlug] });
    },
  });
}

export function useTaxPositionEstimate(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-position-estimate', tenantSlug],
    queryFn: () => taxApi.getTaxPositionEstimate(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDeductionsSummary(tenantSlug: string, params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['tax-deductions', tenantSlug, params?.from, params?.to],
    queryFn: () => taxApi.getDeductionsSummary(tenantSlug, params),
    enabled: !!tenantSlug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCapitalAllowanceSchedule(tenantSlug: string) {
  return useQuery({
    queryKey: ['ca-schedule', tenantSlug],
    queryFn: () => taxApi.getCapitalAllowanceSchedule(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useCAAssets(tenantSlug: string) {
  return useQuery({
    queryKey: ['ca-assets', tenantSlug],
    queryFn: () => taxApi.listCAAssets(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useCreateCAAsset(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string; ca_class_code: string; method?: string; cost: number; purchase_date?: string }) =>
      taxApi.createCAAsset(tenantSlug, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ca-assets', tenantSlug] });
      qc.invalidateQueries({ queryKey: ['ca-schedule', tenantSlug] });
    },
  });
}

export function useDeleteCAAsset(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetID: string) => taxApi.deleteCAAsset(tenantSlug, assetID),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ca-assets', tenantSlug] });
      qc.invalidateQueries({ queryKey: ['ca-schedule', tenantSlug] });
    },
  });
}

export function useUpdateCAAsset(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { ca_class_code?: string; method?: string; name?: string } }) =>
      taxApi.updateCAAsset(tenantSlug, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ca-assets', tenantSlug] });
      qc.invalidateQueries({ queryKey: ['ca-schedule', tenantSlug] });
    },
  });
}

export function useStructuringGuidance(tenantSlug: string, params?: { ebitda?: number; gross_interest?: number }) {
  return useQuery({
    queryKey: ['tax-structuring', tenantSlug, params?.ebitda, params?.gross_interest],
    queryFn: () => taxApi.getStructuringGuidance(tenantSlug, params),
    enabled: !!tenantSlug,
  });
}

export function useBadDebtRelief(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-bad-debt-relief', tenantSlug],
    queryFn: () => taxApi.getBadDebtRelief(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useVATReturnSummary(tenantSlug: string, params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['tax-vat-return', tenantSlug, params?.from, params?.to],
    queryFn: () => taxApi.getVATReturnSummary(tenantSlug, params),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEtimsReconciliation(tenantSlug: string, lastReqDt?: string) {
  return useQuery({
    queryKey: ['tax-etims-reconcile', tenantSlug, lastReqDt],
    queryFn: () => taxApi.getEtimsReconciliation(tenantSlug, lastReqDt),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClaimVATRelief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, invoiceID }: { tenantSlug: string; invoiceID: string }) =>
      taxApi.claimVATRelief(tenantSlug, invoiceID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tax-bad-debt-relief', vars.tenantSlug] });
      qc.invalidateQueries({ queryKey: ['tax-vat-return', vars.tenantSlug] });
      toast.success('VAT bad-debt relief claimed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to claim VAT relief'),
  });
}

export function useStatutoryRates(tenantSlug: string, category?: string) {
  return useQuery({
    queryKey: ['tax-statutory-rates', tenantSlug, category],
    queryFn: () => taxApi.listStatutoryRates(tenantSlug, category),
    enabled: !!tenantSlug,
    staleTime: 30 * 60 * 1000,
  });
}

export function useComplianceCalendar(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-compliance-calendar', tenantSlug],
    queryFn: () => taxApi.getComplianceCalendar(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 30 * 60 * 1000,
  });
}

export function useEtimsItems(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-etims-items', tenantSlug],
    queryFn: () => taxApi.listEtimsItems(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegisterEtimsItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, data }: { tenantSlug: string; data: taxApi.RegisterEtimsItemRequest }) =>
      taxApi.registerEtimsItem(tenantSlug, data),
    onSuccess: (item: any, vars) => {
      qc.invalidateQueries({ queryKey: ['tax-etims-items', vars.tenantSlug] });
      // Reflect the ACTUAL KRA outcome — the item can come back queued (registered=false) when
      // KRA is unreachable/rejected; asserting success then would be misleading.
      if (item?.registered) {
        toast.success(`Item registered with eTIMS${item.item_cd ? ` — ${item.item_cd}` : ''}`);
      } else {
        toast(`Item "${item?.item_nm ?? ''}" saved but not yet confirmed by KRA`, {
          description: 'It will show as Queued — use Retry sync once KRA is reachable.',
        });
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to register item'),
  });
}

// useBulkRegisterEtimsItems fires the whole "Sync all" batch as ONE request (202) and lets the
// backend register serially in the background. The tab then polls the items list to reflect
// progress. Fixes the timeout/"CORS" storm from firing one POST per item from the browser.
export function useBulkRegisterEtimsItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, items }: { tenantSlug: string; items: taxApi.RegisterEtimsItemRequest[] }) =>
      taxApi.bulkRegisterEtimsItems(tenantSlug, items),
    onSuccess: (res: taxApi.BulkRegisterResult, vars) => {
      qc.invalidateQueries({ queryKey: ['tax-etims-items', vars.tenantSlug] });
      if (res.status === 'nothing_to_sync' || res.queued === 0) {
        toast('Nothing to sync — all items are already registered.');
      } else if (res.status === 'already_running') {
        toast('A sync is already running for this business — watching progress.');
      } else {
        toast.success(`Syncing ${res.queued} item${res.queued === 1 ? '' : 's'} with KRA eTIMS in the background…`, {
          description: 'Rows will flip to Synced as KRA confirms each one.',
        });
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Could not start item sync'),
  });
}

export function useVAAReconciliation(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-vaa', tenantSlug],
    queryFn: () => taxApi.getVAAReconciliation(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useImportEtimsTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug }: { tenantSlug: string }) => taxApi.importEtimsTransactions(tenantSlug),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['tax-vaa', vars.tenantSlug] });
      qc.invalidateQueries({ queryKey: ['tax-etims-reconcile', vars.tenantSlug] });
      toast.success(`Imported ${res.sales_new} sales, ${res.purchases_new} purchases from KRA`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'eTIMS import failed'),
  });
}

export function useWHVATCertificates(tenantSlug: string) {
  return useQuery({
    queryKey: ['tax-whvat', tenantSlug],
    queryFn: () => taxApi.listWHVATCertificates(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWHVATCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, data }: { tenantSlug: string; data: taxApi.CreateWHVATRequest }) =>
      taxApi.createWHVATCertificate(tenantSlug, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tax-whvat', vars.tenantSlug] });
      qc.invalidateQueries({ queryKey: ['tax-vat-return', vars.tenantSlug] });
      toast.success('WHVAT certificate recorded');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to record certificate'),
  });
}

export function useDeleteWHVATCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, certID }: { tenantSlug: string; certID: string }) =>
      taxApi.deleteWHVATCertificate(tenantSlug, certID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tax-whvat', vars.tenantSlug] });
      qc.invalidateQueries({ queryKey: ['tax-vat-return', vars.tenantSlug] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to delete'),
  });
}

export function useImportedEtimsTxns(tenantSlug: string, direction?: string) {
  return useQuery({
    queryKey: ['tax-etims-imported', tenantSlug, direction],
    queryFn: () => taxApi.listImportedEtimsTxns(tenantSlug, direction),
    enabled: !!tenantSlug,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCheckVATExemption() {
  return useMutation({
    mutationFn: ({ tenantSlug, value }: { tenantSlug: string; value: string }) => taxApi.checkVATExemption(tenantSlug, value),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'VAT exemption check failed'),
  });
}

export function useCheckITExemption() {
  return useMutation({
    mutationFn: ({ tenantSlug, pin }: { tenantSlug: string; pin: string }) => taxApi.checkITExemption(tenantSlug, pin),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'IT exemption check failed'),
  });
}

export function useTaxServiceOffice() {
  return useMutation({
    mutationFn: ({ tenantSlug, pin }: { tenantSlug: string; pin: string }) => taxApi.getTaxServiceOffice(tenantSlug, pin),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Office lookup failed'),
  });
}

export function useTaxLiabilities(tenantSlug: string, status?: string) {
  return useQuery({
    queryKey: ['tax-liabilities', tenantSlug, status ?? 'all'],
    queryFn: () => taxApi.listTaxLiabilities(tenantSlug, status),
    enabled: !!tenantSlug,
  });
}

export function useRemitTaxLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, liabilityID }: { tenantSlug: string; liabilityID: string }) =>
      taxApi.remitTaxLiability(tenantSlug, liabilityID),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['tax-liabilities', vars.tenantSlug] });
      toast.success('Remittance submitted to KRA via M-Pesa');
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data?.error === 'approval_required') {
        toast.warning('This remittance needs approval (with OTP) before it can be released. Send it for approval in the Approvals inbox.');
        return;
      }
      toast.error(data?.error || 'Remittance failed');
    },
  });
}
