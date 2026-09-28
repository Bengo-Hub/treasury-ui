'use client';

// DataTable column definitions for the Budgets list (vendors/expenses list convention).

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { num, type Budget, type BudgetStatus } from '@/lib/api/budgets';
import { formatCurrency } from '@/lib/utils/currency';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary';

export const statusVariant: Record<BudgetStatus, BadgeVariant> = {
  draft: 'secondary',
  submitted: 'warning',
  approved: 'success',
  active: 'default',
  closed: 'outline',
  rejected: 'error',
  revised: 'outline',
  cancelled: 'outline',
};

export const statusLabel: Record<BudgetStatus, string> = {
  draft: 'Draft',
  submitted: 'Awaiting approval',
  approved: 'Approved',
  active: 'Active',
  closed: 'Closed',
  rejected: 'Rejected',
  revised: 'Superseded',
  cancelled: 'Cancelled',
};

export const typeLabel: Record<string, string> = {
  operating: 'Operating',
  capex: 'Capital',
  project: 'Project',
  cash: 'Cash',
  revenue: 'Revenue',
  forecast: 'Forecast',
};

/** Spend (actual + committed) against the share of the window already elapsed. */
export function UtilisationBar({ used, elapsed }: { used: number; elapsed: number }) {
  const tone = used > 100 || used - elapsed > 20 ? 'bg-destructive' : used - elapsed > 5 || used >= 80 ? 'bg-yellow-500' : 'bg-green-600';
  return (
    <div className="min-w-30" title={`${used.toFixed(0)}% used, ${elapsed.toFixed(0)}% of the period elapsed`}>
      <div className="relative h-2 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.min(used, 100)}%` }} />
        <div className="absolute -top-0.5 h-3 w-0.5 bg-foreground/60" style={{ left: `${Math.min(elapsed, 100)}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
        {used.toFixed(0)}% used, {elapsed.toFixed(0)}% of time
      </p>
    </div>
  );
}

export function buildBudgetColumns(): DataTableColumn<Budget>[] {
  return [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      primary: true,
      accessor: (b) => b.name,
      render: (b) => (
        <div>
          <span className="font-semibold">{b.name}</span>
          {b.version > 1 && <span className="ml-2 text-xs text-muted-foreground">v{b.version}</span>}
          <p className="text-xs text-muted-foreground">{typeLabel[b.budget_type] ?? b.budget_type}</p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      sortable: true,
      accessor: (b) => b.start_date,
      render: (b) => (
        <span className="text-muted-foreground">
          {new Date(b.start_date).toLocaleDateString()} to {new Date(b.end_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'planned',
      header: 'Planned spend',
      align: 'right',
      sortable: true,
      accessor: (b) => num(b.totals?.planned_expense),
      render: (b) => <span className="font-semibold tabular-nums">{formatCurrency(num(b.totals?.planned_expense), b.currency)}</span>,
    },
    {
      key: 'actual',
      header: 'Spent',
      align: 'right',
      sortable: true,
      accessor: (b) => num(b.totals?.actual_expense),
      render: (b) => <span className="tabular-nums">{formatCurrency(num(b.totals?.actual_expense), b.currency)}</span>,
    },
    {
      key: 'committed',
      header: 'Committed',
      align: 'right',
      accessor: (b) => num(b.totals?.committed_expense),
      render: (b) => <span className="tabular-nums text-muted-foreground">{formatCurrency(num(b.totals?.committed_expense), b.currency)}</span>,
    },
    {
      key: 'utilisation',
      header: 'Used',
      sortable: true,
      accessor: (b) => b.totals?.utilisation_pct ?? 0,
      render: (b) => <UtilisationBar used={b.totals?.utilisation_pct ?? 0} elapsed={b.totals?.elapsed_pct ?? 0} />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      filterable: true,
      filterOptions: (Object.keys(statusLabel) as BudgetStatus[]).map((value) => ({ value, label: statusLabel[value] })),
      accessor: (b) => b.status,
      render: (b) => <Badge variant={statusVariant[b.status] ?? 'secondary'}>{statusLabel[b.status] ?? b.status}</Badge>,
    },
  ];
}
