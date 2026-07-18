'use client';

import {
  getExpenses,
  getExpense,
  getExpenseCategories,
  createExpense,
  updateExpense,
  deleteExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  reimburseExpense,
  payExpense,
  reconcileExpenseJournals,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  type ExpensesParams,
  type CreateExpenseRequest,
  type UpdateExpenseRequest,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
} from '@/lib/api/expenses';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STALE_MS = 2 * 60 * 1000;

export const expenseKeys = {
  list: (tenantIdOrSlug: string, params?: ExpensesParams) =>
    ['expenses', 'list', tenantIdOrSlug, params] as const,
  detail: (tenantIdOrSlug: string, id: string) =>
    ['expenses', 'detail', tenantIdOrSlug, id] as const,
  categories: (tenantIdOrSlug: string) =>
    ['expenses', 'categories', tenantIdOrSlug] as const,
};

export function useExpense(
  tenantIdOrSlug: string | undefined,
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: expenseKeys.detail(tenantIdOrSlug ?? '', id ?? ''),
    queryFn: () => getExpense(tenantIdOrSlug!, id!),
    enabled: !!tenantIdOrSlug && !!id && enabled,
    staleTime: STALE_MS,
  });
}

export function useExpenses(
  tenantIdOrSlug: string | undefined,
  params?: ExpensesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: expenseKeys.list(tenantIdOrSlug ?? '', params),
    queryFn: () => getExpenses(tenantIdOrSlug!, params),
    enabled: !!tenantIdOrSlug && enabled,
    staleTime: STALE_MS,
  });
}

export function useExpenseCategories(
  tenantIdOrSlug: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: expenseKeys.categories(tenantIdOrSlug ?? ''),
    queryFn: () => getExpenseCategories(tenantIdOrSlug!),
    enabled: !!tenantIdOrSlug && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateExpense(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => createExpense(tenantIdOrSlug!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'list', tenantIdOrSlug] });
    },
  });
}

export function useUpdateExpense(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseRequest }) =>
      updateExpense(tenantIdOrSlug!, id, data),
    // Invalidate both the list and the edited row's detail.
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['expenses', 'list', tenantIdOrSlug] });
      qc.invalidateQueries({ queryKey: expenseKeys.detail(tenantIdOrSlug ?? '', id) });
    },
  });
}

export function useDeleteExpense(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(tenantIdOrSlug!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'list', tenantIdOrSlug] });
    },
  });
}

export function useSubmitExpense(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitExpense(tenantIdOrSlug!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'list', tenantIdOrSlug] });
    },
  });
}

export function useApproveExpense(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveExpense(tenantIdOrSlug!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'list', tenantIdOrSlug] });
    },
  });
}

export function useRejectExpense(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectExpense(tenantIdOrSlug!, id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'list', tenantIdOrSlug] });
    },
  });
}

export function useReimburseExpense(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentIntentId }: { id: string; paymentIntentId: string }) =>
      reimburseExpense(tenantIdOrSlug!, id, paymentIntentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'list', tenantIdOrSlug] });
    },
  });
}

export function usePayExpense(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidFromAccountId, paymentIntentId }: { id: string; paidFromAccountId?: string; paymentIntentId?: string }) =>
      payExpense(tenantIdOrSlug!, id, { paid_from_account_id: paidFromAccountId, payment_intent_id: paymentIntentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'list', tenantIdOrSlug] });
    },
  });
}

// useReconcileExpenseJournals posts any missing GL journals for approved/paid expenses (idempotent).
export function useReconcileExpenseJournals(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reconcileExpenseJournals(tenantIdOrSlug!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'list', tenantIdOrSlug] });
    },
  });
}

export function useCreateCategory(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => createExpenseCategory(tenantIdOrSlug!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'categories', tenantIdOrSlug] });
    },
  });
}

export function useUpdateCategory(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) =>
      updateExpenseCategory(tenantIdOrSlug!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'categories', tenantIdOrSlug] });
    },
  });
}

export function useDeleteCategory(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpenseCategory(tenantIdOrSlug!, id),
    // Always refetch: a hard delete removes the row, while an in-use 409 leaves the
    // category soft-deactivated (is_active=false) — both change the list.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'categories', tenantIdOrSlug] });
    },
  });
}
