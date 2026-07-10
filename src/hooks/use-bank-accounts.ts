'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  type BankAccountsResponse,
  type BankAccountRequest,
} from '@/lib/api/bank-accounts';

const STALE_MS = 5 * 60 * 1000;

export const bankAccountKeys = {
  all: (tenant: string) => ['bank-accounts', tenant] as const,
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
