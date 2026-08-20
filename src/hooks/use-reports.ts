import * as reportsApi from '@/lib/api/reports';
import type { ReportRangeParams } from '@/lib/api/reports';
import { useQuery } from '@tanstack/react-query';

/**
 * Window selector shared by every period-aware report hook. Exactly one basis
 * is active at a time:
 *  - date range  -> { from, to }
 *  - fiscal year -> { fy } or { fiscal_year }
 *  - period      -> { period }
 * The object is forwarded verbatim to the API client as query params and is
 * also folded into the query key so switching basis refetches.
 */
export type ReportWindow = ReportRangeParams;

/** True when the window can produce a report (some basis is selected). */
function windowReady(w: ReportWindow): boolean {
  if (w.period) return true;
  if (w.fy || w.fiscal_year) return true;
  return !!w.from && !!w.to;
}

/** Stable key fragment for the active window basis. */
function windowKey(w: ReportWindow) {
  return [w.period ?? '', w.fiscal_year ?? '', w.fy ?? '', w.from ?? '', w.to ?? ''];
}

export function useProfitLoss(tenantSlug: string, window: ReportWindow) {
  return useQuery({
    queryKey: ['report-pl', tenantSlug, ...windowKey(window)],
    queryFn: () => reportsApi.getProfitLoss(tenantSlug, window),
    enabled: !!tenantSlug && windowReady(window),
  });
}

export function useBalanceSheet(
  tenantSlug: string,
  params: { as_of?: string } & Pick<ReportWindow, 'period' | 'fiscal_year' | 'fy'>,
) {
  return useQuery({
    queryKey: [
      'report-bs',
      tenantSlug,
      params.as_of ?? '',
      params.period ?? '',
      params.fiscal_year ?? '',
      params.fy ?? '',
    ],
    queryFn: () => reportsApi.getBalanceSheet(tenantSlug, params),
    enabled: !!tenantSlug,
  });
}

export function useCashFlow(tenantSlug: string, window: ReportWindow) {
  return useQuery({
    queryKey: ['report-cf', tenantSlug, ...windowKey(window)],
    queryFn: () => reportsApi.getCashFlow(tenantSlug, window),
    enabled: !!tenantSlug && windowReady(window),
  });
}

export function useTaxSummaryReport(tenantSlug: string, window: ReportWindow) {
  return useQuery({
    queryKey: ['report-tax', tenantSlug, ...windowKey(window)],
    queryFn: () => reportsApi.getTaxSummary(tenantSlug, window),
    enabled: !!tenantSlug && windowReady(window),
  });
}

export function useProfitLossSummary(
  tenantSlug: string,
  window: ReportWindow,
  currency?: string,
  // outletId scopes the summary to one branch (OutletFilter dropdown); undefined/"" means "all
  // outlets". Included in the query key so switching outlets refetches instead of showing a
  // stale cached response for the previously selected outlet.
  outletId?: string,
) {
  return useQuery({
    queryKey: ['report-pl-summary', tenantSlug, ...windowKey(window), currency, outletId ?? ''],
    queryFn: () => reportsApi.getProfitLossSummary(tenantSlug, { ...window, currency, outlet_id: outletId }),
    enabled: !!tenantSlug && windowReady(window),
  });
}

/**
 * Revenue/COGS/gross-profit grouped by outlet — backs the Dashboard's "Revenue by Outlet" chart.
 * Deliberately has no outletId param of its own: it exists precisely to show the per-outlet
 * breakdown, so it's only meaningful (and only rendered) in the "All Outlets" view.
 */
export function useRevenueByOutlet(tenantSlug: string, window: ReportWindow, enabled = true) {
  return useQuery({
    queryKey: ['report-revenue-by-outlet', tenantSlug, ...windowKey(window)],
    queryFn: () => reportsApi.getRevenueByOutlet(tenantSlug, window),
    enabled: enabled && !!tenantSlug && windowReady(window),
  });
}
