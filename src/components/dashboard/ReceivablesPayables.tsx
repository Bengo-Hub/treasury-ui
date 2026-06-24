'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { useARAging, useARSummary } from '@/hooks/use-invoices';
import { useAPAging } from '@/hooks/use-bills';
import { useAPSummary } from '@/hooks/use-arpa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface AgingRowLike {
  current: string; days_1_to_30: string; days_31_to_60: string; days_61_to_90: string; over_90: string;
}

const BUCKETS = [
  { key: 'current', label: 'Current', color: '#10b981' },
  { key: 'days_1_to_30', label: '1–30d', color: '#84cc16' },
  { key: 'days_31_to_60', label: '31–60d', color: '#f59e0b' },
  { key: 'days_61_to_90', label: '61–90d', color: '#f97316' },
  { key: 'over_90', label: '90d+', color: '#ef4444' },
] as const;

// AgingChart sums each bucket across rows into a single aging distribution bar — reused for AR + AP.
function AgingChart({ title, rows, empty }: { title: string; rows: AgingRowLike[]; empty: boolean }) {
  const data = BUCKETS.map((b) => ({
    label: b.label,
    color: b.color,
    amount: rows.reduce((s, r) => s + Number((r as any)[b.key] ?? 0), 0),
  }));
  return (
    <ChartCard title={title} subtitle="Outstanding by age" height={240} empty={empty}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => money(v).replace('KES', '').trim()} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
        <Tooltip formatter={(v) => money(Number(v))} />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}

interface Props { tenant: string }

/**
 * ReceivablesPayables — debtors (AR) and creditors (AP) aging + headline balances. Self-contained
 * widget reusing the shared aging chart + StatCard, and the existing AR/AP hooks.
 */
export function ReceivablesPayables({ tenant }: Props) {
  const arAging = useARAging(tenant);
  const apAging = useAPAging(tenant);
  const arSummary = useARSummary(tenant);
  const apSummary = useAPSummary(tenant);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Receivable" value={money(arSummary.data?.total_receivable)} tone="primary" loading={arSummary.isLoading} />
        <StatCard label="AR Overdue" value={money(arSummary.data?.overdue)} tone="destructive" loading={arSummary.isLoading} />
        <StatCard label="Total Payable" value={money(apSummary.data?.total_payable)} tone="warning" loading={apSummary.isLoading} />
        <StatCard label="AP Overdue" value={money(apSummary.data?.overdue)} tone="destructive" loading={apSummary.isLoading} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgingChart title="Debtors (Receivables)" rows={arAging.data?.rows ?? []} empty={!arAging.isLoading && !(arAging.data?.rows?.length)} />
        <AgingChart title="Creditors (Payables)" rows={apAging.data?.rows ?? []} empty={!apAging.isLoading && !(apAging.data?.rows?.length)} />
      </div>
    </div>
  );
}
