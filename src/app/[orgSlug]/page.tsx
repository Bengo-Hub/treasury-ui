'use client';

import { useCallback, useState } from 'react';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { usePlatformOverview } from '@/hooks/use-platform-analytics';
import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { FinancialPerformanceChart } from '@/components/dashboard/FinancialPerformanceChart';
import { ReceivablesPayables } from '@/components/dashboard/ReceivablesPayables';
import { ExpenseBreakdown } from '@/components/dashboard/ExpenseBreakdown';
import { ComplianceSnapshot } from '@/components/dashboard/ComplianceSnapshot';
import { MoneyFlow } from '@/components/dashboard/MoneyFlow';
import { TopCustomers } from '@/components/dashboard/TopCustomers';
import { BooksBalancedBadge } from '@/components/dashboard/BooksBalancedBadge';
import { RangePicker, rangeFor, type RangeKey } from '@/components/dashboard/RangePicker';
import { Banknote, CheckCircle2, Activity, Users, Loader2, Printer } from 'lucide-react';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { downloadRevenueReport } from '@/lib/api/documents';
import { toast } from 'sonner';

/**
 * Dashboard — a thin shell that composes self-contained, reusable analytics widgets (each owns
 * its own data + chart) rather than a monolith. Commercial tenants get the full financial
 * dashboard; platform owners get the cross-tenant overview.
 */
export default function DashboardPage() {
  const { tenantPathId, tenantQueryParam, tenantIdsParam, isPlatformOwner, isAllTenants, orgSlug } =
    useResolvedTenant();
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const { from, to } = rangeFor(rangeKey);

  // Platform owner: only the explicit "All Tenants" selection shows the cross-tenant
  // aggregate. By default the owner sees their OWN treasury dashboard, like any tenant.
  if (isPlatformOwner && isAllTenants) {
    return <PlatformDashboard from={from} to={to} tenantIds={tenantIdsParam || undefined} rangeKey={rangeKey} onRange={setRangeKey} />;
  }

  // Own-tenant view: for a platform owner this is the selected tenant (drill-down) or
  // their own org (codevertex) by default; for a regular tenant it's their URL slug.
  const dashTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  if (!dashTenant) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <BooksBalancedBadge tenant={dashTenant} />
        </div>
        <div className="flex items-center gap-2">
          <RevenueReportButton tenant={dashTenant} from={from} to={to} />
          <RangePicker value={rangeKey} onChange={setRangeKey} />
        </div>
      </header>

      <KpiCards tenant={dashTenant} from={from} to={to} />
      <FinancialPerformanceChart tenant={dashTenant} from={from} to={to} />
      <ReceivablesPayables tenant={dashTenant} />
      <MoneyFlow tenant={dashTenant} from={from} to={to} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseBreakdown tenant={dashTenant} from={from} to={to} />
        </div>
        <div className="space-y-4">
          <ComplianceSnapshot tenant={dashTenant} />
          <TopCustomers tenant={dashTenant} />
        </div>
      </div>
    </div>
  );
}

/**
 * RevenueReportButton previews the tenant's branded Revenue report PDF (from the treasury reports
 * engine) in the shared PdfPreview modal — Download / Print / Open-in-tab — for the active range.
 */
function RevenueReportButton({ tenant, from, to }: { tenant: string; from: string; to: string }) {
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m: string) => toast.error(m) });
  const onClick = useCallback(() => {
    openPreview(() => downloadRevenueReport(tenant, 'pdf', from, to).then((r) => r.blob), {
      fileName: 'revenue-report.pdf',
      title: 'Revenue Report',
    });
  }, [openPreview, tenant, from, to]);
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors"
      >
        <Printer className="h-4 w-4" /> Print / Export
      </button>
      <PdfPreview {...previewProps} />
    </>
  );
}

function PlatformDashboard({ from, to, tenantIds, rangeKey, onRange }: { from: string; to: string; tenantIds?: string; rangeKey: RangeKey; onRange: (k: RangeKey) => void }) {
  const overview = usePlatformOverview(from, to, tenantIds);
  const d = overview.data as any;
  const loading = overview.isLoading;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Dashboard</h1>
          <p className="text-sm text-muted-foreground">Across all tenants</p>
        </div>
        <RangePicker value={rangeKey} onChange={onRange} />
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={money(d?.total_revenue)} tone="success" loading={loading} icon={<Banknote className="h-5 w-5" />} />
        <StatCard label="Transactions" value={(d?.total_transactions ?? 0).toLocaleString()} tone="primary" loading={loading} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Succeeded" value={(d?.succeeded_count ?? 0).toLocaleString()} tone="success" loading={loading} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Active Tenants" value={(d?.tenant_count ?? d?.active_tenants ?? 0).toLocaleString()} tone="default" loading={loading} icon={<Users className="h-5 w-5" />} />
      </div>
      {overview.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load platform analytics.
        </div>
      )}
    </div>
  );
}
