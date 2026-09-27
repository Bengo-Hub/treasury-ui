'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Banknote, CalendarClock, HandCoins, HeartPulse, Loader2, Receipt, TrendingUp, Users, Wallet } from 'lucide-react';
import {
  Area, Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/charts/StatCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { RangePicker, useRange } from '@/components/dashboard/RangePicker';
import { ExportMenu } from '@/components/documents/ExportMenu';
import { CapsuleTabs, CapsuleTabsContent, CapsuleTabsList, CapsuleTabsTrigger } from '@/components/ui/capsule-tabs';
import { useInsights } from '@/hooks/use-reports';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useOutletFilterStore } from '@/store/outlet-filter';
import type { InsightsParams, InsightsReport } from '@/lib/api/reports';
import {
  AccountTable, CustomersCard, Findings, ForecastTable, HealthCard, MonthlyTable, PerformanceTable, PositionCard,
  RatiosCard, RecurringCard, fmtPct, monthLabel,
} from './_components/insights-sections';

const selectCls = 'h-9 rounded-lg border border-border bg-card px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** The sub-reports. Keys match the API's export `section`, so each tab exports what it shows. */
const TABS = [
  { key: 'overview', label: 'Overview', doc: 'Business Overview' },
  { key: 'profitability', label: 'Profitability', doc: 'Profitability Report' },
  { key: 'cash', label: 'Cash & forecast', doc: 'Cash and Forecast Report' },
  { key: 'customers', label: 'Revenue & customers', doc: 'Revenue and Customers Report' },
  { key: 'costs', label: 'Costs & recurring', doc: 'Costs and Recurring Expenses Report' },
  { key: 'health', label: 'Health & ratios', doc: 'Financial Health Report' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const axis = { tick: { fontSize: 11 }, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />;
const legend = <Legend wrapperStyle={{ fontSize: 12 }} />;

/**
 * Business Insights: how the business is doing over a period and where it is heading, split into
 * sub-reports (tabs, deep-linkable with ?tab=). Everything comes from the general ledger for the
 * resolved tenant and the selected outlet (X-Outlet-ID), so it agrees with the financial
 * statements; every tab exports its own PDF / CSV / Excel through the central report engine.
 */
export default function InsightsPage() {
  return (
    <Suspense fallback={null}>
      <InsightsView />
    </Suspense>
  );
}

function InsightsView() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  const tenant = (isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId) ?? '';
  const outletId = useOutletFilterStore((s) => s.selectedOutlet?.id);
  const range = useRange('12m');
  const [compare, setCompare] = useState<'previous' | 'last_year'>('previous');
  const [horizon, setHorizon] = useState(3);
  const params: InsightsParams = { from: range.from, to: range.to, compare, horizon };
  const { data: report, isLoading, error } = useInsights(tenant, params, outletId);

  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: TabKey = (TABS.find((t) => t.key === search.get('tab'))?.key) ?? 'overview';
  const setTab = useCallback((next: string) => {
    const q = new URLSearchParams(search.toString());
    if (next === 'overview') q.delete('tab'); else q.set('tab', next);
    router.replace(`${pathname}${q.size ? `?${q}` : ''}`, { scroll: false });
  }, [search, router, pathname]);
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="mx-auto w-full max-w-400 space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Insights</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Performance, position, trends and where the business is heading, straight from the ledger.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangePicker range={range} />
          <select aria-label="Compare with" className={selectCls} value={compare} onChange={(e) => setCompare(e.target.value as 'previous' | 'last_year')}>
            <option value="previous">Compare: previous period</option>
            <option value="last_year">Compare: same period last year</option>
          </select>
          <select aria-label="Forecast months" className={selectCls} value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
            {[3, 6, 12].map((n) => <option key={n} value={n}>Forecast {n} months</option>)}
          </select>
        </div>
      </header>

      <CapsuleTabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 lg:flex-1">
            <CapsuleTabsList>
              {TABS.map((t) => <CapsuleTabsTrigger key={t.key} value={t.key}>{t.label}</CapsuleTabsTrigger>)}
            </CapsuleTabsList>
          </div>
          {tenant && (
            <ExportMenu className="self-start lg:self-auto" tenant={tenant} path="reports/insights/export" fileBase={active.doc} title={active.doc}
              params={{ from: range.from, to: range.to, compare, horizon, section: tab }} disabled={!report} />
          )}
        </div>

        {isLoading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Building the report…</div>
        )}
        {error && <p className="mt-6 text-sm text-rose-700" role="alert">Could not load the report: {(error as Error).message}</p>}

        {report && (
          <div className="mt-5">
            <CapsuleTabsContent value="overview"><OverviewTab report={report} /></CapsuleTabsContent>
            <CapsuleTabsContent value="profitability"><ProfitabilityTab report={report} orgSlug={orgSlug} /></CapsuleTabsContent>
            <CapsuleTabsContent value="cash"><CashTab report={report} /></CapsuleTabsContent>
            <CapsuleTabsContent value="customers"><CustomersTab report={report} orgSlug={orgSlug} /></CapsuleTabsContent>
            <CapsuleTabsContent value="costs"><CostsTab report={report} orgSlug={orgSlug} /></CapsuleTabsContent>
            <CapsuleTabsContent value="health"><HealthTab report={report} /></CapsuleTabsContent>
          </div>
        )}
      </CapsuleTabs>
    </div>
  );
}

