'use client';

import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { usePlatformOverview } from '@/hooks/use-platform-analytics';
import { useOutletFilterStore } from '@/store/outlet-filter';
import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { FinancialPerformanceChart } from '@/components/dashboard/FinancialPerformanceChart';
import { RevenueByOutlet } from '@/components/dashboard/RevenueByOutlet';
import { ReceivablesPayables } from '@/components/dashboard/ReceivablesPayables';
import { ExpenseBreakdown } from '@/components/dashboard/ExpenseBreakdown';
import { ComplianceSnapshot } from '@/components/dashboard/ComplianceSnapshot';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { MoneyFlow } from '@/components/dashboard/MoneyFlow';
import { PlatformMoneyFlow } from '@/components/dashboard/PlatformMoneyFlow';
import { TopCustomers } from '@/components/dashboard/TopCustomers';
import { BooksBalancedBadge } from '@/components/dashboard/BooksBalancedBadge';
import { PeriodCloseReminder } from '@/components/dashboard/PeriodCloseReminder';
import { RangePicker, useRange, type RangeState } from '@/components/dashboard/RangePicker';
import { Banknote, CheckCircle2, Activity, Users, Loader2 } from 'lucide-react';
import { ExportMenu } from '@/components/documents/ExportMenu';
import { useMe } from '@/hooks/useMe';
import { AnnouncementBanner } from '@bengo-hub/shared-ui-lib/announcements';
import { usePayHeroStatus } from './settings/_components/payhero/use-payhero';

/**
 * Dashboard — a thin shell that composes self-contained, reusable analytics widgets (each owns
 * its own data + chart) rather than a monolith. Commercial tenants get the full financial
 * dashboard; platform owners get the cross-tenant overview.
 */
export default function DashboardPage() {
  const { tenantPathId, tenantQueryParam, tenantIdsParam, isPlatformOwner, isAllTenants, orgSlug } =
    useResolvedTenant();
  const range = useRange('30d');
  const { from, to } = range;
  const { data: me } = useMe();
  // Who can act on a setup announcement (turn a gateway on, change settings).
  const isSettingsAdmin = !!me && (me.isSuperUser || me.isPlatformOwner ||
    me.roles.some((r) => r === 'superuser' || r === 'admin' || r.endsWith('_admin')));
  // payhero_active picks the "how to use it" text of a PayHero announcement over "how to ask for
  // it". Read only for admins (the only ones shown it); undefined while loading holds it back.
  const { data: payhero, isError: payheroError } = usePayHeroStatus(isSettingsAdmin ? orgSlug : '');
  const payheroActive = payhero ? payhero.enabled && payhero.channels.some((c) => c.is_active) : payheroError ? false : undefined;
  // OutletFilter (header dropdown, HQ/admin only): selectedOutlet null = "All Outlets". Widgets
  // below get the outlet id so they scope to the chosen branch instead of always showing the
  // tenant-wide aggregate; the "Revenue by Outlet" breakdown only makes sense in the "All
  // Outlets" view, so it's shown only then (and only when there's more than one outlet to break
  // down at all — matches outlets.length === 0 for regular staff, who never see the switcher).
  const selectedOutlet = useOutletFilterStore((s) => s.selectedOutlet);
  const outlets = useOutletFilterStore((s) => s.outlets);
  const outletId = selectedOutlet?.id;
  const showRevenueByOutlet = !selectedOutlet && outlets.length > 1;

  // Platform owner: only the explicit "All Tenants" selection shows the cross-tenant
  // aggregate. By default the owner sees their OWN treasury dashboard, like any tenant.
  if (isPlatformOwner && isAllTenants) {
    return <PlatformDashboard from={from} to={to} tenantIds={tenantIdsParam || undefined} range={range} />;
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <BooksBalancedBadge tenant={dashTenant} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Detailed Business Performance Report for the range and outlet (PDF / CSV / Excel). */}
          <ExportMenu tenant={dashTenant} path="analytics/revenue-report" fileBase="Business Performance Report"
            title="Business Performance Report" params={{ from, to }} />
          <RangePicker range={range} />
        </div>
      </header>

      {/* Platform "what's new" banners (PayHero and later updates); admin-only ones for admins. */}
      <AnnouncementBanner
        service="treasury"
        orgSlug={orgSlug}
        viewerKey={me?.id || me?.email}
        isAdmin={isSettingsAdmin}
        flags={isSettingsAdmin ? { payhero_active: payheroActive } : undefined}
      />
      <PeriodCloseReminder tenant={dashTenant} orgSlug={orgSlug} />
      <KpiCards tenant={dashTenant} from={from} to={to} outletId={outletId} />
      <FinancialPerformanceChart tenant={dashTenant} from={from} to={to} outletId={outletId} />
      {showRevenueByOutlet && <RevenueByOutlet tenant={dashTenant} from={from} to={to} />}
      <ReceivablesPayables tenant={dashTenant} />
      <MoneyFlow tenant={dashTenant} from={from} to={to} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseBreakdown tenant={dashTenant} from={from} to={to} outletId={outletId} />
        </div>
        <div className="space-y-4">
          {/* Tax & Compliance card is a tier-2+ feature (smart_tax_compliance) per the
              use-case PowerSuite matrix — show-don't-hide upgrade CTA when locked. */}
          <SubscriptionGate feature="smart_tax_compliance">
            <ComplianceSnapshot tenant={dashTenant} />
          </SubscriptionGate>
          <TopCustomers tenant={dashTenant} />
        </div>
      </div>
    </div>
  );
}

function PlatformDashboard({ from, to, tenantIds, range }: { from: string; to: string; tenantIds?: string; range: RangeState }) {
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
        <RangePicker range={range} />
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
      <PlatformMoneyFlow from={from} to={to} tenantIds={tenantIds} />
    </div>
  );
}
