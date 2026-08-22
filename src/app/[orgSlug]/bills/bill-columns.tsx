'use client';

// DataTable column definitions for the Bills list — split out of page.tsx to
// mirror the vendors/expenses/budgets list convention.

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { AgingRow, Bill } from '@/lib/api/bills';
import { formatCurrency } from '@/lib/utils/currency';
import { CreditCard, Loader2, ShieldCheck, Upload } from 'lucide-react';

export const billStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  pending: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'outline',
};

export interface BillColumnCallbacks {
  onPay: (bill: Bill) => void;
  onApprove: (bill: Bill) => void;
  onTransmit: (bill: Bill) => void;
  transmitPending: boolean;
  transmitPendingBillId?: string;
}

export function buildBillColumns(cb: BillColumnCallbacks): DataTableColumn<Bill>[] {
  return [
    {
      key: 'bill_number',
      header: 'Bill #',
      primary: true,
      sortable: true,
      accessor: (b) => b.bill_number,
      render: (b) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold">{b.bill_number}</span>
          {b.document_type === 'credit_note' ? (
            <Badge variant="warning">Credit Note</Badge>
          ) : (
            <Badge variant="outline">Bill</Badge>
          )}
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
      render: (bill) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          {bill.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              title="Submit this bill for sign-off before it can be paid"
              onClick={() => cb.onApprove(bill)}
            >
              <ShieldCheck className="h-3 w-3" /> Approval
            </Button>
          )}
          {(bill.status === 'pending' || bill.status === 'overdue') && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => cb.onPay(bill)}>
              <CreditCard className="h-3 w-3" /> Pay
            </Button>
          )}
          {bill.status !== 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              title="Transmit this purchase to KRA eTIMS (buyer-initiated / self-billed for non-eTIMS suppliers)"
              disabled={cb.transmitPending}
              onClick={() => cb.onTransmit(bill)}
            >
              {cb.transmitPending && cb.transmitPendingBillId === bill.id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Upload className="h-3 w-3" />} eTIMS
            </Button>
          )}
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
