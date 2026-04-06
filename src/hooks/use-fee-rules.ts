import * as feeRulesApi from '@/lib/api/fee-rules';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useFeeRules(tenantSlug: string) {
  return useQuery({
    queryKey: ['fee-rules', tenantSlug],
    queryFn: () => feeRulesApi.listFeeRules(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useCreateFeeRule(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: feeRulesApi.CreateFeeRuleRequest) =>
      feeRulesApi.createFeeRule(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules', tenantSlug] });
      toast.success('Fee rule created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create fee rule');
    },
  });
}

export function useUpdateFeeRule(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<feeRulesApi.CreateFeeRuleRequest> & { is_active?: boolean } }) =>
      feeRulesApi.updateFeeRule(tenantSlug, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules', tenantSlug] });
      toast.success('Fee rule updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update fee rule');
    },
  });
}

export function useDeleteFeeRule(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feeRulesApi.deleteFeeRule(tenantSlug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules', tenantSlug] });
      toast.success('Fee rule deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete fee rule');
    },
  });
}

export function usePlatformFeeRules() {
  return useQuery({
    queryKey: ['platform-fee-rules'],
    queryFn: feeRulesApi.listPlatformFeeRules,
  });
}

export function useCreatePlatformFeeRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: feeRulesApi.createPlatformFeeRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-fee-rules'] });
      toast.success('Platform fee rule created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create platform fee rule');
    },
  });
}

export function useUpdatePlatformFeeRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<feeRulesApi.CreateFeeRuleRequest> & { is_active?: boolean } }) =>
      feeRulesApi.updatePlatformFeeRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-fee-rules'] });
      toast.success('Platform fee rule updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update platform fee rule');
    },
  });
}
