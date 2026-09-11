'use client';

// DataTable column definitions shared by StatementDialog and the full customer-statement page —
// a running-balance report, like ledger-line-columns.tsx: intentionally NOT sortable, since the
// display order must match the balance the backend computed line-by-line.

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Badge } from '@/components/ui/base';
import type { StatementLine } from '@/lib/api/arpa';
import { formatCurrency } from '@/lib/utils/currency';

const num = (v?: string) => (v ? parseFloat(v) || 0 : 0);

/** A statement line plus a stable synthetic row key (the API gives no line id). */
export type StatementLineRow = StatementLine & { _key: string };

export function buildStatementColumns(currency = 'KES'): DataTableColumn<StatementLineRow>[] {
  return [
    {
      key: 'date',
      header: 'Date',
      accessor: (l) => l.date,
      render: (l) => new Date(l.date).toLocaleDateString(),
    },
    {
      key: 'doc_type',
      header: 'Type',
      mobileHidden: true,
      accessor: (l) => l.doc_type,
      render: (l) => l.doc_type || '—',
    },
    {
      key: 'reference',
      header: 'Reference',
      primary: true,
      cellClassName: 'font-mono text-xs',
      render: (l) => l.reference || '—',
    },
    {
      key: 'debit',
      header: 'Debit',
      align: 'right',
      accessor: (l) => num(l.debit),
      render: (l) => (num(l.debit) ? formatCurrency(num(l.debit), currency) : '—'),
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right',
      accessor: (l) => num(l.credit),
      render: (l) => (num(l.credit) ? formatCurrency(num(l.credit), currency) : '—'),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      cellClassName: 'font-bold tabular-nums',
      accessor: (l) => num(l.balance),
      render: (l) => formatCurrency(num(l.balance), currency),
    },
    {
      key: 'status',
      header: 'Description',
      mobileHidden: true,
      render: (l) => (l.status ? <Badge variant="outline">{l.status}</Badge> : '—'),
    },
  ];
}
