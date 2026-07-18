'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/charts/StatCard';
import { SERIES, money } from '@/components/charts/chart-theme';
import { useMoneyFlow } from '@/hooks/use-analytics';
import { useARSummary } from '@/hooks/use-invoices';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Props { tenant: string; from: string; to: string }

/**
 * MoneyFlow — Outstanding vs Collections KPIs + money-in/out by service. Reuses the money-flow
 * endpoint + AR summary (data ownership: treasury owns AR). Collection rate = collected / (collected
 * + still outstanding).
 */
export function MoneyFlow({ tenant, from, to }: Props) {
  const flow = useMoneyFlow(tenant, { from, to });
  const ar = useARSummary(tenant);

  const collections = Number(flow.data?.total_in ?? 0);
  const outstanding = Number(ar.data?.total_receivable ?? 0);
  const denom = collections + outstanding;
  const rate = denom > 0 ? (collections / denom) * 100 : 0;

  // Friendly labels for the synthetic finance-module rows the backend appends alongside the
  // gateway services (see treasury-api MoneyFlow): direct (non-gateway) sales + GL expenses.
  const SERVICE_LABELS: Record<string, string> = {
    direct_sales: 'Direct sales',
    expenses: 'Expenses',
    pos: 'POS',
    ordering: 'Ordering',
    treasury: 'Treasury',
    subscription: 'Subscriptions',
  };
  const data = (flow.data?.services ?? []).map((s) => ({
    name: SERVICE_LABELS[s.source_service] ?? s.source_service,
    in: Number(s.money_in),
    out: Number(s.costs),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total Outstanding" value={money(outstanding)} tone="warning" loading={ar.isLoading} />
        <StatCard label="Collections" value={money(collections)} tone="success" loading={flow.isLoading} />
        <StatCard label="Collection Rate" value={`${rate.toFixed(1)}%`} tone={rate >= 70 ? 'success' : rate >= 40 ? 'warning' : 'destructive'} loading={flow.isLoading || ar.isLoading} />
      </div>
      <ChartCard title="Money In vs Out" subtitle="By service" height={240}
        empty={!flow.isLoading && data.length === 0}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => money(v).replace('KES', '').trim()} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
          <Tooltip formatter={(v) => money(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="in" name="Money In" fill={SERIES.collections} radius={[4, 4, 0, 0]} />
          <Bar dataKey="out" name="Costs / Out" fill={SERIES.expenses} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
