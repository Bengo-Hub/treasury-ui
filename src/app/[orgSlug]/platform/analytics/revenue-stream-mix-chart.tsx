'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { CHART_COLORS, money } from '@/components/charts/chart-theme';
import { usePlatformRevenueStreams } from '@/hooks/use-platform-analytics';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface Props {
  from?: string;
  to?: string;
  tenantIds?: string;
}

/**
 * RevenueStreamMixChart — the platform's own-revenue composition (subscriptions, platform fees,
 * payment processing, PAYG commission, other) as a donut, from `/platform/analytics/revenue-streams`.
 * Mirrors ExpenseBreakdown.tsx's donut pattern exactly (same chart family, same conventions).
 */
export function RevenueStreamMixChart({ from, to, tenantIds }: Props) {
  const { data, isLoading, isError } = usePlatformRevenueStreams(from, to, tenantIds);
  const currency = data?.currency || 'KES';

  const rows = data
    ? [
        { name: 'Subscriptions', value: Number(data.subscription_revenue) },
        { name: 'Platform Fees', value: Number(data.platform_fee_revenue) },
        { name: 'Payment Processing', value: Number(data.payment_processing_revenue) },
        { name: 'PAYG Commission', value: Number(data.payg_commission) },
        { name: 'Other', value: Number(data.other_own_revenue) },
      ]
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
    : [];

  const isEmpty = !isLoading && (isError || rows.length === 0);

  return (
    <ChartCard
      title="Revenue Stream Mix"
      subtitle="Where platform revenue comes from"
      height={280}
      empty={isEmpty}
      emptyText={isError ? 'Failed to load revenue streams. Check your connection and try again.' : 'No revenue in this period'}
    >
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => money(Number(v), currency)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ChartCard>
  );
}
