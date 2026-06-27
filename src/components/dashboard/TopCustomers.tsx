'use client';

import { Card } from '@/components/ui/base';
import { money } from '@/components/charts/chart-theme';
import { useARAging } from '@/hooks/use-invoices';

interface Props { tenant: string }

/** TopCustomers — the largest debtors by outstanding balance, from AR aging. */
export function TopCustomers({ tenant }: Props) {
  const { data, isLoading } = useARAging(tenant);
  const rows = [...(data?.rows ?? [])]
    .map((r) => ({ name: r.entity_name || 'Unknown', total: Number(r.total) }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);
  const max = rows[0]?.total ?? 1;

  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold">Top Debtors</h3>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-muted" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No outstanding customer balances.</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {rows.map((r, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{r.name}</span>
                <span className="font-medium tabular-nums">{money(r.total)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(4, (r.total / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
