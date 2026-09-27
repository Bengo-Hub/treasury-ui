'use client';

import { useMemo, useState } from 'react';
import { Banknote, HandCoins, Loader2, TrendingUp, Wallet } from 'lucide-react';
import {
  Area, Bar, CartesianGrid, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/charts/StatCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { RangePicker, useRange } from '@/components/dashboard/RangePicker';
import { ExportMenu } from '@/components/documents/ExportMenu';
import { useInsights } from '@/hooks/use-reports';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useOutletFilterStore } from '@/store/outlet-filter';
import type { InsightsParams } from '@/lib/api/reports';
import {
  AccountTable, CustomersCard, Findings, HealthCard, MonthlyTable, RatiosCard, RecurringCard, fmtPct,
} from './_components/insights-sections';

const selectCls = 'h-8 rounded-lg border border-border bg-card px-2 text-xs';

/**
 * Business Insights: how the business is doing over a period and where it is heading. Performance
 * with a comparison, financial position, ratios and a health score, monthly trends, revenue and
 * expenses by account (each opens its ledger), top customers, recurring costs and a trend
 * forecast with the cash it implies. Everything comes from the general ledger, so it agrees with
 * the financial statements; the same report exports to PDF / CSV / Excel.
 */
export default function InsightsPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  const tenant = (isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId) ?? '';
  const outletId = useOutletFilterStore((s) => s.selectedOutlet?.id);
  const range = useRange('12m');
  const [compare, setCompare] = useState<'previous' | 'last_year'>('previous');
  const [horizon, setHorizon] = useState(3);
  const params: InsightsParams = { from: range.from, to: range.to, compare, horizon };
  const { data: report, isLoading, error } = useInsights(tenant, params, outletId);

  // One axis per chart (KES). Costs = cost of sales + operating expenses.
  const monthly = useMemo(() => (report?.monthly ?? []).map((m) => ({
    month: m.month,
    revenue: Number(m.revenue),
    costs: Number(m.cost_of_sales) + Number(m.expenses),
    net: Number(m.net_profit),
  })), [report]);
  const cashSeries = useMemo(() => {
    const actual = (report?.monthly ?? []).map((m) => ({ month: m.month, actual: Number(m.cash_balance) as number | undefined, forecast: undefined as number | undefined }));
    const fc = report?.forecast ?? [];
    if (actual.length && fc.length) actual[actual.length - 1].forecast = actual[actual.length - 1].actual; // join the lines
    return [...actual, ...fc.map((f) => ({ month: f.month, actual: undefined, forecast: Number(f.cash_balance) }))];
  }, [report]);
  const revenueForecast = useMemo(() => {
    const hist = (report?.monthly ?? []).slice(-6).map((m) => ({ month: m.month, actual: Number(m.revenue) as number | undefined, projected: undefined as number | undefined, band: undefined as [number, number] | undefined }));
    return [...hist, ...(report?.forecast ?? []).map((f) => ({
      month: f.month, actual: undefined, projected: Number(f.revenue), band: [Number(f.revenue_low), Number(f.revenue_high)] as [number, number],
    }))];
  }, [report]);

  const cur = report?.current;
  const ch = report?.changes ?? {};
  const delta = (v: number | null | undefined, label: string) => (v == null ? undefined : `${fmtPct(v)} ${label}`);
  const cmpLabel = compare === 'last_year' ? 'vs last year' : 'vs previous period';

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Insights</h1>
          <p className="text-sm text-muted-foreground">Performance, position, trends and where the business is heading, straight from the ledger.</p>
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
          {tenant && (
            <ExportMenu tenant={tenant} path="reports/insights/export" fileBase="business-insights" title="Business Insights"
              params={{ from: range.from, to: range.to, compare, horizon }} disabled={!report} />
          )}
        </div>
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Building the report…</div>
      )}
      {error && <p className="text-sm text-rose-700">Could not load the report: {(error as Error).message}</p>}

      {report && cur && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Revenue" value={money(cur.revenue)} delta={delta(ch.revenue, cmpLabel)} deltaUp={(ch.revenue ?? 0) >= 0}
              hint={`${cur.months} month${cur.months === 1 ? '' : 's'}`} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
            <StatCard label="Gross profit" value={money(cur.gross_profit)} delta={delta(ch.gross_profit, cmpLabel)} deltaUp={(ch.gross_profit ?? 0) >= 0}
              hint={`Margin ${fmtPct(report.ratios.gross_margin_pct, false)}`} icon={<HandCoins className="h-5 w-5" />} />
            <StatCard label="Net profit" value={money(cur.net_profit)} delta={delta(ch.net_profit, cmpLabel)} deltaUp={(ch.net_profit ?? 0) >= 0}
              hint={`Margin ${fmtPct(report.ratios.net_margin_pct, false)} · expenses ${money(cur.expenses)}`}
              tone={Number(cur.net_profit) < 0 ? 'destructive' : 'primary'} icon={<Banknote className="h-5 w-5" />} />
            <StatCard label="Cash and bank" value={money(report.position.cash)}
              hint={`Receivables ${money(report.position.receivables)} · payables ${money(report.position.payables)}`} icon={<Wallet className="h-5 w-5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Findings items={report.findings} />
              <ChartCard title="Monthly performance" subtitle="Revenue and total costs per month, with net profit" height={300} empty={monthly.length === 0}>
                <ComposedChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={compactNumber} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill={SERIES.revenue} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="costs" name="Costs" fill={SERIES.expenses} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Line dataKey="net" name="Net profit" stroke={SERIES.net} strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ChartCard>
            </div>
            <HealthCard report={report} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Cash: actual and forecast" subtitle="Month-end cash and bank; the dashed line is the forecast" height={260} empty={cashSeries.length === 0}>
              <ComposedChart data={cashSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={compactNumber} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="actual" name="Cash" stroke={SERIES.net} strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
                <Line dataKey="forecast" name="Forecast" stroke={SERIES.net} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} />
              </ComposedChart>
            </ChartCard>
            <ChartCard title="Revenue forecast" subtitle="Last 6 months and the projection, with its likely range" height={260} empty={revenueForecast.length === 0}>
              <ComposedChart data={revenueForecast} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={compactNumber} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                <Tooltip formatter={(v) => (Array.isArray(v) ? `${money(Number(v[0]))} to ${money(Number(v[1]))}` : money(Number(v)))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="band" name="Likely range" stroke="none" fill={SERIES.revenue} fillOpacity={0.15} />
                <Bar dataKey="actual" name="Revenue" fill={SERIES.revenue} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line dataKey="projected" name="Projected" stroke={SERIES.revenue} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} />
              </ComposedChart>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <AccountTable title="Expenses by account" lines={report.expense_lines} orgSlug={orgSlug} higherIsGood={false} />
              <AccountTable title="Revenue by account" lines={report.revenue_lines} orgSlug={orgSlug} higherIsGood />
            </div>
            <div className="space-y-4">
              <RatiosCard report={report} />
              <RecurringCard report={report} />
              <CustomersCard report={report} />
            </div>
          </div>

          <MonthlyTable report={report} />
        </>
      )}
    </div>
  );
}
