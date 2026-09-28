'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Save, Trash2 } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/charts/StatCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useCashForecast, useDeleteScenario, useSaveScenario, useScenarios } from '@/hooks/use-planning';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { num } from '@/lib/api/budgets';
import type { CashForecastScenario } from '@/lib/api/planning';
import { cn } from '@/lib/utils';

const axis = { tick: { fontSize: 11 }, tickLine: false, axisLine: false } as const;
const inputCls = 'h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const taxKind: Record<string, string> = {
  vat: "VAT for last month (last month's recorded amount)",
  tot: 'Turnover Tax for last month',
  wht: 'Withholding tax deducted last month',
  instalment: 'Income tax instalment (a quarter of profit to date, annualised)',
};

const weekLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * 13-week direct cash forecast: the cash the business will have each week, from what it holds today,
 * what customers owe and suppliers are owed by due date, recent trading and spending, payroll and
 * statutory remittances. The scenario knobs answer "what if customers pay later / sales drop".
 */
export default function CashForecastPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  const tenant = (isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId) ?? '';
  const [scenario, setScenario] = useState<Required<CashForecastScenario>>({
    weeks: 13,
    collection_delay_days: 0,
    receipts_change_pct: 0,
    spend_change_pct: 0,
    minimum_cash: 0,
  });
  const { data: f, isLoading, isFetching, error } = useCashForecast(tenant, scenario);
  const { data: saved } = useScenarios(tenant);
  const saveScenario = useSaveScenario(tenant);
  const removeScenario = useDeleteScenario(tenant);
  const [scenarioName, setScenarioName] = useState('');
  const pickScenario = (name: string) => {
    setScenarioName(name);
    const sc = (saved ?? []).find((x) => x.name === name);
    if (sc) {
      setScenario({
        weeks: sc.weeks || 13,
        collection_delay_days: sc.collection_delay_days ?? 0,
        receipts_change_pct: sc.receipts_change_pct ?? 0,
        spend_change_pct: sc.spend_change_pct ?? 0,
        minimum_cash: sc.minimum_cash ?? 0,
      });
    }
  };
  const set = (k: keyof CashForecastScenario) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setScenario((s) => ({ ...s, [k]: Number(e.target.value) || 0 }));

  const cur = f?.currency ?? 'KES';
  const chart = (f?.weeks ?? []).map((w) => ({
    week: weekLabel(w.start),
    inflow: num(w.trading_receipts) + num(w.collections),
    outflow: -(num(w.supplier_payments) + num(w.direct_spend) + num(w.payroll) + num(w.statutory) + num(w.tax)),
    closing: num(w.closing),
  }));
  const a = f?.assumptions;

  return (
    <SubscriptionGate feature="financial_planning">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cash forecast</h1>
            <p className="text-muted-foreground mt-1">
              Week-by-week cash for the next {scenario.weeks} weeks, so a shortfall shows up while there is still time to act.
            </p>
          </div>
          {isFetching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 py-4">
            <h3 className="font-bold text-sm uppercase tracking-tight">What if</h3>
            <div className="flex flex-wrap items-center gap-2">
              {(saved ?? []).length > 0 && (
                <select className={`${inputCls} w-48`} value={(saved ?? []).some((x) => x.name === scenarioName) ? scenarioName : ''} onChange={(e) => pickScenario(e.target.value)}>
                  <option value="">Saved scenarios</option>
                  {(saved ?? []).map((x) => (
                    <option key={x.name} value={x.name}>
                      {x.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                className={`${inputCls} w-44`}
                placeholder="Scenario name"
                value={scenarioName}
                maxLength={60}
                onChange={(e) => setScenarioName(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={!scenarioName.trim() || saveScenario.isPending}
                onClick={() => saveScenario.mutate({ name: scenarioName.trim(), ...scenario })}
              >
                <Save className="h-4 w-4" /> Save
              </Button>
              {(saved ?? []).some((x) => x.name === scenarioName) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive"
                  disabled={removeScenario.isPending}
                  onClick={() => removeScenario.mutate(scenarioName, { onSuccess: () => setScenarioName('') })}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Weeks ahead</span>
              <select className={inputCls} value={scenario.weeks} onChange={set('weeks')}>
                {[4, 8, 13, 26].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Customers pay late by (days)</span>
              <input type="number" min={0} className={inputCls} value={scenario.collection_delay_days} onChange={set('collection_delay_days')} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Sales change (%)</span>
              <input type="number" className={inputCls} value={scenario.receipts_change_pct} onChange={set('receipts_change_pct')} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Spending change (%)</span>
              <input type="number" className={inputCls} value={scenario.spend_change_pct} onChange={set('spend_change_pct')} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Warn below ({cur})</span>
              <input type="number" min={0} className={inputCls} value={scenario.minimum_cash} onChange={set('minimum_cash')} />
            </label>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Could not build the forecast. Try again in a moment.
          </div>
        )}

        {f?.warnings?.map((msg) => (
          <div key={msg} className="rounded-lg border border-border bg-accent/5 px-4 py-3 text-sm text-muted-foreground">
            {msg}
          </div>
        ))}

        {f?.first_negative_week && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Cash runs out in the week of {weekLabel(f.first_negative_week)} on these assumptions.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Cash today" value={money(f?.opening_cash, cur)} loading={isLoading} />
          <StatCard
            label="Lowest point"
            value={money(f?.lowest_closing, cur)}
            hint={f?.lowest_week ? `Week of ${weekLabel(f.lowest_week)}` : undefined}
            tone={num(f?.lowest_closing) < 0 ? 'destructive' : num(f?.lowest_closing) < scenario.minimum_cash ? 'warning' : 'success'}
            loading={isLoading}
          />
          <StatCard label="Customers owe" value={money(a?.open_receivables, cur)} hint="Collected by due date" loading={isLoading} />
          <StatCard label="Suppliers are owed" value={money(a?.open_payables, cur)} hint="Paid by due date" loading={isLoading} />
        </div>

        <ChartCard title="Money in, money out and closing cash" height={320} empty={!chart.length}>
          <ComposedChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="week" {...axis} />
            <YAxis tickFormatter={compactNumber} {...axis} width={56} />
            <Tooltip formatter={(val) => money(Number(val), cur)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} className="stroke-border" />
            {scenario.minimum_cash > 0 && <ReferenceLine y={scenario.minimum_cash} stroke={SERIES.outstanding} strokeDasharray="4 4" />}
            <Bar dataKey="inflow" name="Money in" fill={SERIES.revenue} />
            <Bar dataKey="outflow" name="Money out" fill={SERIES.expenses} />
            <Line dataKey="closing" name="Closing cash" stroke={SERIES.net} strokeWidth={2} dot={false} type="monotone" />
          </ComposedChart>
        </ChartCard>

        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm uppercase tracking-tight">Week by week</h3>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Week of</th>
                  <th className="px-4 py-2 text-right">Opening</th>
                  <th className="px-4 py-2 text-right">Sales receipts</th>
                  <th className="px-4 py-2 text-right">Customer payments</th>
                  <th className="px-4 py-2 text-right">Supplier bills</th>
                  <th className="px-4 py-2 text-right">Other spending</th>
                  <th className="px-4 py-2 text-right">Payroll</th>
                  <th className="px-4 py-2 text-right">Statutory</th>
                  <th className="px-4 py-2 text-right">Tax</th>
                  <th className="px-4 py-2 text-right">Closing</th>
                </tr>
              </thead>
              <tbody>
                {(f?.weeks ?? []).map((w) => (
                  <tr key={w.start} className={cn('border-b border-border/60 last:border-0', w.below_minimum && 'bg-destructive/5')}>
                    <td className="px-4 py-2">{weekLabel(w.start)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(w.opening, cur)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(w.trading_receipts, cur)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(w.collections, cur)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(w.supplier_payments, cur)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(w.direct_spend, cur)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(w.payroll, cur)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(w.statutory, cur)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(w.tax, cur)}</td>
                    <td className={cn('px-4 py-2 text-right font-semibold tabular-nums', num(w.closing) < 0 && 'text-destructive')}>{money(w.closing, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {a && (a.tax_payments?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="py-4">
              <h3 className="font-bold text-sm uppercase tracking-tight">Tax payments included</h3>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {(a.tax_payments ?? []).map((t, i) => (
                    <tr key={`${t.due}-${t.kind}-${i}`} className="border-t border-border/60">
                      <td className="px-4 py-2">{new Date(t.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-2 text-muted-foreground">{taxKind[t.kind] ?? t.kind}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{money(t.amount, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {a && (
          <p className="text-xs text-muted-foreground">
            Based on the last {a.trailing_weeks} weeks: sales receipts of {money(a.weekly_trading_receipts, cur)} and other spending of{' '}
            {money(a.weekly_direct_spend, cur)} a week, payroll of {money(a.monthly_payroll_net, cur)} and statutory remittances of{' '}
            {money(a.monthly_statutory, cur)} a month.
          </p>
        )}
      </div>
    </SubscriptionGate>
  );
}
