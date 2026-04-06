'use client';

import {
  getExpenses,
  getExpenseCategories,
  createExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  reimburseExpense,
  createExpenseCategory,
  type ExpensesParams,
  type CreateExpenseRequest,
  type CreateCategoryRequest,
} from '@/lib/api/expenses';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STALE_MS = 2 * 60 * 1000;

export const expenseKeys = {
  list: (tenantIdOrSlug: string, params?: ExpensesParams) =>
    ['expenses', 'list', tenantIdOrSlug, params] as const,
  categories: (tenantIdOrSlug: string) =>
    ['expenses', 'categories', tenantIdOrSlug] as const,
};

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

export function useCreateCategory(tenantIdOrSlug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => createExpenseCategory(tenantIdOrSlug!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', 'categories', tenantIdOrSlug] });
    },
  });
}
