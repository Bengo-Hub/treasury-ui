'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { usePlatformByService, usePlatformByTenant, usePlatformOverview } from '@/hooks/use-platform-analytics';
import { useDateRangeFilter } from '@/hooks/use-date-range-filter';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { formatCurrency } from '@/lib/utils/currency';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildServiceRevenueColumns } from './service-revenue-columns';
import { buildTenantRevenueColumns } from './tenant-revenue-columns';
import { getTransactionsExportURL } from '@/hooks/use-platform-analytics';
import { PlatformRevenueTrendChart } from './platform-revenue-trend-chart';
import { RevenueStreamMixChart } from './revenue-stream-mix-chart';
import { EquityObligationsPanel } from './equity-obligations-panel';
import { ReferralPerformancePanel } from './referral-performance-panel';
import { Activity, Building2, Download, Layers, Printer, TrendingUp } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { downloadPlatformRevenueReport } from '@/lib/api/documents';
import { toast } from 'sonner';

export default function PlatformAnalyticsPage() {
  // Part A: the shared date-range filter (src/hooks/use-date-range-filter.ts), replacing this
  // page's old bare `useState('')` pair — this is the first (and so far only) consumer of the
  // extracted hook/component; see the report for which other pages were/weren't migrated.
  const { from, to, setFrom, setTo, applyPreset, activePreset } = useDateRangeFilter();
  const tenantIds = useTenantFilterStore((s) => s.tenantIdsParam)();

  const { data: overview, isLoading: loadingOverview } = usePlatformOverview(from || undefined, to || undefined, tenantIds || undefined);
  const { data: byTenant, isLoading: loadingTenants, isError: tenantsError } = usePlatformByTenant(from || undefined, to || undefined, tenantIds || undefined);
  const { data: byService, isLoading: loadingServices, isError: servicesError } = usePlatformByService(from || undefined, to || undefined, tenantIds || undefined);

  const serviceRevenueColumns = useMemo(() => buildServiceRevenueColumns(), []);
  // Default order matches the previous hand-rolled table: biggest gross revenue first.
  const sortedServiceRevenue = useMemo(
    () => [...(byService?.breakdown ?? [])].sort((a, b) => parseFloat(b.gross_revenue) - parseFloat(a.gross_revenue)),
    [byService],
  );

  const tenantRevenueColumns = useMemo(() => buildTenantRevenueColumns(), []);
  const sortedTenantRevenue = useMemo(
    () => [...(byTenant?.tenants ?? [])].sort((a, b) => parseFloat(b.gmv || b.total_revenue) - parseFloat(a.gmv || a.total_revenue)),
    [byTenant],
  );

  const { openPreview, previewProps } = useDocumentPreview({ onError: (m: string) => toast.error(m) });
  const previewPlatformReport = useCallback(() => {
    openPreview(
      () => downloadPlatformRevenueReport('pdf', from || undefined, to || undefined, tenantIds || undefined).then((r) => r.blob),
      { fileName: 'platform-revenue-report.pdf', title: 'Platform Revenue Report' }
    );
  }, [openPreview, from, to, tenantIds]);

  // "Tenant Summary" reuses the exact same platform-revenue report the header's Print/Export
  // button downloads — it already IS the per-tenant GMV/commission/net-payable/transaction-count
  // breakdown described here as "Aggregated payouts by tenant footprint". Same preview flow.
  const previewTenantSummary = useCallback(() => {
    openPreview(
      () => downloadPlatformRevenueReport('pdf', from || undefined, to || undefined, tenantIds || undefined).then((r) => r.blob),
      { fileName: 'tenant-summary.pdf', title: 'Tenant Summary' }
    );
  }, [openPreview, from, to, tenantIds]);

  // "Transaction Details" is a raw CSV of every payment transaction in the period — too large/
  // tabular for the PDF preview modal, so it opens as a direct browser download, matching the
  // exact convention this codebase already uses for the platform Transactions page's own export.
  const exportTransactionDetails = useCallback(() => {
    const url = getTransactionsExportURL(from || undefined, to || undefined, undefined, undefined, tenantIds || undefined);
    window.open(url, '_blank');
  }, [from, to, tenantIds]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ecosystem Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform-wide overview of all payment flows and tenant performance.</p>
        </div>
        <button
          type="button"
          onClick={previewPlatformReport}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors"
        >
          <Printer className="h-4 w-4" /> Print / Export
        </button>
      </div>
      <PdfPreview {...previewProps} />

      <DateRangeFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        presets={['last30', 'last90', 'thisMonth', 'thisYear', 'allTime']}
        activePreset={activePreset}
        onPresetSelect={applyPreset}
      />

      {/* Data Exports — moved to the top so it's visible without scrolling past the whole
          dashboard, and wired into the same centralized PdfPreview/apiClient download flow every
          other export button in this codebase uses (previously two inert, non-clickable cards). */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-bold">Data Exports</h3>
          <p className="text-sm text-muted-foreground">Generate platform-wide analytical extracts.</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={exportTransactionDetails}
            className="p-4 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Transaction Details</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Full ecosystem general ledger export (CSV)</p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={previewTenantSummary}
            className="p-4 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Tenant Summary</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Aggregated payouts by tenant footprint</p>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Total Sales Volume</h3>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <div className="animate-pulse h-8 bg-muted rounded w-32"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(parseFloat(overview?.gmv || '0'), overview?.currency || 'KES')}</div>
                <p className="text-xs text-muted-foreground mt-1" title="Only the platform-collected portion is a settlement liability the platform actually owes tenants — cash/manually-recorded sales never touch the platform's account.">
                  {formatCurrency(parseFloat(overview?.platform_collected_gmv || '0'), overview?.currency || 'KES')} platform-collected
                  {' · '}
                  {formatCurrency(parseFloat(overview?.tenant_collected_gmv || '0'), overview?.currency || 'KES')} cash/manual
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Platform Revenue</h3>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <div className="animate-pulse h-8 bg-muted rounded w-32"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(parseFloat(overview?.platform_revenue || '0'), overview?.currency || 'KES')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Subscriptions/fees {formatCurrency(parseFloat(overview?.platform_own_revenue || '0'), overview?.currency || 'KES')}
                  {' + '}PAYG commission {formatCurrency(parseFloat(overview?.payg_commission || '0'), overview?.currency || 'KES')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Transactions</h3>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <div className="animate-pulse h-8 bg-muted rounded w-24"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{overview?.total_transactions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Succeeded: {overview?.succeeded_count}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Active Tenants</h3>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <div className="animate-pulse h-8 bg-muted rounded w-16"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{overview?.active_tenants}</div>
                <p className="text-xs text-muted-foreground mt-1">Contributing this period</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform-wide revenue trend — GMV / PAYG commission / platform's own revenue / net profit over time. */}
      <PlatformRevenueTrendChart from={from || undefined} to={to || undefined} tenantIds={tenantIds || undefined} />

      {/* Revenue composition + dividend-availability reasoning, side by side. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueStreamMixChart from={from || undefined} to={to || undefined} tenantIds={tenantIds || undefined} />
        <EquityObligationsPanel from={from || undefined} to={to || undefined} />
      </div>

      {/* Referral program leaderboard. */}
      <ReferralPerformancePanel from={from || undefined} to={to || undefined} />

      {/* Revenue by Tenant */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-bold">Revenue by Tenant</h3>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={tenantRevenueColumns}
            rows={sortedTenantRevenue}
            rowKey={(r) => r.tenant_id}
            loading={loadingTenants}
            loadingRows={8}
            error={tenantsError}
            storageKey="platform-tenant-revenue-table"
            emptyText="No tenant revenue in this period"
          />
        </CardContent>
      </Card>

      {/* Revenue by Ecosystem Service */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Revenue by Ecosystem Service</h3>
          </div>
          <p className="text-sm text-muted-foreground">Platform-wide revenue split across all Codevertex services.</p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={serviceRevenueColumns}
            rows={sortedServiceRevenue}
            rowKey={(r) => r.source_service}
            loading={loadingServices}
            loadingRows={8}
            error={servicesError}
            storageKey="platform-service-revenue-table"
            emptyText="No service revenue in this period"
          />
        </CardContent>
      </Card>
    </div>
  );
}
