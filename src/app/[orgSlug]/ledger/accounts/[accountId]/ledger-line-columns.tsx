'use client';

// DataTable column definitions for a single account's ledger lines — split out
// of page.tsx to mirror the vendors/expenses/budgets list convention. Read-only
// running-balance report: intentionally NOT sortable/filterable so the display
// order always matches the running balance the backend computed.

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { AccountLedgerLine } from '@/lib/api/ledger';

/** A ledger line plus a stable synthetic row key (the API gives no line id). */
export type LedgerLineRow = AccountLedgerLine & { _key: string };

export function buildLedgerLineColumns(): DataTableColumn<LedgerLineRow>[] {
  return [
    {
      key: 'transaction_date',
      header: 'Date',
      accessor: (l) => l.transaction_date,
      render: (l) => new Date(l.transaction_date).toLocaleDateString(),
    },
    {
      key: 'entry_number',
      header: 'Entry #',
      primary: true,
      accessor: (l) => l.entry_number ?? '',
      cellClassName: 'font-mono text-xs font-bold',
      render: (l) => l.entry_number || '---',
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (l) => l.description ?? '',
      cellClassName: 'max-w-60 truncate',
      render: (l) => l.description || '---',
    },
    {
      key: 'reference_type',
      header: 'Reference',
      mobileHidden: true,
      cellClassName: 'capitalize text-muted-foreground',
      accessor: (l) => l.reference_type ?? '',
      render: (l) => l.reference_type || '---',
    },
    {
      key: 'debit_amount',
      header: 'Debit',
      align: 'right',
      cellClassName: 'font-bold',
      accessor: (l) => Number(l.debit_amount),
      render: (l) => (Number(l.debit_amount) > 0 ? Number(l.debit_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''),
    },
    {
      key: 'credit_amount',
      header: 'Credit',
      align: 'right',
      cellClassName: 'font-bold',
      accessor: (l) => Number(l.credit_amount),
      render: (l) => (Number(l.credit_amount) > 0 ? Number(l.credit_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''),
    },
    {
      key: 'running_balance',
      header: 'Balance',
      align: 'right',
      cellClassName: 'font-bold tabular-nums',
      accessor: (l) => Number(l.running_balance),
      render: (l) => Number(l.running_balance).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
    },
  ];
}
