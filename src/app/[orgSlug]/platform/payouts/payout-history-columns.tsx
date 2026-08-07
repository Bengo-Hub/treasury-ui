'use client';

// DataTable column definitions for the Platform Treasury "Payout History"
// table — split out of page.tsx to mirror the vendors/expenses/budgets list
// convention. Read-only (no actions in the original).

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { PayoutRecord } from '@/lib/api/analytics';

export const statusBadgeVariant: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  completed: 'success',
  processing: 'default',
  failed: 'error',
  pending: 'warning',
};

export function buildPlatformPayoutColumns(): DataTableColumn<PayoutRecord>[] {
  return [
    { key: 'reference', header: 'Reference', primary: true, sortable: true, cellClassName: 'font-mono text-xs font-bold', accessor: (p) => p.reference },
    {
      key: 'amount', header: 'Amount', align: 'right', sortable: true, cellClassName: 'font-bold',
      accessor: (p) => Number(p.amount), render: (p) => `${p.currency} ${p.amount}`,
    },
    {
      key: 'fee', header: 'Fee', align: 'right', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (p) => Number(p.fee), render: (p) => (parseFloat(p.fee) > 0 ? `${p.currency} ${p.fee}` : '—'),
    },
    {
      key: 'net_amount', header: 'Net Amount', align: 'right', sortable: true, mobileAction: true, cellClassName: 'font-bold',
      accessor: (p) => Number(p.net_amount), render: (p) => `${p.currency} ${p.net_amount}`,
    },
    {
      key: 'status', header: 'Status', align: 'center', filterable: true,
      filterOptions: Object.keys(statusBadgeVariant).map((value) => ({ value })),
      accessor: (p) => p.status, render: (p) => <Badge variant={statusBadgeVariant[p.status] ?? 'outline'}>{p.status}</Badge>,
    },
    {
      key: 'transaction_count', header: 'Transactions', align: 'right', mobileHidden: true, accessor: (p) => p.transaction_count,
    },
    {
      key: 'period', header: 'Period', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (p) => p.period_start,
      render: (p) => `${new Date(p.period_start).toLocaleDateString()} – ${new Date(p.period_end).toLocaleDateString()}`,
    },
    {
      key: 'created_at', header: 'Date', align: 'right', sortable: true, mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (p) => p.created_at, render: (p) => new Date(p.created_at).toLocaleString(),
    },
  ];
}
