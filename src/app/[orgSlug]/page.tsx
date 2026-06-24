'use client';

import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { usePlatformOverview } from '@/hooks/use-platform-analytics';
import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { FinancialPerformanceChart } from '@/components/dashboard/FinancialPerformanceChart';
import { ReceivablesPayables } from '@/components/dashboard/ReceivablesPayables';
import { ExpenseBreakdown } from '@/components/dashboard/ExpenseBreakdown';
import { ComplianceSnapshot } from '@/components/dashboard/ComplianceSnapshot';
import { Banknote, CheckCircle2, Activity, Users, Loader2 } from 'lucide-react';

function last30(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

/**
 * Dashboard — a thin shell that composes self-contained, reusable analytics widgets (each owns
 * its own data + chart) rather than a monolith. Commercial tenants get the full financial
 * dashboard; platform owners get the cross-tenant overview.
 */
export default function DashboardPage() {
  const { tenantPathId, tenantIdsParam, isPlatformOwner } = useResolvedTenant();
  const { from, to } = last30();

  if (isPlatformOwner) {
    return <PlatformDashboard from={from} to={to} tenantIds={tenantIdsParam || undefined} />;
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
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Financial performance · last 30 days</p>
      </header>

      <KpiCards tenant={tenantPathId} from={from} to={to} />
      <FinancialPerformanceChart tenant={tenantPathId} from={from} to={to} />
      <ReceivablesPayables tenant={tenantPathId} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseBreakdown tenant={tenantPathId} from={from} to={to} />
        </div>
        <ComplianceSnapshot tenant={tenantPathId} />
      </div>
    </div>
  );
}

function PlatformDashboard({ from, to, tenantIds }: { from: string; to: string; tenantIds?: string }) {
  const overview = usePlatformOverview(from, to, tenantIds);
  const d = overview.data as any;
  const loading = overview.isLoading;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">Across all tenants · last 30 days</p>
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
