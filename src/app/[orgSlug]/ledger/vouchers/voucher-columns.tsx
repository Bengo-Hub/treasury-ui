'use client';

// DataTable column definitions for the Vouchers list — split out of page.tsx
// to mirror the vendors/expenses/budgets list convention. Vouchers are plain
// journal entries tagged with a voucher_type in metadata; this list is
// read-only (no per-row actions or navigation in the original page).

import { Badge } from '@/components/ui/base';
import type { DataTableColumn, FilterOption } from '@bengo-hub/shared-ui-lib/data-table';
import type { JournalEntry } from '@/lib/api/ledger';

export const voucherLabels: Record<string, string> = {
  payment: 'Payment Voucher',
  receipt: 'Receipt Voucher',
  journal: 'Journal Voucher',
  sales: 'Sales Voucher',
  purchase: 'Purchase Voucher',
};

export function voucherTypeOf(entry: JournalEntry): string {
  const meta = (entry.metadata as Record<string, unknown> | undefined) ?? {};
  return String(meta.voucher_type ?? entry.reference_type ?? '').toLowerCase();
}

export function voucherTotalDebit(entry: JournalEntry): number {
  return (entry.lines ?? []).reduce((sum, line) => sum + Number(line.debit_amount || 0), 0);
}

export function buildVoucherColumns(typeOptions: FilterOption[]): DataTableColumn<JournalEntry>[] {
  return [
    {
      key: 'entry_number',
      header: 'Voucher #',
      primary: true,
      sortable: true,
      accessor: (e) => e.entry_number,
      cellClassName: 'font-mono text-xs font-bold text-muted-foreground',
    },
    {
      key: 'voucher_type',
      header: 'Type',
      filterable: true,
      filterOptions: typeOptions,
      accessor: (e) => voucherTypeOf(e),
      render: (e) => {
        const type = voucherTypeOf(e);
        return <Badge className="capitalize">{voucherLabels[type] ?? (type || 'Voucher')}</Badge>;
      },
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (e) => e.description ?? '',
      render: (e) => <span className="text-sm text-muted-foreground">{e.description || 'No description'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      mobileAction: true,
      cellClassName: 'font-semibold tabular-nums',
      accessor: (e) => voucherTotalDebit(e),
      render: (e) => voucherTotalDebit(e).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
    },
    {
      key: 'status',
      header: 'Status',
      mobileHidden: true,
      accessor: (e) => e.status,
      render: (e) => <span className="text-xs text-muted-foreground">{e.status}</span>,
    },
  ];
}
