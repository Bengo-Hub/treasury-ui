'use client';

// DataTable column definitions for the Budgets list — split out of page.tsx to
// mirror the vendors/expenses list convention (see vendor-columns.tsx).

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
import type { Budget } from '@/lib/api/budgets';

export const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'secondary'> = {
  draft: 'secondary',
  approved: 'success',
  active: 'default',
  closed: 'outline' as any,
};

export interface BudgetColumnCallbacks {
  onApprove: (budget: Budget) => void;
  onRecompute: (budget: Budget) => void;
  approvePendingId?: string;
  recomputePendingId?: string;
}

export function buildBudgetColumns(cb: BudgetColumnCallbacks): DataTableColumn<Budget>[] {
  return [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      primary: true,
      accessor: (b) => b.name,
      render: (b) => <span className="font-bold">{b.name}</span>,
    },
    {
      key: 'period',
      header: 'Period',
      accessor: (b) => b.start_date,
      render: (b) => (
        <span className="text-muted-foreground">
          {new Date(b.start_date).toLocaleDateString()} - {new Date(b.end_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'fiscal_year',
      header: 'Fiscal Year',
      sortable: true,
      accessor: (b) => b.fiscal_year ?? '',
      render: (b) => b.fiscal_year || '---',
    },
    {
      key: 'total_planned',
      header: 'Total Planned',
      align: 'right',
      sortable: true,
      accessor: (b) => Number(b.total_amount),
      render: (b) => (
        <span className="font-bold">
          {b.currency} {Number(b.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      filterable: true,
      filterOptions: Object.keys(statusVariant).map((value) => ({ value })),
      accessor: (b) => b.status,
      render: (b) => <Badge variant={statusVariant[b.status] ?? 'secondary'}>{b.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      exportable: false,
      mobileAction: true,
      render: (budget) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => cb.onRecompute(budget)}
            disabled={cb.recomputePendingId === budget.id}
            title="Recompute actuals from the ledger"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cb.recomputePendingId === budget.id ? 'animate-spin' : ''}`} />
          </Button>
          {budget.status === 'draft' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cb.onApprove(budget)}
              disabled={cb.approvePendingId === budget.id}
              title="Approve"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      ),
    },
  ];
}
