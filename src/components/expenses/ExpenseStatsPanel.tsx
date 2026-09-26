'use client';

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Clock, Hourglass, Receipt } from 'lucide-react';
import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/charts/StatCard';
import { CHART_COLORS, SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import type { ExpenseStats } from '@/lib/api/expenses';

/** "2026-09" -> "Sep 26". */
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 1)).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', year: '2-digit' });
}

/**
 * Expenses summary: headline cards and two charts (monthly spend, spend by category) for the
 * list's current filters. Figures come from the server-side stats, so they cover every matching
 * expense, not only the page on screen. Spend is incurred cost (approved, reimbursed, paid).
 */
export function ExpenseStatsPanel({ stats, loading }: { stats?: ExpenseStats; loading?: boolean }) {
  const cur = stats?.currency ?? 'KES';
  const monthly = (stats?.monthly ?? []).map((m) => ({ month: monthLabel(m.month), amount: Number(m.amount), count: m.count }));
  const categories = (stats?.by_category ?? []).map((c) => ({ name: c.category_name, value: Number(c.amount) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Spend"
          value={money(stats?.total_spend, cur)}
          hint={`${stats?.total_count ?? 0} expenses${Number(stats?.tax_amount ?? 0) > 0 ? `, tax ${money(stats?.tax_amount, cur)}` : ''}`}
          tone="destructive"
          loading={loading}
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard label="Paid" value={money(stats?.paid, cur)} hint="Paid or reimbursed" tone="success" loading={loading} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Outstanding" value={money(stats?.outstanding, cur)} hint="Approved, not yet paid" tone="warning" loading={loading} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Pending Approval" value={money(stats?.pending_approval, cur)} hint="Submitted, not yet spend" tone="primary" loading={loading} icon={<Hourglass className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Monthly spend" subtitle="Incurred expenses per month" className="lg:col-span-2" height={240} empty={!loading && monthly.length === 0}>
          <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={compactNumber} tick={{ fontSize: 11 }} width={48} />
            <Tooltip formatter={(v) => money(Number(v), cur)} />
            <Bar dataKey="amount" name="Spend" fill={SERIES.expenses} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="By category" subtitle="Where the money went" height={240} empty={!loading && categories.length === 0}>
          <PieChart>
            <Pie data={categories} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {categories.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => money(Number(v), cur)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  );
}