// ---- shared pieces -------------------------------------------------------------------------

function cmpLabel(r: InsightsReport) {
  return r.compare === 'last_year' ? 'vs last year' : 'vs previous period';
}

/** Change caption for a KPI, or nothing when the comparison period had no activity. */
function delta(r: InsightsReport, key: keyof InsightsReport['changes']) {
  const v = r.changes[key];
  return !r.has_comparison || v == null ? undefined : `${fmtPct(v)} ${cmpLabel(r)}`;
}

function up(r: InsightsReport, key: keyof InsightsReport['changes']) {
  return (r.changes[key] ?? 0) >= 0;
}

const kpiGrid = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4';

function useMonthly(report: InsightsReport) {
  return useMemo(() => (report.monthly ?? []).map((m) => {
    const revenue = Number(m.revenue);
    const cos = Number(m.cost_of_sales);
    const exp = Number(m.expenses);
    const net = Number(m.net_profit);
    return {
      month: monthLabel(m.month, true), revenue, cos, exp, costs: cos + exp, net,
      gross: revenue - cos,
      grossMargin: revenue > 0 ? ((revenue - cos) / revenue) * 100 : null,
      netMargin: revenue > 0 ? (net / revenue) * 100 : null,
      cash: Number(m.cash_balance),
    };
  }), [report]);
}

function PerformanceChart({ report, height = 300 }: { report: InsightsReport; height?: number }) {
  const data = useMonthly(report);
  return (
    <ChartCard title="Monthly performance" subtitle="Revenue and total costs per month, with net profit" height={height} empty={data.length === 0}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
        {grid}
        <XAxis dataKey="month" {...axis} minTickGap={8} />
        <YAxis tickFormatter={compactNumber} {...axis} width={52} />
        <Tooltip formatter={(v) => money(Number(v))} />
        {legend}
        <Bar dataKey="revenue" name="Revenue" fill={SERIES.revenue} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="costs" name="Costs" fill={SERIES.expenses} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line dataKey="net" name="Net profit" stroke={SERIES.net} strokeWidth={2} dot={{ r: 4 }} />
      </ComposedChart>
    </ChartCard>
  );
}

// ---- tabs ----------------------------------------------------------------------------------

