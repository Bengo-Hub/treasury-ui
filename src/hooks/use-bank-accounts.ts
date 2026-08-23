'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getAccountBalance,
  getAccountStatement,
  type BankAccountsResponse,
  type BankAccountRequest,
  type AccountBalance,
  type AccountStatement,
} from '@/lib/api/bank-accounts';

const STALE_MS = 5 * 60 * 1000;

export const bankAccountKeys = {
  all: (tenant: string) => ['bank-accounts', tenant] as const,
  balance: (tenant: string, id: string) => ['bank-accounts', tenant, id, 'balance'] as const,
  statement: (tenant: string, id: string, from?: string, to?: string) =>
    ['bank-accounts', tenant, id, 'statement', from, to] as const,
};

export function useBankAccounts(tenant: string, enabled = true) {
  return useQuery<BankAccountsResponse>({
    queryKey: bankAccountKeys.all(tenant),
    queryFn: () => listBankAccounts(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useCreateBankAccount(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BankAccountRequest) => createBankAccount(tenant, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankAccountKeys.all(tenant) }),
  });
}

export function useUpdateBankAccount(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BankAccountRequest }) => updateBankAccount(tenant, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankAccountKeys.all(tenant) }),
  });
}

export function useDeleteBankAccount(tenant: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBankAccount(tenant, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankAccountKeys.all(tenant) }),
  });
}

export function useAccountBalance(tenant: string, id: string, enabled = true) {
  return useQuery<AccountBalance>({
    queryKey: bankAccountKeys.balance(tenant, id),
    queryFn: () => getAccountBalance(tenant, id),
    enabled: !!tenant && !!id && enabled,
    staleTime: STALE_MS,
  });
}

export function useAccountStatement(
  tenant: string,
  id: string,
  params?: { from?: string; to?: string },
  enabled = true,
) {
  return useQuery<AccountStatement>({
    queryKey: bankAccountKeys.statement(tenant, id, params?.from, params?.to),
    queryFn: () => getAccountStatement(tenant, id, params),
    enabled: !!tenant && !!id && enabled,
    staleTime: STALE_MS,
  });
}
