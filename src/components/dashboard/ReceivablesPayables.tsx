'use client';

import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { PayablesDueList, ReceivablesDueList } from '@/components/dashboard/ArApDueLists';
import { useARAging, useARSummary } from '@/hooks/use-invoices';
import { useAPAging } from '@/hooks/use-bills';
import { useAPSummary } from '@/hooks/use-arpa';
import { cn } from '@/lib/utils';

interface AgingRowLike {
  current: string; days_1_to_30: string; days_31_to_60: string; days_61_to_90: string; over_90: string;
}

const BUCKETS = [
  { key: 'current', label: 'Current', tone: 'text-emerald-600' },
  { key: 'days_1_to_30', label: '1–30d', tone: 'text-lime-600' },
  { key: 'days_31_to_60', label: '31–60d', tone: 'text-amber-600' },
  { key: 'days_61_to_90', label: '61–90d', tone: 'text-orange-600' },
  { key: 'over_90', label: '90d+', tone: 'text-destructive' },
] as const;

/** Compact aging distribution chips (replaces the old full-height bar chart). */
function AgingChips({ rows }: { rows: AgingRowLike[] }) {
  const data = BUCKETS.map((b) => ({
    ...b,
    amount: rows.reduce((s, r) => s + Number((r as any)[b.key] ?? 0), 0),
  })).filter((d) => d.amount > 0.0001);
  if (data.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      {data.map((d) => (
        <span key={d.key} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px]">
          <span className="text-muted-foreground">{d.label}</span>
          <span className={cn('font-bold tabular-nums', d.tone)}>{money(d.amount)}</span>
        </span>
      ))}
    </div>
  );
}

interface Props { tenant: string }

/**
 * ReceivablesPayables — headline AR/AP balances + actionable due/overdue LISTS (GoDigital
 * pattern): each receivable row settles via Record payment, each payable row deep-links into
 * the Bills pay flow. The old aging bar charts are condensed into distribution chips above
 * each list.
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-start">
        <div className="space-y-2">
          <AgingChips rows={arAging.data?.rows ?? []} />
          <ReceivablesDueList tenant={tenant} />
        </div>
        <div className="space-y-2">
          <AgingChips rows={apAging.data?.rows ?? []} />
          <PayablesDueList tenant={tenant} />
        </div>
      </div>
    </div>
  );
}
