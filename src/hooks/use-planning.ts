import * as planningApi from '@/lib/api/planning';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

export function useDimensionPnL(tenantSlug: string, params: planningApi.DimensionPnLParams) {
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

export function useTaxCalendar(tenantSlug: string, months: number) {
  return useQuery({
    queryKey: ['tax-calendar', tenantSlug, months],
    queryFn: () => planningApi.getTaxCalendar(tenantSlug, months),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useScenarios(tenantSlug: string) {
  return useQuery({
    queryKey: ['cash-scenarios', tenantSlug],
    queryFn: () => planningApi.listScenarios(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}

const scenarioError = (err: unknown) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not update scenarios';

export function useSaveScenario(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: planningApi.SavedScenario) => planningApi.saveScenario(tenantSlug, s),
    onSuccess: (list, s) => {
      qc.setQueryData(['cash-scenarios', tenantSlug], list);
      toast.success(`Scenario "${s.name}" saved`);
    },
    onError: (err) => toast.error(scenarioError(err)),
  });
}

export function useDeleteScenario(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => planningApi.deleteScenario(tenantSlug, name),
    onSuccess: (list, name) => {
      qc.setQueryData(['cash-scenarios', tenantSlug], list);
      toast.success(`Scenario "${name}" deleted`);
    },
    onError: (err) => toast.error(scenarioError(err)),
  });
}
