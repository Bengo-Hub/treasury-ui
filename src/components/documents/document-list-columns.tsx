'use client';

// Column definitions for SharedDocumentList's shared DataTable — split out so the
// list component stays small. Sorting + funnel filtering run client-side over the
// loaded page; visibility is persisted by the DataTable via the host's storageKey.

import { Badge } from '@/components/ui/base';
import { FileText } from 'lucide-react';
import { RowActionMenu } from '@/components/ui/action-menu';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import {
  deliveryVariant,
  fmt,
  paymentVariant,
  statusVariant,
  type DocAction,
  type DocumentRow,
} from './document-list-parts';

export interface DocumentColumnOptions {
  showTenant: boolean;
  showDeliveryStatus: boolean;
  showPaymentStatus: boolean;
  showDueDate: boolean;
  secondaryDateLabel?: string;
  actions: DocAction[];
  onRowPreview?: (id: string) => void;
}

export function buildDocumentColumns({
  showTenant,
  showDeliveryStatus,
  showPaymentStatus,
  showDueDate,
  secondaryDateLabel,
  actions,
  onRowPreview,
}: DocumentColumnOptions): DataTableColumn<DocumentRow>[] {
  const cols: DataTableColumn<DocumentRow>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      accessor: (r) => r.doc_date ?? '',
      render: (r) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
          {r.doc_date ? new Date(r.doc_date).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'doc_number',
      header: 'Doc #',
      sortable: true,
      accessor: (r) => r.doc_number,
      render: (r) => (
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-mono text-xs font-bold text-foreground">{r.doc_number}</span>
        </div>
      ),
    },
  ];
  if (showTenant) {
    cols.push({
      key: 'tenant',
      header: 'Tenant',
      sortable: true,
      filterable: true,
      accessor: (r) => r.tenant_name ?? '',
      render: (r) => (
        <span className="inline-flex items-center rounded-md bg-accent/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
          {r.tenant_name || '—'}
        </span>
      ),
    });
  }
  cols.push(
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      accessor: (r) => r.customer_name ?? '',
      render: (r) => (
        <div>
          <div className="text-xs font-medium text-foreground">{r.customer_name || '—'}</div>
          {r.customer_email && <div className="text-[11px] text-muted-foreground">{r.customer_email}</div>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      accessor: (r) => Number(r.total_amount),
      render: (r) => (
        <span className="font-mono text-xs font-bold text-foreground whitespace-nowrap">
          {fmt(r.total_amount, r.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      filterable: true,
      accessor: (r) => r.status,
      render: (r) => (
        <Badge variant={statusVariant(r.status)} className="capitalize text-[10px]">
          {r.status?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
  );
  if (showDeliveryStatus) {
    cols.push({
      key: 'delivery_status',
      header: 'Delivery',
      align: 'center',
      filterable: true,
      accessor: (r) => r.delivery_status || 'draft',
      render: (r) => (
        <Badge variant={deliveryVariant(r.delivery_status || 'draft')} className="capitalize text-[10px]">
          {(r.delivery_status || 'draft').replace(/_/g, ' ')}
        </Badge>
      ),
    });
  }
  if (showPaymentStatus) {
    cols.push({
      key: 'payment_status',
      header: 'Payment',
      align: 'center',
      filterable: true,
      defaultHidden: true,
      accessor: (r) => r.payment_status ?? '',
      render: (r) =>
        r.payment_status ? (
          <Badge variant={paymentVariant(r.payment_status)} className="capitalize text-[10px]">
            {r.payment_status}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    });
  }
  if (showDueDate) {
    cols.push({
      key: 'due_date',
      header: 'Due Date',
      align: 'right',
      sortable: true,
      defaultHidden: true,
      accessor: (r) => r.due_date ?? '',
      render: (r) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}
        </span>
      ),
    });
  }
  if (secondaryDateLabel) {
    cols.push({
      key: 'secondary_date',
      header: secondaryDateLabel,
      align: 'center',
      sortable: true,
      defaultHidden: true,
      accessor: (r) => r.secondary_date ?? '',
      render: (r) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {r.secondary_date ? new Date(r.secondary_date).toLocaleDateString() : '—'}
        </span>
      ),
    });
  }
  if (actions.length > 0 || onRowPreview) {
    cols.push({
      key: 'actions',
      header: 'Actions',
      align: 'center',
      exportable: false,
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {onRowPreview && (
            <button
              title="Quick Preview"
              onClick={() => onRowPreview(row.id)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
          {actions.length > 0 && <RowActionMenu row={row} actions={actions} />}
        </div>
      ),
    });
  }
  return cols;
}
