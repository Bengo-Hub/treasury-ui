'use client';

// DataTable column definitions for the eTIMS Sync tab's two reconciliation
// tables — split out of etims-sync-tab.tsx to mirror the vendors/expenses/
// budgets list convention. Both are read-only (no actions).

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { EtimsImportedTxn, EtimsReconItem } from '@/lib/api/tax';
import { money } from '@/components/charts/chart-theme';
import { CheckCircle2 } from 'lucide-react';

export function buildOnlyInKraColumns(): DataTableColumn<EtimsReconItem & { _key: string }>[] {
  return [
    { key: 'receipt_no', header: 'Receipt', primary: true, cellClassName: 'font-mono text-xs', accessor: (r) => r.receipt_no },
    { key: 'invoice_no', header: 'Invoice', accessor: (r) => r.invoice_no ?? '', render: (r) => r.invoice_no ?? '—' },
    { key: 'customer', header: 'Customer', accessor: (r) => r.customer ?? '', render: (r) => r.customer || '—' },
    { key: 'date', header: 'Date', mobileHidden: true, cellClassName: 'text-muted-foreground', accessor: (r) => r.date ?? '', render: (r) => r.date || '—' },
    {
      key: 'amount', header: 'Amount', align: 'right', mobileAction: true, cellClassName: 'tabular-nums',
      accessor: (r) => Number(r.amount ?? 0), render: (r) => money(r.amount),
    },
  ];
}

export function buildImportedEtimsColumns(): DataTableColumn<EtimsImportedTxn>[] {
  return [
    {
      key: 'direction', header: 'Type', primary: true, filterable: true,
      filterOptions: [{ value: 'sale' }, { value: 'purchase' }],
      accessor: (t) => t.direction,
      render: (t) => (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${t.direction === 'sale' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {t.direction}
        </span>
      ),
    },
    { key: 'invc_no', header: 'Invoice', cellClassName: 'font-mono text-xs', accessor: (t) => t.invc_no || t.rcpt_no || '', render: (t) => t.invc_no || t.rcpt_no || '—' },
    { key: 'party_name', header: 'Counterparty', accessor: (t) => t.party_name || t.party_tin || '', render: (t) => t.party_name || t.party_tin || '—' },
    { key: 'doc_date', header: 'Date', mobileHidden: true, cellClassName: 'text-muted-foreground', accessor: (t) => t.doc_date ?? '', render: (t) => t.doc_date || '—' },
    {
      key: 'tot_amt', header: 'Amount', align: 'right', sortable: true, mobileAction: true, cellClassName: 'tabular-nums',
      accessor: (t) => Number(t.tot_amt ?? 0), render: (t) => money(t.tot_amt),
    },
    {
      key: 'tot_tax_amt', header: 'VAT', align: 'right', mobileHidden: true, cellClassName: 'tabular-nums text-muted-foreground',
      accessor: (t) => Number(t.tot_tax_amt ?? 0), render: (t) => money(t.tot_tax_amt),
    },
    {
      key: 'matched', header: 'Matched', accessor: (t) => String(t.matched),
      render: (t) =>
        t.matched ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"><CheckCircle2 className="h-3 w-3" />Matched</span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">—</span>
        ),
    },
  ];
}
