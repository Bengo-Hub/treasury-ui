'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { useTimeseries } from '@/hooks/use-analytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Props { tenant: string; from: string; to: string }

/**
 * FinancialPerformanceChart — daily revenue / expenses / net profit from the real timeseries
 * endpoint (replaces the old chart derived from the last 6 transactions). Reuses ChartCard.
 */
export function FinancialPerformanceChart({ tenant, from, to }: Props) {
  const { data, isLoading } = useTimeseries(tenant, { from, to });
  const series = (data?.series ?? []).map((p) => ({
    date: p.date.slice(5),
    revenue: Number(p.revenue),
    expenses: Number(p.expenses),
    net: Number(p.net_profit),
  }));

  return (
    <ChartCard
      title="Financial Performance"
      subtitle="Revenue, expenses & net profit over time"
      empty={!isLoading && series.length === 0}
      height={300}
    >
      <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SERIES.revenue} stopOpacity={0.3} />
            <stop offset="95%" stopColor={SERIES.revenue} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SERIES.expenses} stopOpacity={0.25} />
            <stop offset="95%" stopColor={SERIES.expenses} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compactNumber} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
        <Tooltip formatter={(v) => money(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke={SERIES.revenue} fill="url(#gRev)" strokeWidth={2} />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke={SERIES.expenses} fill="url(#gExp)" strokeWidth={2} />
        <Area type="monotone" dataKey="net" name="Net Profit" stroke={SERIES.net} fillOpacity={0} strokeWidth={2} />
      </AreaChart>
    </ChartCard>
  );
}
