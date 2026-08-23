'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  importStatement,
  getStatementLines,
  autoReconcile,
  manualMatch,
  getUnreconciled,
  listLedgerTransactions,
  type ImportStatementRequest,
  type StatementLinesResponse,
  type AutoReconcileResponse,
  type UnreconciledResponse,
  type LedgerTxnsResponse,
} from '@/lib/api/reconciliation';

const STALE_MS = 5 * 60 * 1000;

export const reconKeys = {
  statementLines: (orgSlug: string, statementId: string) =>
    ['banking', 'statements', orgSlug, statementId] as const,
  unreconciled: (orgSlug: string) => ['banking', 'unreconciled', orgSlug] as const,
};

// Bank-account CRUD used to be duplicated here against a separate, feature-gated /banking/accounts
// endpoint with no GL linkage. Removed — this now re-exports the ONE consolidated accounts hook
// (backed by /bank-accounts) so the Reconciliation page's "Bank Accounts" tab and every other
// bank-account picker in the app share the same data and the same real, ledger-linked accounts.
export { useBankAccounts, useCreateBankAccount } from './use-bank-accounts';

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

export function useLedgerTransactions(tenantSlug: string) {
  return useQuery<LedgerTxnsResponse>({
    queryKey: ['banking', 'ledger-transactions', tenantSlug],
    queryFn: () => listLedgerTransactions(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}