function OverviewTab({ report }: { report: InsightsReport }) {
  const cur = report.current;
  return (
    <div className="space-y-4">
      <div className={kpiGrid}>
        <StatCard label="Revenue" value={money(cur.revenue)} delta={delta(report, 'revenue')} deltaUp={up(report, 'revenue')}
          hint={`${cur.months} month${cur.months === 1 ? '' : 's'}`} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label="Gross profit" value={money(cur.gross_profit)} delta={delta(report, 'gross_profit')} deltaUp={up(report, 'gross_profit')}
          hint={`Margin ${fmtPct(report.ratios.gross_margin_pct, false)}`} icon={<HandCoins className="h-5 w-5" />} />
        <StatCard label="Net profit" value={money(cur.net_profit)} delta={delta(report, 'net_profit')} deltaUp={up(report, 'net_profit')}
          hint={`Margin ${fmtPct(report.ratios.net_margin_pct, false)}`}
          tone={Number(cur.net_profit) < 0 ? 'destructive' : 'primary'} icon={<Banknote className="h-5 w-5" />} />
        <StatCard label="Cash and bank" value={money(report.position.cash)}
          hint={`Receivables ${money(report.position.receivables)}`} icon={<Wallet className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2"><PerformanceChart report={report} /></div>
        <HealthCard report={report} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Findings items={report.findings} />
        <PerformanceTable report={report} />
      </div>
      <PositionCard report={report} />
    </div>
  );
}

function ProfitabilityTab({ report, orgSlug }: { report: InsightsReport; orgSlug: string }) {
  const cur = report.current;
  const r = report.ratios;
  const data = useMonthly(report);
  return (
    <div className="space-y-4">
      <div className={kpiGrid}>
        <StatCard label="Revenue" value={money(cur.revenue)} delta={delta(report, 'revenue')} deltaUp={up(report, 'revenue')} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label="Gross profit" value={money(cur.gross_profit)} hint={`Margin ${fmtPct(r.gross_margin_pct, false)}`} delta={delta(report, 'gross_profit')} deltaUp={up(report, 'gross_profit')} icon={<HandCoins className="h-5 w-5" />} />
        <StatCard label="Operating expenses" value={money(cur.expenses)} hint={`${fmtPct(r.expense_ratio_pct, false)} of revenue`} delta={delta(report, 'expenses')} deltaUp={!up(report, 'expenses')} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Net profit" value={money(cur.net_profit)} hint={`Margin ${fmtPct(r.net_margin_pct, false)}`} delta={delta(report, 'net_profit')} deltaUp={up(report, 'net_profit')}
          tone={Number(cur.net_profit) < 0 ? 'destructive' : 'primary'} icon={<Banknote className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PerformanceChart report={report} height={280} />
        <ChartCard title="Margins by month" subtitle="Gross and net profit as a share of revenue" height={280} empty={data.length === 0}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="month" {...axis} minTickGap={8} />
            <YAxis tickFormatter={(v) => `${v}%`} {...axis} width={44} />
            <Tooltip formatter={(v) => (v == null ? '-' : `${Number(v).toFixed(1)}%`)} />
            {legend}
            <Line dataKey="grossMargin" name="Gross margin" stroke={SERIES.revenue} strokeWidth={2} dot={{ r: 4 }} connectNulls />
            <Line dataKey="netMargin" name="Net margin" stroke={SERIES.net} strokeWidth={2} dot={{ r: 4 }} connectNulls />
          </LineChart>
        </ChartCard>
      </div>
      <PerformanceTable report={report} />
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <AccountTable title="Revenue by account" subtitle="Select an account to open its ledger" lines={report.revenue_lines} orgSlug={orgSlug} higherIsGood hasComparison={report.has_comparison} />
        <AccountTable title="Expenses by account" subtitle="Operating expenses and cost of sales" lines={report.expense_lines} orgSlug={orgSlug} higherIsGood={false} hasComparison={report.has_comparison} />
      </div>
      <MonthlyTable report={report} />
    </div>
  );
}

function CashTab({ report }: { report: InsightsReport }) {
  const p = report.position;
  const r = report.ratios;
  const cashSeries = useMemo(() => {
    const actual = (report.monthly ?? []).map((m) => ({ month: monthLabel(m.month, true), actual: Number(m.cash_balance) as number | undefined, forecast: undefined as number | undefined }));
    const fc = report.forecast ?? [];
    if (actual.length && fc.length) actual[actual.length - 1].forecast = actual[actual.length - 1].actual; // join the lines
    return [...actual, ...fc.map((f) => ({ month: monthLabel(f.month, true), actual: undefined, forecast: Number(f.cash_balance) }))];
  }, [report]);
  const revenueForecast = useMemo(() => {
    const hist = (report.monthly ?? []).slice(-6).map((m) => ({ month: monthLabel(m.month, true), actual: Number(m.revenue) as number | undefined, projected: undefined as number | undefined, band: undefined as [number, number] | undefined }));
    return [...hist, ...(report.forecast ?? []).map((f) => ({
      month: monthLabel(f.month, true), actual: undefined, projected: Number(f.revenue), band: [Number(f.revenue_low), Number(f.revenue_high)] as [number, number],
    }))];
  }, [report]);
  return (
    <div className="space-y-4">
      <div className={kpiGrid}>
        <StatCard label="Cash and bank" value={money(p.cash)} hint={r.runway_months == null ? 'Cash is not falling' : `Runway ${r.runway_months.toFixed(1)} months`} icon={<Wallet className="h-5 w-5" />} tone="primary" />
        <StatCard label="Receivables" value={money(p.receivables)} hint={r.days_sales_outstanding == null ? undefined : `Collected in about ${r.days_sales_outstanding.toFixed(0)} days`} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Payables" value={money(p.payables)} hint={r.days_payables_outstanding == null ? undefined : `Paid in about ${r.days_payables_outstanding.toFixed(0)} days`} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Monthly cash burn" value={r.monthly_burn == null ? 'Not falling' : money(r.monthly_burn)} hint="Average of the last 3 months" icon={<CalendarClock className="h-5 w-5" />}
          tone={r.monthly_burn == null ? 'success' : 'warning'} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Cash: actual and forecast" subtitle="Month-end cash and bank; the dashed line is the forecast" height={280} empty={cashSeries.length === 0}>
          <ComposedChart data={cashSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="month" {...axis} minTickGap={8} />
            <YAxis tickFormatter={compactNumber} {...axis} width={52} />
            <Tooltip formatter={(v) => money(Number(v))} />
            {legend}
            <Line dataKey="actual" name="Cash" stroke={SERIES.net} strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
            <Line dataKey="forecast" name="Forecast" stroke={SERIES.net} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} />
          </ComposedChart>
        </ChartCard>
        <ChartCard title="Revenue forecast" subtitle="Last 6 months and the projection, with its likely range" height={280} empty={revenueForecast.length === 0}>
          <ComposedChart data={revenueForecast} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="month" {...axis} minTickGap={8} />
            <YAxis tickFormatter={compactNumber} {...axis} width={52} />
            <Tooltip formatter={(v) => (Array.isArray(v) ? `${money(Number(v[0]))} to ${money(Number(v[1]))}` : money(Number(v)))} />
            {legend}
            <Area dataKey="band" name="Likely range" stroke="none" fill={SERIES.revenue} fillOpacity={0.15} />
            <Bar dataKey="actual" name="Revenue" fill={SERIES.revenue} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line dataKey="projected" name="Projected" stroke={SERIES.revenue} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} />
          </ComposedChart>
        </ChartCard>
      </div>
      <ForecastTable report={report} />
      <PositionCard report={report} />
    </div>
  );
}

function CustomersTab({ report, orgSlug }: { report: InsightsReport; orgSlug: string }) {
  const data = useMonthly(report);
  const customers = report.top_customers ?? [];
  const topShare = customers.length && Number(report.current.revenue) > 0
    ? (Number(customers[0].sales) / Number(report.current.revenue)) * 100 : null;
  return (
    <div className="space-y-4">
      <div className={kpiGrid}>
        <StatCard label="Revenue" value={money(report.current.revenue)} delta={delta(report, 'revenue')} deltaUp={up(report, 'revenue')} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label="Average per month" value={money(Number(report.current.revenue) / Math.max(1, report.current.months))} hint={`${report.current.months} month${report.current.months === 1 ? '' : 's'}`} icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard label="Largest customer" value={customers[0]?.customer ?? '-'} hint={topShare == null ? undefined : `${topShare.toFixed(0)}% of revenue`} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Receivables" value={money(report.position.receivables)} hint="Owed by customers at period end" icon={<Wallet className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <ChartCard title="Revenue by month" height={300} empty={data.length === 0}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {grid}
              <XAxis dataKey="month" {...axis} minTickGap={8} />
              <YAxis tickFormatter={compactNumber} {...axis} width={52} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Bar dataKey="revenue" name="Revenue" fill={SERIES.revenue} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </ComposedChart>
          </ChartCard>
        </div>
        <CustomersCard report={report} className="lg:col-span-2" />
      </div>
      <AccountTable title="Revenue by account" subtitle="Select an account to open its ledger" lines={report.revenue_lines} orgSlug={orgSlug} higherIsGood hasComparison={report.has_comparison} />
    </div>
  );
}

function CostsTab({ report, orgSlug }: { report: InsightsReport; orgSlug: string }) {
  const cur = report.current;
  const data = useMonthly(report);
  return (
    <div className="space-y-4">
      <div className={kpiGrid}>
        <StatCard label="Operating expenses" value={money(cur.expenses)} delta={delta(report, 'expenses')} deltaUp={!up(report, 'expenses')} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Average per month" value={money(Number(cur.expenses) / Math.max(1, cur.months))} hint={`${fmtPct(report.ratios.expense_ratio_pct, false)} of revenue`} icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard label="Recurring per month" value={money(report.recurring_monthly)} hint={`${(report.recurring ?? []).length} recurring cost${(report.recurring ?? []).length === 1 ? '' : 's'}`} icon={<HandCoins className="h-5 w-5" />} tone="warning" />
        <StatCard label="Cost of sales" value={money(cur.cost_of_sales)} hint="Goods and services sold" icon={<Banknote className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <ChartCard title="Costs by month" subtitle="Cost of sales and operating expenses" height={300} empty={data.length === 0}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {grid}
              <XAxis dataKey="month" {...axis} minTickGap={8} />
              <YAxis tickFormatter={compactNumber} {...axis} width={52} />
              <Tooltip formatter={(v) => money(Number(v))} />
              {legend}
              <Bar dataKey="cos" name="Cost of sales" stackId="c" fill={SERIES.outstanding} maxBarSize={32} />
              <Bar dataKey="exp" name="Operating expenses" stackId="c" fill={SERIES.expenses} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </ComposedChart>
          </ChartCard>
        </div>
        <RecurringCard report={report} className="lg:col-span-2" />
      </div>
      <AccountTable title="Expenses by account" subtitle="Select an account to open its ledger" lines={report.expense_lines} orgSlug={orgSlug} higherIsGood={false} hasComparison={report.has_comparison} />
    </div>
  );
}

function HealthTab({ report }: { report: InsightsReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HealthCard report={report} />
        <RatiosCard report={report} className="lg:col-span-2" />
      </div>
      <Findings items={report.findings} />
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <HeartPulse className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        The score adds five parts of 20 points: profitability, liquidity, cash runway, collections and growth. A part with no data scores a neutral 10.
      </p>
    </div>
  );
}
