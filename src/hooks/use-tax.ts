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

export function useRefreshCodeLists() {
  return useMutation({
    mutationFn: ({ tenantSlug }: { tenantSlug: string }) =>
      taxApi.refreshCodeLists(tenantSlug),
    onSuccess: () => toast.success('KRA code lists refreshed successfully'),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Code list refresh failed'),
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
    mutationFn: ({ tenantSlug, deviceId }: { tenantSlug: string; deviceId: string }) =>
      taxApi.initEtimsDevice(tenantSlug, deviceId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['etims-devices', vars.tenantSlug] });
      toast.success('Device initialized — CMC key received from KRA');
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

export function useGenerateRentalWHTPRN() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.WHTPaymentRequest }) =>
      taxApi.generateRentalWHTPRN(tenantSlug, req),
    onSuccess: (data) => toast.success(`Rental WHT PRN generated: ${data.responseData?.prnNumber ?? data.status}`),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate rental WHT PRN'),
  });
}

export function useGenerateIncomeTaxWHTPRN() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.WHTPaymentRequest }) =>
      taxApi.generateIncomeTaxWHTPRN(tenantSlug, req),
    onSuccess: (data) => toast.success(`Income tax WHT PRN generated: ${data.responseData?.prnNumber ?? data.status}`),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate income tax WHT PRN'),
  });
}

export function useGenerateVATWHTPRN() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.WHTPaymentRequest }) =>
      taxApi.generateVATWHTPRN(tenantSlug, req),
    onSuccess: (data) => toast.success(`VAT WHT PRN generated: ${data.responseData?.prnNumber ?? data.status}`),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate VAT WHT PRN'),
  });
}

// ---- GavaConnect: Tax Return Hooks ----

export function useFileTOTReturn() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.TOTReturnRequest }) =>
      taxApi.fileTOTReturn(tenantSlug, req),
    onSuccess: (data) => toast.success(`TOT return filed — Ack: ${data.AckNumber}`),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'TOT return filing failed'),
  });
}

export function useFileNILReturn() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.NILReturnRequest }) =>
      taxApi.fileNILReturn(tenantSlug, req),
    onSuccess: (data) => toast.success(`NIL return filed — Ack: ${data.AckNumber}`),
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
