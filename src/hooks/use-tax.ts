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
