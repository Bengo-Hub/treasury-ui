'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { useTimeseries } from '@/hooks/use-analytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Props { tenant: string; from: string; to: string }

type TsPoint = { date: string; revenue: number | string; expenses: number | string; net_profit: number | string };
type ChartPoint = { date: string; revenue: number; expenses: number; net: number };

// A long window (e.g. 12 months) of daily points is unreadable — collapse to monthly totals once
// the series spans more than ~2 months. Short windows keep daily granularity.
function toChartSeries(rows: TsPoint[]): ChartPoint[] {
  if (rows.length <= 62) {
    return rows.map((p) => ({ date: p.date.slice(5), revenue: Number(p.revenue), expenses: Number(p.expenses), net: Number(p.net_profit) }));
  }
  const buckets = new Map<string, ChartPoint>();
  for (const p of rows) {
    const key = p.date.slice(0, 7); // YYYY-MM
    const label = new Date(`${p.date}T00:00:00`).toLocaleDateString('en', { month: 'short', year: '2-digit' });
    const b = buckets.get(key) ?? { date: label, revenue: 0, expenses: 0, net: 0 };
    b.revenue += Number(p.revenue);
    b.expenses += Number(p.expenses);
    b.net += Number(p.net_profit);
    buckets.set(key, b);
  }
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

/**
 * FinancialPerformanceChart — revenue / expenses / net profit from the real timeseries endpoint.
 * Daily for short windows; auto-collapsed to monthly totals for long (multi-month) windows so a
 * year of data stays legible. Reuses ChartCard.
 */
export function FinancialPerformanceChart({ tenant, from, to }: Props) {
  const { data, isLoading } = useTimeseries(tenant, { from, to });
  const series = toChartSeries(data?.series ?? []);

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
