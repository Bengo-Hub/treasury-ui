'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { useBudgetUtilisation, useDimensionPnL } from '@/hooks/use-planning';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { num } from '@/lib/api/budgets';
import { cn } from '@/lib/utils';
import { UtilisationBar, typeLabel } from '../../budgets/budget-columns';

const axis = { tick: { fontSize: 11 }, tickLine: false, axisLine: false } as const;
const inputCls = 'h-9 rounded-lg border border-border bg-card px-2.5 text-sm';
const ragDot: Record<string, string> = { green: 'bg-green-600', amber: 'bg-yellow-500', red: 'bg-destructive' };
const ragText: Record<string, string> = { green: 'On track', amber: 'Watch', red: 'Over or running hot' };

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Profitability by cost centre or project, and a health check of every running budget. Both read
 * the booked ledger in KES, so the totals agree with the profit and loss statement.
 */
export default function ProfitabilityPage() {
  const router = useRouter();
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  const tenant = (isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId) ?? '';
  const [by, setBy] = useState<'cost_center' | 'project'>('cost_center');
  const [from, setFrom] = useState(`${today.getFullYear()}-01-01`);
  const [to, setTo] = useState(iso(today));

  const { data: pnl, isLoading, isFetching, error } = useDimensionPnL(tenant, { by, from, to });
  const { data: util, isLoading: utilLoading } = useBudgetUtilisation(tenant);

  const dimName = by === 'project' ? 'Project' : 'Cost centre';
  const unassigned = by === 'project' ? 'Not tagged to a project' : 'No cost centre';
  const rows = pnl?.rows ?? [];
  const chart = rows.slice(0, 12).map((r) => ({
    name: r.name || unassigned,
    revenue: num(r.revenue),
    costs: num(r.cost_of_sales) + num(r.expenses),
    profit: num(r.net_profit),
  }));

  return (
    <SubscriptionGate feature="bi_reports">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profitability and budget health</h1>
          <p className="text-muted-foreground mt-1">Which parts of the business make money, and which budgets are running ahead of plan.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="block text-xs text-muted-foreground">Group by</span>
            <select className={inputCls} value={by} onChange={(e) => setBy(e.target.value as 'cost_center' | 'project')}>
              <option value="cost_center">Cost centre</option>
              <option value="project">Project</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs text-muted-foreground">From</span>
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs text-muted-foreground">To</span>
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          {isFetching && <Loader2 className="mb-2 h-5 w-5 animate-spin text-muted-foreground" />}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">Could not load the report.</div>
        )}

        <ChartCard title={`Revenue, costs and profit by ${dimName.toLowerCase()}`} height={320} empty={!isLoading && !chart.length}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="name" {...axis} interval={0} tickFormatter={(n: string) => (n.length > 14 ? `${n.slice(0, 13)}...` : n)} />
            <YAxis tickFormatter={compactNumber} {...axis} width={56} />
            <Tooltip formatter={(val) => money(Number(val))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue" name="Revenue" fill={SERIES.revenue} />
            <Bar dataKey="costs" name="Costs" fill={SERIES.expenses} />
            <Bar dataKey="profit" name="Profit" fill={SERIES.net} />
          </BarChart>
        </ChartCard>

        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm uppercase tracking-tight">{dimName} profit and loss</h3>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">{dimName}</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Cost of sales</th>
                  <th className="px-4 py-2 text-right">Gross profit</th>
                  <th className="px-4 py-2 text-right">Expenses</th>
                  <th className="px-4 py-2 text-right">Net profit</th>
                  <th className="px-4 py-2 text-right">Margin</th>
                  <th className="px-4 py-2 text-right">Share of costs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id ?? 'none'} className="border-b border-border/60">
                    <td className={cn('px-4 py-2', !r.id && 'italic text-muted-foreground')}>{r.name || unassigned}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(r.revenue)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(r.cost_of_sales)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(r.gross_profit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(r.expenses)}</td>
                    <td className={cn('px-4 py-2 text-right font-semibold tabular-nums', num(r.net_profit) < 0 && 'text-destructive')}>{money(r.net_profit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.margin_pct == null ? '' : `${r.margin_pct.toFixed(1)}%`}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.cost_share_pct.toFixed(1)}%</td>
                  </tr>
                ))}
                {pnl && (
                  <tr className="font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(pnl.total.revenue)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(pnl.total.cost_of_sales)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(pnl.total.gross_profit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(pnl.total.expenses)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(pnl.total.net_profit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{pnl.total.margin_pct == null ? '' : `${pnl.total.margin_pct.toFixed(1)}%`}</td>
                    <td className="px-4 py-2" />
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm uppercase tracking-tight">Budget health</h3>
            <p className="text-xs text-muted-foreground">Spend (actual plus committed) against the share of each budget period already gone.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {utilLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {!utilLoading && (util ?? []).length === 0 && <p className="text-sm text-muted-foreground">No approved or running budgets.</p>}
            {(util ?? []).map((u) => (
              <button
                key={u.budget_id}
                className="grid w-full grid-cols-1 items-center gap-2 rounded-lg border border-border p-3 text-left hover:bg-accent/40 md:grid-cols-4"
                onClick={() => router.push(`/${orgSlug}/budgets/${u.budget_id}`)}
              >
                <span className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', ragDot[u.status])} title={ragText[u.status]} />
                  <span className="font-medium">{u.name}</span>
                  <span className="text-xs text-muted-foreground">{typeLabel[u.budget_type] ?? u.budget_type}</span>
                </span>
                <span className="text-sm tabular-nums">
                  {money(num(u.actual) + num(u.committed))} of {money(u.planned)}
                </span>
                <span className="text-xs text-muted-foreground">{ragText[u.status]}</span>
                <UtilisationBar used={u.utilisation_pct} elapsed={u.elapsed_pct} />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </SubscriptionGate>
  );
}
