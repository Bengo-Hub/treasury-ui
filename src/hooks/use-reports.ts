import * as reportsApi from '@/lib/api/reports';
import { useQuery } from '@tanstack/react-query';

export function useProfitLoss(tenantSlug: string, from: string, to: string) {
  return useQuery({
    queryKey: ['report-pl', tenantSlug, from, to],
    queryFn: () => reportsApi.getProfitLoss(tenantSlug, { from, to }),
    enabled: !!tenantSlug && !!from && !!to,
  });
}

export function useBalanceSheet(tenantSlug: string, asOf?: string) {
  return useQuery({
    queryKey: ['report-bs', tenantSlug, asOf],
    queryFn: () => reportsApi.getBalanceSheet(tenantSlug, asOf ? { as_of: asOf } : undefined),
    enabled: !!tenantSlug,
  });
}

export function useCashFlow(tenantSlug: string, from: string, to: string) {
  return useQuery({
    queryKey: ['report-cf', tenantSlug, from, to],
    queryFn: () => reportsApi.getCashFlow(tenantSlug, { from, to }),
    enabled: !!tenantSlug && !!from && !!to,
  });
}

export function useTaxSummaryReport(tenantSlug: string, from: string, to: string) {
  return useQuery({
    queryKey: ['report-tax', tenantSlug, from, to],
    queryFn: () => reportsApi.getTaxSummary(tenantSlug, { from, to }),
    enabled: !!tenantSlug && !!from && !!to,
  });
}
