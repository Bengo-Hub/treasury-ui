'use client';

// DataTable column definitions for the Settlements (Payout History) list —
// split out of page.tsx to mirror the vendors/expenses/budgets list convention.

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { PayoutRecord } from '@/lib/api/analytics';

export function payoutStatusVariant(status: string): 'success' | 'warning' | 'error' {
  return status === 'completed' || status === 'settled' ? 'success' : status === 'pending' || status === 'processing' ? 'warning' : 'error';
}

export function buildPayoutColumns(): DataTableColumn<PayoutRecord>[] {
  return [
    {
      key: 'reference',
      header: 'Reference',
      primary: true,
      sortable: true,
      accessor: (b) => b.reference,
      cellClassName: 'font-mono text-xs font-bold',
    },
    {
      key: 'transaction_count',
      header: 'Txns',
      align: 'center',
      mobileHidden: true,
      accessor: (b) => b.transaction_count,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      accessor: (b) => Number(b.amount),
      render: (b) => `${b.currency} ${b.amount}`,
    },
    {
      key: 'fee',
      header: 'Fees',
      align: 'right',
      mobileHidden: true,
      cellClassName: 'text-muted-foreground',
      accessor: (b) => Number(b.fee),
      render: (b) => `${b.currency} ${b.fee}`,
    },
    {
      key: 'net_amount',
      header: 'Net',
      align: 'right',
      sortable: true,
      mobileAction: true,
      cellClassName: 'font-bold',
      accessor: (b) => Number(b.net_amount),
      render: (b) => `${b.currency} ${b.net_amount}`,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      filterable: true,
      accessor: (b) => b.status,
      render: (b) => <Badge variant={payoutStatusVariant(b.status)}>{b.status}</Badge>,
    },
    {
      key: 'period',
      header: 'Period / Created',
      align: 'right',
      mobileHidden: true,
      cellClassName: 'text-muted-foreground',
      accessor: (b) => b.period_start || b.created_at,
      render: (b) =>
        b.period_start ? `${b.period_start.slice(0, 10)} – ${b.period_end?.slice(0, 10) ?? ''}` : new Date(b.created_at).toLocaleString(),
    },
  ];
}
