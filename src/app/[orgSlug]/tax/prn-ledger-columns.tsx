'use client';

// DataTable column definitions for the WHT PRN tab's PRN ledger table — split
// out of wht-prn-tab.tsx to mirror the vendors/expenses/budgets list convention.

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { TaxLiability } from '@/lib/api/tax';
import { Loader2, Send } from 'lucide-react';

const PRN_STATUS_TONE: Record<TaxLiability['status'], string> = {
  unpaid: 'bg-amber-500/10 text-amber-600',
  submitted: 'bg-primary/10 text-primary',
  remitted: 'bg-green-500/10 text-green-600',
  failed: 'bg-destructive/10 text-destructive',
};

export interface PrnLedgerColumnCallbacks {
  onRemit: (liability: TaxLiability) => void;
  remitPending: boolean;
}

export function buildPrnLedgerColumns(cb: PrnLedgerColumnCallbacks): DataTableColumn<TaxLiability>[] {
  return [
    { key: 'prn_number', header: 'PRN', primary: true, cellClassName: 'font-mono text-xs', accessor: (tl) => tl.prn_number },
    { key: 'obligation', header: 'Obligation', accessor: (tl) => tl.obligation },
    {
      key: 'prn_amount', header: 'Amount', align: 'right', sortable: true, mobileAction: true, cellClassName: 'tabular-nums',
      accessor: (tl) => Number(tl.prn_amount), render: (tl) => `${tl.currency} ${Number(tl.prn_amount).toLocaleString()}`,
    },
    {
      key: 'status', header: 'Status', filterable: true,
      filterOptions: Object.keys(PRN_STATUS_TONE).map((value) => ({ value })),
      accessor: (tl) => tl.status,
      render: (tl) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRN_STATUS_TONE[tl.status]}`}>{tl.status}</span>,
    },
    {
      key: 'actions', header: 'Action', align: 'right', exportable: false,
      render: (tl) =>
        tl.status === 'unpaid' || tl.status === 'failed' ? (
          <button
            onClick={(e) => { e.stopPropagation(); cb.onRemit(tl); }}
            disabled={cb.remitPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {cb.remitPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}Remit via M-Pesa
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">{tl.payout_reference ?? '—'}</span>
        ),
    },
  ];
}
