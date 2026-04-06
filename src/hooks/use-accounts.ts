'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
  type AccountsResponse,
  type CreateAccountRequest,
  type UpdateAccountRequest,
} from '@/lib/api/accounts';

const STALE_MS = 5 * 60 * 1000;

export const accountKeys = {
  all: (orgSlug: string) => ['ledger-accounts', orgSlug] as const,
};

export function useAccounts(tenantSlug: string, params?: Record<string, string>) {
  return useQuery<AccountsResponse>({
    queryKey: [...accountKeys.all(tenantSlug), params],
    queryFn: () => listAccounts(tenantSlug, params),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}

export function useCreateAccount(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAccountRequest) => createAccount(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all(tenantSlug) });
    },
  });
}

export function useUpdateAccount(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountRequest }) =>
      updateAccount(tenantSlug, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all(tenantSlug) });
    },
  });
}

export function useDeactivateAccount(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateAccount(tenantSlug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all(tenantSlug) });
    },
  });
}
