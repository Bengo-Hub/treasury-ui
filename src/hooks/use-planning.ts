import * as planningApi from '@/lib/api/planning';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

const STALE_MS = 5 * 60 * 1000;

export function useCashForecast(tenantSlug: string, scenario: planningApi.CashForecastScenario) {
  return useQuery({
    queryKey: ['cash-forecast', tenantSlug, scenario],
    queryFn: () => planningApi.getCashForecast(tenantSlug, scenario),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useRollingForecast(tenantSlug: string, horizon: number) {
  return useQuery({
    queryKey: ['rolling-forecast', tenantSlug, horizon],
    queryFn: () => planningApi.getRollingForecast(tenantSlug, horizon),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useDimensionPnL(tenantSlug: string, params: { by: 'cost_center' | 'project'; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['bi-dimension-pnl', tenantSlug, params],
    queryFn: () => planningApi.getDimensionPnL(tenantSlug, params),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useBudgetUtilisation(tenantSlug: string) {
  return useQuery({
    queryKey: ['bi-budget-utilisation', tenantSlug],
    queryFn: () => planningApi.getBudgetUtilisation(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}
