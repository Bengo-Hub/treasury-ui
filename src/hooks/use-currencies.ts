'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  convertCurrency,
  listCurrencies,
  listExchangeRates,
  setExchangeRate,
  type SetRateRequest,
} from '@/lib/api/currencies';

const STALE_MS = 10 * 60 * 1000;

export const currencyKeys = {
  supported: () => ['currencies', 'supported'] as const,
  rates: (tenant: string) => ['currencies', tenant, 'rates'] as const,
};

export function useSupportedCurrencies(enabled = true) {
  return useQuery({
    queryKey: currencyKeys.supported(),
    queryFn: () => listCurrencies(),
    enabled,
    staleTime: STALE_MS,
  });
}

export function useExchangeRates(tenant: string, enabled = true) {
  return useQuery({
    queryKey: currencyKeys.rates(tenant),
    queryFn: () => listExchangeRates(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useSetExchangeRate(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SetRateRequest) => setExchangeRate(tenant, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.rates(tenant) });
    },
  });
}

export function useConvertCurrency(tenant: string) {
  return useMutation({
    mutationFn: ({ from, to, amount }: { from: string; to: string; amount: number | string }) =>
      convertCurrency(tenant, from, to, amount),
  });
}
