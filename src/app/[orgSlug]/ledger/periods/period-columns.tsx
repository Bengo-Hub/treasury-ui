'use client';

// DataTable column definitions for the Accounting Periods list — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention.

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { AccountingPeriod } from '@/lib/api/ledger';
import { Lock } from 'lucide-react';

export const periodStatusVariant: Record<string, 'default' | 'warning' | 'success' | 'error' | 'secondary'> = {
  open: 'success',
  closing: 'warning',
  closed: 'secondary',
};

export interface PeriodColumnCallbacks {
  onClose: (period: AccountingPeriod) => void;
}

export function buildPeriodColumns(cb: PeriodColumnCallbacks): DataTableColumn<AccountingPeriod>[] {
  return [
    { key: 'name', header: 'Name', primary: true, sortable: true, cellClassName: 'font-bold', accessor: (p) => p.name },
    { key: 'period_type', header: 'Type', cellClassName: 'capitalize text-muted-foreground', accessor: (p) => p.period_type },
    { key: 'start_date', header: 'Start', sortable: true, accessor: (p) => p.start_date, render: (p) => new Date(p.start_date).toLocaleDateString() },
    { key: 'end_date', header: 'End', mobileHidden: true, accessor: (p) => p.end_date, render: (p) => new Date(p.end_date).toLocaleDateString() },
    {
      key: 'status', header: 'Status', align: 'center', filterable: true,
      filterOptions: Object.keys(periodStatusVariant).map((value) => ({ value })),
      accessor: (p) => p.status, render: (p) => <Badge variant={periodStatusVariant[p.status] ?? 'outline'} className="capitalize">{p.status}</Badge>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right', exportable: false, mobileAction: true,
      render: (period) =>
        period.status !== 'closed' ? (
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={(e: React.MouseEvent) => { e.stopPropagation(); cb.onClose(period); }} title="Close period">
            <Lock className="h-3.5 w-3.5" /> Close
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Closed{period.closed_at ? ` · ${new Date(period.closed_at).toLocaleDateString()}` : ''}
          </span>
        ),
    },
  ];
}
