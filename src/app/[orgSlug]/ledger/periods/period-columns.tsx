'use client';

// DataTable column definitions for the Accounting Periods list — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention.

import { Badge, Button } from '@/components/ui/base';
import { money } from '@/components/charts/chart-theme';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { PeriodSummary } from '@/lib/api/ledger';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

export const periodStatusVariant: Record<string, 'default' | 'warning' | 'success' | 'error' | 'secondary'> = {
  open: 'success',
  closing: 'warning',
  closed: 'secondary',
};

export interface PeriodColumnCallbacks {
  onClose: (period: PeriodSummary) => void;
  /** Id of the only period that can be closed now (the oldest ended-but-open one). */
  nextToCloseId?: string;
}

/** Status badge: closed, current, ready to close (ended but open) or open (future). */
export function PeriodStateBadge({ period }: { period: PeriodSummary }) {
  if (period.status === 'closed') return <Badge variant="secondary">Closed</Badge>;
  if (period.needs_closing) return <Badge variant="warning">Ready to close</Badge>;
  if (period.is_current) return <Badge variant="success">Current</Badge>;
  return <Badge variant={periodStatusVariant[period.status] ?? 'outline'} className="capitalize">{period.status}</Badge>;
}

export function buildPeriodColumns(cb: PeriodColumnCallbacks): DataTableColumn<PeriodSummary>[] {
  return [
    { key: 'name', header: 'Period', primary: true, cellClassName: 'font-bold', accessor: (p) => p.name },
    { key: 'start_date', header: 'Start', mobileHidden: true, accessor: (p) => p.start_date, render: (p) => new Date(p.start_date).toLocaleDateString() },
    { key: 'end_date', header: 'End', mobileHidden: true, accessor: (p) => p.end_date, render: (p) => new Date(p.end_date).toLocaleDateString() },
    { key: 'revenue', header: 'Revenue', align: 'right', accessor: (p) => Number(p.revenue), render: (p) => money(p.revenue) },
    { key: 'expenses', header: 'Expenses', align: 'right', accessor: (p) => Number(p.expenses), render: (p) => money(p.expenses) },
    {
      key: 'net_profit', header: 'Net Profit', align: 'right', accessor: (p) => Number(p.net_profit),
      render: (p) => (
        <span className={cn('font-semibold', Number(p.net_profit) < 0 ? 'text-destructive' : 'text-emerald-600')}>
          {money(p.net_profit)}
        </span>
      ),
    },
    { key: 'entry_count', header: 'Entries', align: 'right', mobileHidden: true, accessor: (p) => p.entry_count },
    {
      key: 'status', header: 'Status', align: 'center', filterable: true,
      filterOptions: Object.keys(periodStatusVariant).map((value) => ({ value })),
      accessor: (p) => p.status, render: (p) => <PeriodStateBadge period={p} />,
    },
    {
      key: 'actions', header: 'Actions', align: 'right', exportable: false, mobileAction: true,
      render: (period) => {
        if (period.status === 'closed') {
          return (
            <span className="text-xs text-muted-foreground">
              Closed{period.closed_at ? ` on ${new Date(period.closed_at).toLocaleDateString()}` : ''}
            </span>
          );
        }
        if (!period.needs_closing) return <span className="text-xs text-muted-foreground">In progress</span>;
        const canClose = period.id === cb.nextToCloseId;
        return (
          <Button
            size="sm"
            variant={canClose ? 'outline' : 'ghost'}
            className="gap-1.5"
            disabled={!canClose}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); cb.onClose(period); }}
            title={canClose ? 'Close period' : 'Close the earlier periods first'}
          >
            <Lock className="h-3.5 w-3.5" /> Close
          </Button>
        );
      },
    },
  ];
}
