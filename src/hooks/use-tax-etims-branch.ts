// React Query hooks for the KRA branch-admin/taxpayer/notice/item-composition/imported-item
// eTIMS endpoints — split out from use-tax.ts (already 700+ lines) per this project's
// file-length convention. Mirrors the existing useInitEtimsDevice/useSetDeviceScuDetails
// mutation pattern.

import * as taxApi from '@/lib/api/tax';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useEtimsBranchList(tenantSlug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['etims-branch-list', tenantSlug],
    queryFn: () => taxApi.getEtimsBranchList(tenantSlug),
    enabled: enabled && !!tenantSlug,
  });
}

export function useEtimsNoticeList(tenantSlug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['etims-notice-list', tenantSlug],
    queryFn: () => taxApi.getEtimsNoticeList(tenantSlug),
    enabled: enabled && !!tenantSlug,
  });
}

export function useEtimsTaxpayerInfo(tenantSlug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['etims-taxpayer-info', tenantSlug],
    queryFn: () => taxApi.getEtimsTaxpayerInfo(tenantSlug),
    enabled: enabled && !!tenantSlug,
  });
}

export function useRegisterEtimsBranchCustomer() {
  return useMutation({
    mutationFn: ({ tenantSlug, body }: { tenantSlug: string; body: taxApi.RegisterBranchCustomerBody }) =>
      taxApi.registerEtimsBranchCustomer(tenantSlug, body),
    onSuccess: () => toast.success('Customer registered with KRA'),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to register customer with KRA'),
  });
}

export function useRegisterEtimsBranchUser() {
  return useMutation({
    mutationFn: ({ tenantSlug, body }: { tenantSlug: string; body: taxApi.RegisterBranchUserBody }) =>
      taxApi.registerEtimsBranchUser(tenantSlug, body),
    onSuccess: () => toast.success('Branch user account registered with KRA'),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to register branch user with KRA'),
  });
}

export function useRegisterEtimsBranchInsurance() {
  return useMutation({
    mutationFn: ({ tenantSlug, body }: { tenantSlug: string; body: taxApi.RegisterBranchInsuranceBody }) =>
      taxApi.registerEtimsBranchInsurance(tenantSlug, body),
    onSuccess: () => toast.success('Branch insurance registered with KRA'),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to register branch insurance with KRA'),
  });
}

export function useRegisterEtimsItemComposition() {
  return useMutation({
    mutationFn: ({ tenantSlug, body }: { tenantSlug: string; body: taxApi.RegisterItemCompositionBody }) =>
      taxApi.registerEtimsItemComposition(tenantSlug, body),
    onSuccess: () => toast.success('Item composition saved with KRA'),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to save item composition — the component item must already carry KRA stock'),
  });
}

export function useEtimsImportedItems(tenantSlug: string, enabled: boolean, tin?: string) {
  return useQuery({
    queryKey: ['etims-imported-items', tenantSlug, tin],
    queryFn: () => taxApi.getEtimsImportedItems(tenantSlug, tin),
    enabled: enabled && !!tenantSlug,
  });
}

export function useUpdateEtimsImportedItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, body }: { tenantSlug: string; body: taxApi.UpdateImportedItemBody }) =>
      taxApi.updateEtimsImportedItem(tenantSlug, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['etims-imported-items', vars.tenantSlug] });
      toast.success('Imported item approved');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update imported item — note the lookup consumes the task, don’t re-run it before this'),
  });
}
