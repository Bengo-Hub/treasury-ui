'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { usePlatformTimeseries, type PlatformTimeseriesPoint } from '@/hooks/use-platform-analytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Props {
  from?: string;
  to?: string;
  tenantIds?: string;
}

type ChartPoint = { date: string; gmv: number; payg: number; ownRevenue: number; netProfit: number };

// Distinct from chart-theme's SERIES palette (which only covers revenue/expenses/net/outstanding)
// since this chart needs a 4th and 5th hue for GMV and PAYG commission.
const GMV_COLOR = '#8b5cf6'; // violet — total sales volume, kept visually distinct from revenue fills
const PAYG_COLOR = '#f59e0b'; // amber

// A long window (e.g. 12 months) of daily points is unreadable — collapse to monthly totals once
// the series spans more than ~2 months. Mirrors FinancialPerformanceChart's toChartSeries exactly.
function toChartSeries(rows: PlatformTimeseriesPoint[]): ChartPoint[] {
  if (rows.length <= 62) {
    return rows.map((p) => ({
      date: p.date.slice(5),
      gmv: Number(p.gmv),
      payg: Number(p.payg_commission),
      ownRevenue: Number(p.platform_own_revenue),
      netProfit: Number(p.net_profit),
    }));
  }
  const buckets = new Map<string, ChartPoint>();
  for (const p of rows) {
    const key = p.date.slice(0, 7); // YYYY-MM
    const label = new Date(`${p.date}T00:00:00`).toLocaleDateString('en', { month: 'short', year: '2-digit' });
    const b = buckets.get(key) ?? { date: label, gmv: 0, payg: 0, ownRevenue: 0, netProfit: 0 };
    b.gmv += Number(p.gmv);
    b.payg += Number(p.payg_commission);
    b.ownRevenue += Number(p.platform_own_revenue);
    b.netProfit += Number(p.net_profit);
    buckets.set(key, b);
  }
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

/**
 * PlatformRevenueTrendChart — platform-wide GMV / PAYG commission / platform's own revenue / net
 * profit over time, from the new `/platform/analytics/timeseries` endpoint. Follows
 * FinancialPerformanceChart's exact pattern (gradient AreaChart, monthly bucketing for long
 * windows) so this reads as the same visual system, not a one-off chart style.
 */
export function PlatformRevenueTrendChart({ from, to, tenantIds }: Props) {
  const { data, isLoading, isError } = usePlatformTimeseries(from, to, tenantIds);
  const series = toChartSeries(data?.series ?? []);
  const currency = data?.currency || 'KES';
  const isEmpty = !isLoading && (isError || series.length === 0);

  return (
    <ChartCard
      title="Platform Revenue Trend"
      subtitle="GMV, PAYG commission, platform's own revenue & net profit over time"
      empty={isEmpty}
      emptyText={isError ? 'Failed to load the revenue trend. Check your connection and try again.' : 'No revenue data for this period'}
      height={320}
    >
      <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gPlatGmv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={GMV_COLOR} stopOpacity={0.25} />
            <stop offset="95%" stopColor={GMV_COLOR} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gPlatPayg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PAYG_COLOR} stopOpacity={0.3} />
            <stop offset="95%" stopColor={PAYG_COLOR} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gPlatOwnRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={SERIES.revenue} stopOpacity={0.3} />
            <stop offset="95%" stopColor={SERIES.revenue} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compactNumber} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
        <Tooltip formatter={(v) => money(Number(v), currency)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="gmv" name="GMV" stroke={GMV_COLOR} fill="url(#gPlatGmv)" strokeWidth={2} />
        <Area type="monotone" dataKey="payg" name="PAYG Commission" stroke={PAYG_COLOR} fill="url(#gPlatPayg)" strokeWidth={2} />
        <Area type="monotone" dataKey="ownRevenue" name="Platform's Own Revenue" stroke={SERIES.revenue} fill="url(#gPlatOwnRev)" strokeWidth={2} />
        <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke={SERIES.net} fillOpacity={0} strokeWidth={2} />
      </AreaChart>
    </ChartCard>
  );
}
