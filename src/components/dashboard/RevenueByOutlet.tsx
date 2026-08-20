'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { useRevenueByOutlet } from '@/hooks/use-reports';
import { useOutletFilterStore } from '@/store/outlet-filter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

interface Props { tenant: string; from: string; to: string }

/**
 * RevenueByOutlet — GL revenue / COGS / gross-profit grouped by branch, for tenants viewing "All
 * Outlets" (see the Dashboard page, which only renders this panel then — a single-outlet view has
 * nothing to break down). Outlet names are resolved from the OutletFilter dropdown's own outlet
 * list (useOutletFilterStore) rather than a new backend lookup: treasury-api returns bare
 * outlet_ids since it has no local Outlet model of its own.
 */
export function RevenueByOutlet({ tenant, from, to }: Props) {
  const { data, isLoading } = useRevenueByOutlet(tenant, { from, to });
  const outlets = useOutletFilterStore((s) => s.outlets);
  const nameById = useMemo(() => Object.fromEntries(outlets.map((o) => [o.id, o.name])), [outlets]);

  const rows = (data?.outlets ?? [])
    .map((o) => ({
      name: o.outlet_id ? nameById[o.outlet_id] ?? `Outlet ${o.outlet_id.slice(0, 8)}` : 'Unattributed',
      revenue: Number(o.revenue),
      cogs: Number(o.cogs),
      grossProfit: Number(o.gross_profit),
    }))
    // Drop rows with literally nothing in them (e.g. an "Unattributed" bucket that came back all
    // zero) so a quiet period doesn't render an empty zero-height bar group.
    .filter((r) => r.revenue !== 0 || r.cogs !== 0 || r.grossProfit !== 0)
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <ChartCard
      title="Revenue by Outlet"
      subtitle="Revenue, cost of goods & gross profit per branch"
      empty={!isLoading && rows.length === 0}
      height={300}
    >
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0}
          angle={rows.length > 4 ? -20 : 0} textAnchor={rows.length > 4 ? 'end' : 'middle'} height={rows.length > 4 ? 50 : 30} />
        <YAxis tickFormatter={compactNumber} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
        <Tooltip formatter={(v) => money(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Revenue" fill={SERIES.revenue} radius={[4, 4, 0, 0]} />
        <Bar dataKey="cogs" name="Cost of Goods" fill={SERIES.expenses} radius={[4, 4, 0, 0]} />
        <Bar dataKey="grossProfit" name="Gross Profit" fill={SERIES.net} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}
