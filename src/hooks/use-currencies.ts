'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  convertCurrency,
  listCurrencies,
  listExchangeRates,
  setExchangeRate,
  type SetRateRequest,
} from '@/lib/api/currencies';
import { currencyCodes, DEFAULT_CURRENCY_SETTING, FALLBACK_CURRENCY } from '@/lib/currency/config';
import { getSettingValue, useSettings } from '@/hooks/use-settings';

const STALE_MS = 10 * 60 * 1000;

export const currencyKeys = {
  supported: () => ['currencies', 'supported'] as const,
  rates: (tenant: string) => ['currencies', tenant, 'rates'] as const,
  rate: (tenant: string, base: string, quote: string) => ['currencies', tenant, 'rate', base, quote] as const,
};

/** The tenant's own currency: its default_currency setting, KES until that loads or when unset. */
export function useTenantCurrency(tenant: string): string {
  const { data } = useSettings(tenant);
  const v = getSettingValue(data?.settings, DEFAULT_CURRENCY_SETTING, '');
  return typeof v === 'string' && v.trim() ? v.trim().toUpperCase() : FALLBACK_CURRENCY;
}

/** Supported currencies as combobox options (the fallback list while loading). */
export function useCurrencyOptions(): { value: string; label: string }[] {
  const { data } = useSupportedCurrencies();
  return useMemo(() => currencyCodes(data?.currencies).map((code) => ({ value: code, label: code })), [data]);
}

/**
 * The live rate "1 base = ? quote" (treasury's convert, which pivots through KES on the latest
 * fetched rates). Undefined while loading, for the same currency, or when no rate is known.
 */
export function useLiveRate(tenant: string, base: string, quote: string) {
  const enabled = !!tenant && !!base && !!quote && base !== quote;
  return useQuery({
    queryKey: currencyKeys.rate(tenant, base, quote),
    queryFn: async () => {
      const r = await convertCurrency(tenant, base, quote, 1);
      const n = Number(r.converted);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    },
    enabled,
    staleTime: STALE_MS,
    retry: false,
  });
}

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
