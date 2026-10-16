'use client';

// DataTable column definitions for the Bills list — split out of page.tsx to
// mirror the vendors/expenses/budgets list convention.

import { Badge } from '@/components/ui/base';
import { RowActionMenu, type RowAction } from '@/components/ui/action-menu';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { billDocLabel, isSupplementaryBill, type AgingRow, type Bill } from '@/lib/api/bills';
import type { DocContext, DocType } from '@/lib/documents/actions';
import { formatCurrency } from '@/lib/utils/currency';

export const billStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  received: 'secondary',
  approved: 'secondary',
  pending: 'warning',
  partial: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'outline',
};

// A bill is payable whenever money is still owed on it — not tied to the (mostly unused) workflow
// status transitions draft/received/approved. A bare "pending"/"overdue" check here used to hide
// the Pay action for every normal bill, since nothing in this codebase ever writes those two
// statuses onto a freshly-created bill — it sits in "draft" until fully paid.
const PAYABLE_STATUSES = new Set(['draft', 'received', 'approved', 'pending', 'partial', 'overdue']);
export const isBillPayable = (b: Bill): boolean => b.document_type !== 'credit_note' && PAYABLE_STATUSES.has(b.status);

/** Which policy (lib/documents/actions.ts) governs a bills-table row. */
export const billDocType = (b: Bill): DocType => (b.document_type === 'credit_note' ? 'vendor_credit' : 'vendor_bill');

/** The row's state for the policy: what is paid, whether money is owed, and eTIMS availability. */
export const billDocContext = (b: Bill, etimsActive: boolean): DocContext => ({
  status: b.status,
  amountPaid: Number(b.amount_paid ?? 0),
  payable: isBillPayable(b),
  etimsActive,
  adjustable: !isSupplementaryBill(b),
});

export function buildBillColumns(actions: RowAction<Bill>[]): DataTableColumn<Bill>[] {
  return [
    {
      key: 'bill_number',
      header: 'Number',
      primary: true,
      sortable: true,
      accessor: (b) => b.bill_number,
      render: (b) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold">{b.bill_number}</span>
          <Badge variant={b.document_type === 'credit_note' ? 'warning' : isSupplementaryBill(b) ? 'secondary' : 'outline'}>
            {billDocLabel(b)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'vendor_name',
      header: 'Vendor',
      sortable: true,
      accessor: (b) => b.vendor_name ?? '',
      render: (b) => b.vendor_name || '---',
    },
    {
      key: 'total_amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      mobileAction: true,
      cellClassName: 'font-bold tabular-nums',
      accessor: (b) => Number(b.total_amount),
      render: (b) => formatCurrency(Number(b.total_amount), b.currency),
    },
    {
      key: 'balance_due',
      header: 'Balance Due',
      align: 'right',
      sortable: true,
      mobileHidden: true,
      cellClassName: 'tabular-nums',
      accessor: (b) => Number(b.balance_due ?? b.total_amount),
      render: (b) => {
        const due = Number(b.balance_due ?? b.total_amount);
        const paid = Number(b.amount_paid ?? 0);
        return (
          <span className={paid > 0 && due > 0 ? 'text-amber-600 font-semibold' : ''}>
            {formatCurrency(due, b.currency)}
          </span>
        );
      },
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      mobileHidden: true,
      accessor: (b) => b.due_date,
      render: (b) => new Date(b.due_date).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      filterable: true,
      filterOptions: Object.keys(billStatusVariant).map((value) => ({ value })),
      accessor: (b) => b.status,
      render: (b) => <Badge variant={billStatusVariant[b.status] ?? 'outline'}>{b.status}</Badge>,
    },
    {
      key: 'created_at',
      header: 'Created',
      align: 'right',
      sortable: true,
      mobileHidden: true,
      cellClassName: 'text-muted-foreground',
      accessor: (b) => b.created_at,
      render: (b) => new Date(b.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      exportable: false,
      // The shared three-dot menu, same as the invoices list; which actions show is decided by the
      // central policy (billDocType/billDocContext + allowedActions) in the page's bound actions.
      render: (bill) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <RowActionMenu row={bill} actions={actions} />
        </div>
      ),
    },
  ];
}

export function buildAgingColumns(): DataTableColumn<AgingRow>[] {
  return [
    {
      key: 'entity_name',
      header: 'Vendor',
      primary: true,
      sortable: true,
      cellClassName: 'font-medium',
      accessor: (r) => r.entity_name,
    },
    {
      key: 'current',
      header: 'Current',
      align: 'right',
      cellClassName: 'tabular-nums',
      accessor: (r) => Number(r.current),
      render: (r) => formatCurrency(Number(r.current)),
    },
    {
      key: 'days_1_to_30',
      header: '1-30',
      align: 'right',
      mobileHidden: true,
      cellClassName: 'tabular-nums',
      accessor: (r) => Number(r.days_1_to_30),
      render: (r) => formatCurrency(Number(r.days_1_to_30)),
    },
    {
      key: 'days_31_to_60',
      header: '31-60',
      align: 'right',
      mobileHidden: true,
      cellClassName: 'tabular-nums',
      accessor: (r) => Number(r.days_31_to_60),
      render: (r) => formatCurrency(Number(r.days_31_to_60)),
    },
    {
      key: 'days_61_to_90',
      header: '61-90',
      align: 'right',
      mobileHidden: true,
      cellClassName: 'tabular-nums',
      accessor: (r) => Number(r.days_61_to_90),
      render: (r) => formatCurrency(Number(r.days_61_to_90)),
    },
    {
      key: 'over_90',
      header: '90+',
      align: 'right',
      mobileHidden: true,
      cellClassName: 'tabular-nums',
      accessor: (r) => Number(r.over_90),
      render: (r) => formatCurrency(Number(r.over_90)),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortable: true,
      mobileAction: true,
      cellClassName: 'font-bold tabular-nums',
      accessor: (r) => Number(r.total),
      render: (r) => formatCurrency(Number(r.total)),
    },
  ];
}
