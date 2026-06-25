'use client';

import { useState } from 'react';
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
import { Banknote, CheckCircle2, Activity, Users, Loader2 } from 'lucide-react';

/**
 * Dashboard — a thin shell that composes self-contained, reusable analytics widgets (each owns
 * its own data + chart) rather than a monolith. Commercial tenants get the full financial
 * dashboard; platform owners get the cross-tenant overview.
 */
export default function DashboardPage() {
  const { tenantPathId, tenantIdsParam, isPlatformOwner } = useResolvedTenant();
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const { from, to } = rangeFor(rangeKey);

  if (isPlatformOwner) {
    return <PlatformDashboard from={from} to={to} tenantIds={tenantIdsParam || undefined} rangeKey={rangeKey} onRange={setRangeKey} />;
  }

  if (!tenantPathId) {
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
          <BooksBalancedBadge tenant={tenantPathId} />
        </div>
        <RangePicker value={rangeKey} onChange={setRangeKey} />
      </header>

      <KpiCards tenant={tenantPathId} from={from} to={to} />
      <FinancialPerformanceChart tenant={tenantPathId} from={from} to={to} />
      <ReceivablesPayables tenant={tenantPathId} />
      <MoneyFlow tenant={tenantPathId} from={from} to={to} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseBreakdown tenant={tenantPathId} from={from} to={to} />
        </div>
        <div className="space-y-4">
          <ComplianceSnapshot tenant={tenantPathId} />
          <TopCustomers tenant={tenantPathId} />
        </div>
      </div>
    </div>
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
