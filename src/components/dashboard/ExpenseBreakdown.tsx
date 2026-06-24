'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { CHART_COLORS, money } from '@/components/charts/chart-theme';
import { useProfitLossSummary } from '@/hooks/use-reports';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface Props { tenant: string; from: string; to: string }

/** ExpenseBreakdown — operating expenses by category as a donut, from the P&L summary. */
export function ExpenseBreakdown({ tenant, from, to }: Props) {
  const { data, isLoading } = useProfitLossSummary(tenant, from, to);
  const rows = (data?.by_category ?? [])
    .map((b) => ({ name: (b as any).category ?? (b as any).cost_center ?? 'Other', value: Number(b.amount) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <ChartCard title="Expenses by Category" subtitle="Where the money goes" height={280}
      empty={!isLoading && rows.length === 0}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => money(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ChartCard>
  );
}
