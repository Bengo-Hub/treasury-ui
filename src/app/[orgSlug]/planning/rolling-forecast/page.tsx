'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/charts/StatCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { useRollingForecast } from '@/hooks/use-planning';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { num } from '@/lib/api/budgets';
import { cn } from '@/lib/utils';
import { monthLabel } from '../../reports/insights/_components/insights-sections';

const axis = { tick: { fontSize: 11 }, tickLine: false, axisLine: false } as const;

/**
 * Rolling forecast: the last 12 months as booked, then the months ahead projected from the trend,
 * each set against the approved budget so the gap to plan is visible before it happens.
 */
export default function RollingForecastPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  const tenant = (isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId) ?? '';
  const [horizon, setHorizon] = useState(12);
  const { data: f, isLoading, isFetching, error } = useRollingForecast(tenant, horizon);

  const chart = (f?.months ?? []).map((m) => ({
    month: monthLabel(m.month, true),
    actual: m.kind === 'actual' ? num(m.revenue) : null,
    forecast: m.kind === 'forecast' ? num(m.revenue) : null,
    range: m.kind === 'forecast' && m.revenue_low != null ? [num(m.revenue_low), num(m.revenue_high)] : null,
    budget: num(m.budget_revenue) || null,
    costs: num(m.costs),
  }));

  return (
    <SubscriptionGate feature="financial_planning">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rolling forecast</h1>
            <p className="text-muted-foreground mt-1">The last 12 months as booked and the months ahead on the current trend, against your budget.</p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            <select
              className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
            >
              {[3, 6, 12].map((n) => (
                <option key={n} value={n}>
                  Next {n} months
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Could not build the forecast. Try again in a moment.
          </div>
        )}
        {f && !f.has_budget && (
          <div className="rounded-lg border border-border bg-accent/5 px-4 py-3 text-sm text-muted-foreground">
            No approved budget covers these months, so there is nothing to compare against yet.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={`Forecast revenue, next ${horizon} months`} value={money(f?.year_revenue)} loading={isLoading} />
          <StatCard
            label="Budgeted revenue"
            value={f?.has_budget ? money(f.year_budget) : 'No budget'}
            tone={f?.has_budget && num(f.year_revenue) < num(f.year_budget) ? 'warning' : 'default'}
            loading={isLoading}
          />
          <StatCard
            label="Forecast net profit"
            value={money(f?.year_net_profit)}
            tone={num(f?.year_net_profit) < 0 ? 'destructive' : 'success'}
            loading={isLoading}
          />
        </div>

        <ChartCard title="Revenue: actual, forecast and budget" subtitle="The shaded band is the likely range" height={320} empty={!chart.length}>
          <ComposedChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="month" {...axis} />
            <YAxis tickFormatter={compactNumber} {...axis} width={56} />
            <Tooltip formatter={(val) => (Array.isArray(val) ? val.map((x) => money(Number(x))).join(' to ') : money(Number(val)))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area dataKey="range" name="Likely range" stroke="none" fill={SERIES.revenue} fillOpacity={0.15} />
            <Line dataKey="actual" name="Actual" stroke={SERIES.revenue} strokeWidth={2} dot={false} />
            <Line dataKey="forecast" name="Forecast" stroke={SERIES.revenue} strokeDasharray="5 4" strokeWidth={2} dot={false} />
            <Line dataKey="budget" name="Budget" stroke={SERIES.net} dot={false} />
            <Line dataKey="costs" name="Costs" stroke={SERIES.expenses} dot={false} />
          </ComposedChart>
        </ChartCard>

        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm uppercase tracking-tight">By month</h3>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Month</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">vs budget</th>
                  <th className="px-4 py-2 text-right">Costs</th>
                  <th className="px-4 py-2 text-right">vs budget</th>
                  <th className="px-4 py-2 text-right">Net profit</th>
                  <th className="px-4 py-2 text-right">Cash</th>
                </tr>
              </thead>
              <tbody>
                {(f?.months ?? []).map((m) => (
                  <tr key={m.month} className={cn('border-b border-border/60 last:border-0', m.kind === 'forecast' && 'bg-accent/5 italic')}>
                    <td className="px-4 py-2">
                      {monthLabel(m.month)}
                      {m.kind === 'forecast' && <span className="ml-2 text-xs text-muted-foreground not-italic">forecast</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(m.revenue)}</td>
                    <td className={cn('px-4 py-2 text-right tabular-nums', num(m.revenue_vs_budget) < 0 ? 'text-destructive' : 'text-green-600')}>
                      {f?.has_budget ? money(m.revenue_vs_budget) : ''}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(m.costs)}</td>
                    <td className={cn('px-4 py-2 text-right tabular-nums', num(m.costs_vs_budget) < 0 ? 'text-destructive' : 'text-green-600')}>
                      {f?.has_budget ? money(m.costs_vs_budget) : ''}
                    </td>
                    <td className={cn('px-4 py-2 text-right tabular-nums', num(m.net_profit) < 0 && 'text-destructive')}>{money(m.net_profit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(m.cash_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </SubscriptionGate>
  );
}
