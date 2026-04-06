'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listBankAccounts,
  createBankAccount,
  importStatement,
  getStatementLines,
  autoReconcile,
  manualMatch,
  getUnreconciled,
  type BankAccountsResponse,
  type CreateBankAccountRequest,
  type ImportStatementRequest,
  type StatementLinesResponse,
  type AutoReconcileResponse,
  type UnreconciledResponse,
} from '@/lib/api/reconciliation';

const STALE_MS = 5 * 60 * 1000;

export const reconKeys = {
  bankAccounts: (orgSlug: string) => ['banking', 'accounts', orgSlug] as const,
  statementLines: (orgSlug: string, statementId: string) =>
    ['banking', 'statements', orgSlug, statementId] as const,
  unreconciled: (orgSlug: string) => ['banking', 'unreconciled', orgSlug] as const,
};

export function useBankAccounts(tenantSlug: string) {
  return useQuery<BankAccountsResponse>({
    queryKey: reconKeys.bankAccounts(tenantSlug),
    queryFn: () => listBankAccounts(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}

export function useCreateBankAccount(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBankAccountRequest) => createBankAccount(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reconKeys.bankAccounts(tenantSlug) });
    },
  });
}

export function useImportStatement(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ImportStatementRequest) => importStatement(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reconKeys.unreconciled(tenantSlug) });
    },
  });
}

export function useStatementLines(tenantSlug: string, statementId: string) {
  return useQuery<StatementLinesResponse>({
    queryKey: reconKeys.statementLines(tenantSlug, statementId),
    queryFn: () => getStatementLines(tenantSlug, statementId),
    enabled: !!tenantSlug && !!statementId,
    staleTime: STALE_MS,
  });
}

export function useAutoReconcile(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation<AutoReconcileResponse, Error, string>({
    mutationFn: (statementId: string) => autoReconcile(tenantSlug, statementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reconKeys.unreconciled(tenantSlug) });
    },
  });
}

export function useManualMatch(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, transactionId }: { lineId: string; transactionId: string }) =>
      manualMatch(tenantSlug, lineId, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reconKeys.unreconciled(tenantSlug) });
    },
  });
}

export function useUnreconciled(tenantSlug: string) {
  return useQuery<UnreconciledResponse>({
    queryKey: reconKeys.unreconciled(tenantSlug),
    queryFn: () => getUnreconciled(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}
