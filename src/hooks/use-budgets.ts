import * as budgetsApi from '@/lib/api/budgets';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

export function useBudgets(tenantSlug: string, params?: budgetsApi.ListBudgetsParams) {
  return useQuery({
    queryKey: ['budgets', tenantSlug, params],
    queryFn: () => budgetsApi.listBudgets(tenantSlug, params),
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

export function useBudgetVariance(tenantSlug: string, budgetID: string) {
  return useQuery({
    queryKey: ['budget-variance', tenantSlug, budgetID],
    queryFn: () => budgetsApi.getBudgetVariance(tenantSlug, budgetID),
    enabled: !!tenantSlug && !!budgetID,
  });
}

export function useBudgetVersions(tenantSlug: string, budgetID: string) {
  return useQuery({
    queryKey: ['budget-versions', tenantSlug, budgetID],
    queryFn: () => budgetsApi.getBudgetVersions(tenantSlug, budgetID),
    enabled: !!tenantSlug && !!budgetID,
  });
}

/** Ledger lines behind one budget line's actual; enabled only while the drill panel is open. */
export function useLineTransactions(
  tenantSlug: string,
  budgetID: string,
  lineID: string | null,
  params: { month?: string; page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ['budget-variance', tenantSlug, budgetID, 'drill', lineID, params],
    queryFn: () => budgetsApi.getLineTransactions(tenantSlug, budgetID, lineID as string, params),
    enabled: !!tenantSlug && !!budgetID && !!lineID,
    placeholderData: (prev) => prev,
  });
}

export function useCommitments(tenantSlug: string, params: Parameters<typeof budgetsApi.listCommitments>[1], enabled = true) {
  return useQuery({
    queryKey: ['budget-commitments', tenantSlug, params],
    queryFn: () => budgetsApi.listCommitments(tenantSlug, params),
    enabled: enabled && !!tenantSlug,
  });
}

function useInvalidateBudgets() {
  const qc = useQueryClient();
  return (tenantSlug: string, budgetID?: string) => {
    qc.invalidateQueries({ queryKey: ['budgets', tenantSlug] });
    // Any action can add or retire a version somewhere in a chain.
    qc.invalidateQueries({ queryKey: ['budget-versions', tenantSlug] });
    if (budgetID) {
      qc.invalidateQueries({ queryKey: ['budget', tenantSlug, budgetID] });
      qc.invalidateQueries({ queryKey: ['budget-variance', tenantSlug, budgetID] });
    }
  };
}

export function useSaveBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: ({ tenantSlug, id, data }: { tenantSlug: string; id?: string; data: budgetsApi.BudgetInput }) =>
      id ? budgetsApi.updateBudget(tenantSlug, id, data) : budgetsApi.createBudget(tenantSlug, data),
    onSuccess: (b, vars) => {
      invalidate(vars.tenantSlug, b.id);
      toast.success(vars.id ? 'Budget saved' : 'Budget created');
    },
    onError: (err) => toast.error(errorText(err, 'Failed to save budget')),
  });
}

type Action = 'submit' | 'approve' | 'reject' | 'revise' | 'cancel' | 'close' | 'delete';

const actionLabels: Record<Action, string> = {
  submit: 'Budget submitted for approval',
  approve: 'Budget approved',
  reject: 'Budget returned to its author',
  revise: 'New draft version created',
  cancel: 'Budget cancelled',
  close: 'Budget closed',
  delete: 'Budget deleted',
};

/** One mutation for every lifecycle action; returns the budget the action produced (if any). */
export function useBudgetAction() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: async ({ tenantSlug, budgetID, action, reason }: { tenantSlug: string; budgetID: string; action: Action; reason?: string }) => {
      switch (action) {
        case 'submit':
          return (await budgetsApi.submitBudget(tenantSlug, budgetID)).budget;
        case 'approve':
          return budgetsApi.approveBudget(tenantSlug, budgetID);
        case 'reject':
          return budgetsApi.rejectBudget(tenantSlug, budgetID, reason ?? '');
        case 'revise':
          return budgetsApi.reviseBudget(tenantSlug, budgetID);
        case 'cancel':
          return budgetsApi.cancelBudget(tenantSlug, budgetID);
        case 'close':
          return budgetsApi.closeBudget(tenantSlug, budgetID);
        case 'delete':
          await budgetsApi.deleteBudget(tenantSlug, budgetID);
          return undefined;
      }
    },
    onSuccess: (b, vars) => {
      invalidate(vars.tenantSlug, vars.budgetID);
      if (b?.id && b.id !== vars.budgetID) invalidate(vars.tenantSlug, b.id);
      toast.success(actionLabels[vars.action]);
    },
    onError: (err) => toast.error(errorText(err, 'Action failed')),
  });
}

export function useBudgetTemplates(tenantSlug: string) {
  return useQuery({
    queryKey: ['budget-templates', tenantSlug],
    queryFn: () => budgetsApi.listBudgetTemplates(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveBudgetTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, budgetID, name }: { tenantSlug: string; budgetID: string; name: string }) =>
      budgetsApi.saveBudgetTemplate(tenantSlug, budgetID, name),
    onSuccess: (t, vars) => {
      qc.invalidateQueries({ queryKey: ['budget-templates', vars.tenantSlug] });
      toast.success(`Saved as template "${t.name}"`);
    },
    onError: (err) => toast.error(errorText(err, 'Failed to save template')),
  });
}

export function useDeleteBudgetTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, key }: { tenantSlug: string; key: string }) => budgetsApi.deleteBudgetTemplate(tenantSlug, key),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['budget-templates', vars.tenantSlug] });
      toast.success('Template deleted');
    },
    onError: (err) => toast.error(errorText(err, 'Failed to delete template')),
  });
}

export function useCopyBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: ({ tenantSlug, budgetID, data }: { tenantSlug: string; budgetID: string; data: Parameters<typeof budgetsApi.copyBudget>[2] }) =>
      budgetsApi.copyBudget(tenantSlug, budgetID, data),
    onSuccess: (b, vars) => {
      invalidate(vars.tenantSlug, b.id);
      toast.success('Draft created from the budget');
    },
    onError: (err) => toast.error(errorText(err, 'Failed to copy budget')),
  });
}
