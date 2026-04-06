import * as budgetsApi from '@/lib/api/budgets';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useBudgets(tenantSlug: string) {
  return useQuery({
    queryKey: ['budgets', tenantSlug],
    queryFn: () => budgetsApi.listBudgets(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useBudget(tenantSlug: string, budgetID: string) {
  return useQuery({
    queryKey: ['budget', tenantSlug, budgetID],
    queryFn: () => budgetsApi.getBudget(tenantSlug, budgetID),
    enabled: !!tenantSlug && !!budgetID,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, data }: { tenantSlug: string; data: budgetsApi.CreateBudgetRequest }) =>
      budgetsApi.createBudget(tenantSlug, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['budgets', vars.tenantSlug] });
      toast.success('Budget created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create budget'),
  });
}

export function useApproveBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, budgetID }: { tenantSlug: string; budgetID: string }) =>
      budgetsApi.approveBudget(tenantSlug, budgetID),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['budgets', vars.tenantSlug] });
      qc.invalidateQueries({ queryKey: ['budget', vars.tenantSlug, vars.budgetID] });
      toast.success('Budget approved');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to approve budget'),
  });
}
