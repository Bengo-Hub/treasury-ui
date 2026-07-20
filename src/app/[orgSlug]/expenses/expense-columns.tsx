'use client';

// DataTable column definitions + shared accessors for the Expenses list — split
// out of page.tsx to keep the page small. Accessors are shared with the page's
// host-side sort/funnel processing (controlled DataTable mode) so filtering and
// sorting run over the whole loaded list before client pagination.

import { Badge } from '@/components/ui/base';
import { RowActionMenu, type RowAction } from '@/components/ui/action-menu';
import type { DataTableColumn, FilterOption } from '@bengo-hub/shared-ui-lib/data-table';
import type { Expense } from '@/lib/api/expenses';
import { formatCurrency } from '@/lib/utils/currency';

export const expenseStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  submitted: 'default',
  approved: 'success',
  rejected: 'error',
  paid: 'success',
  reimbursed: 'success',
  cancelled: 'outline',
};

export const EXPENSE_ACCESSORS: Record<string, (exp: Expense) => unknown> = {
  expense_number: (exp) => exp.expense_number,
  category: (exp) => exp.category_name || '',
  description: (exp) => exp.description || '',
  amount: (exp) => Number(exp.total_amount),
  status: (exp) => (exp.status === 'reimbursed' ? 'paid' : exp.status),
  date: (exp) => exp.expense_date,
};

export function buildExpenseColumns({
  categoryOptions,
  statusOptions,
  rowActions,
}: {
  categoryOptions: FilterOption[];
  statusOptions: FilterOption[];
  rowActions: RowAction<Expense>[];
}): DataTableColumn<Expense>[] {
  return [
    {
      key: 'expense_number',
      header: 'Expense #',
      sortable: true,
      accessor: EXPENSE_ACCESSORS.expense_number,
      render: (exp) => <span className="font-mono text-xs font-bold">{exp.expense_number}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      filterOptions: categoryOptions,
      accessor: EXPENSE_ACCESSORS.category,
      render: (exp) => <span className="text-xs">{exp.category_name || '---'}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      accessor: EXPENSE_ACCESSORS.description,
      render: (exp) => (
        <div className="text-xs max-w-60">
          <span className="block truncate">{exp.description}</span>
          {(exp.invoice_id || exp.billable) && (
            <span className="mt-1 inline-flex items-center gap-1.5">
              {exp.invoice_id && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  Linked to invoice
                </span>
              )}
              {exp.billable && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {exp.billed ? 'Billed' : 'Billable'}
                </span>
              )}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      accessor: EXPENSE_ACCESSORS.amount,
      render: (exp) => (
        <span className="font-bold text-xs tabular-nums">{formatCurrency(Number(exp.total_amount), exp.currency)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      filterable: true,
      filterOptions: statusOptions,
      accessor: EXPENSE_ACCESSORS.status,
      render: (exp) => (
        <Badge variant={expenseStatusVariant[exp.status] ?? 'outline'}>
          {exp.status === 'reimbursed' ? 'paid' : exp.status}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      align: 'right',
      sortable: true,
      accessor: EXPENSE_ACCESSORS.date,
      render: (exp) => (
        <span className="text-xs text-muted-foreground">{new Date(exp.expense_date).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      exportable: false,
      render: (exp) => <RowActionMenu row={exp} actions={rowActions} />,
    },
  ];
}
