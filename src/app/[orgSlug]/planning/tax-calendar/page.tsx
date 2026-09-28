'use client';

import { useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/charts/StatCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { useTaxCalendar } from '@/hooks/use-planning';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { num } from '@/lib/api/budgets';
import { monthLabel } from '../../reports/insights/_components/insights-sections';

const kindLabel: Record<string, string> = {
  statutory: 'PAYE, NSSF, SHIF and housing levy',
  vat: 'VAT',
  tot: 'Turnover Tax',
  wht: 'Withholding tax',
  instalment: 'Income tax instalment',
};

const axis = { tick: { fontSize: 11 }, tickLine: false, axisLine: false } as const;

/**
 * Tax calendar: every tax payment coming up, with the estimated amount and how it was estimated,
 * from the same estimates as the cash forecast (statutory deductions from recent payrolls, VAT or
 * TOT and withholding from last month's books, income tax instalments from profit to date).
 */
export default function TaxCalendarPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  const tenant = (isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId) ?? '';
  const [months, setMonths] = useState(3);
  const { data: cal, isLoading, isFetching, error } = useTaxCalendar(tenant, months);

  const payments = cal?.payments ?? [];
  const chart = Object.entries(cal?.by_month ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, v]) => ({ month: monthLabel(m, true), total: num(v) }));
  const next = payments[0];

  return (
    <SubscriptionGate feature="financial_planning">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tax calendar</h1>
            <p className="text-muted-foreground mt-1">Tax payments coming up, with estimated amounts, so the cash is there on the day.</p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            <select className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {[1, 3, 6, 12].map((n) => (
                <option key={n} value={n}>
                  Next {n} {n === 1 ? 'month' : 'months'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">Could not build the tax calendar.</div>
        )}
        {cal?.warnings?.map((w) => (
          <div key={w} className="rounded-lg border border-border bg-accent/5 px-4 py-3 text-sm text-muted-foreground">
            {w}
          </div>
        ))}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={`Total due, next ${months} ${months === 1 ? 'month' : 'months'}`} value={money(cal?.total)} loading={isLoading} />
          <StatCard
            label="Next payment"
            value={next ? money(next.amount) : 'Nothing due'}
            hint={next ? `${kindLabel[next.kind] ?? next.kind}, ${new Date(next.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : undefined}
            loading={isLoading}
          />
          <StatCard label="Payments" value={String(payments.length)} loading={isLoading} />
        </div>

        <ChartCard title="Tax due by month" height={260} empty={!isLoading && !chart.length}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="month" {...axis} />
            <YAxis tickFormatter={compactNumber} {...axis} width={56} />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Bar dataKey="total" name="Tax due" fill={SERIES.expenses} />
          </BarChart>
        </ChartCard>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 py-4">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Payments</h3>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {payments.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">{isLoading ? 'Loading...' : 'No tax payments estimated in this window.'}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Due</th>
                    <th className="px-4 py-2">Tax</th>
                    <th className="px-4 py-2">How it is estimated</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={`${p.due}-${p.kind}-${i}`} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {new Date(p.due).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2 font-medium">{kindLabel[p.kind] ?? p.kind}</td>
                      <td className="px-4 py-2 text-muted-foreground">{p.basis}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Estimates from your books, not filed returns: confirm amounts against your KRA iTax and eTIMS records before paying.
        </p>
      </div>
    </SubscriptionGate>
  );
}
