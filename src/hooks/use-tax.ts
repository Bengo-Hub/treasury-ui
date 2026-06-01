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
    onSuccess: (data) => toast.success(`Rental WHT PRN generated: ${data.PRN}`),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate rental WHT PRN'),
  });
}

export function useGenerateIncomeTaxWHTPRN() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.WHTPaymentRequest }) =>
      taxApi.generateIncomeTaxWHTPRN(tenantSlug, req),
    onSuccess: (data) => toast.success(`Income tax WHT PRN generated: ${data.PRN}`),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate income tax WHT PRN'),
  });
}

export function useGenerateVATWHTPRN() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.WHTPaymentRequest }) =>
      taxApi.generateVATWHTPRN(tenantSlug, req),
    onSuccess: (data) => toast.success(`VAT WHT PRN generated: ${data.PRN}`),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to generate VAT WHT PRN'),
  });
}

// ---- GavaConnect: Tax Return Hooks ----

export function useFileTOTReturn() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.TOTReturnRequest }) =>
      taxApi.fileTOTReturn(tenantSlug, req),
    onSuccess: (data) => toast.success(`TOT return filed — Ack: ${data.AcknowledgementNumber}`),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'TOT return filing failed'),
  });
}

export function useFileNILReturn() {
  return useMutation({
    mutationFn: ({ tenantSlug, req }: { tenantSlug: string; req: taxApi.NILReturnRequest }) =>
      taxApi.fileNILReturn(tenantSlug, req),
    onSuccess: (data) => toast.success(`NIL return filed — Ack: ${data.AcknowledgementNumber}`),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'NIL return filing failed'),
  });
}
