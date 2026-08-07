'use client';

// DataTable column definitions for the Journal Entries list — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention.

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { JournalEntry } from '@/lib/api/ledger';
import { CheckCircle2, RotateCcw, Send, Stamp } from 'lucide-react';

export const journalStatusVariant: Record<string, 'default' | 'warning' | 'success' | 'error' | 'secondary'> = {
  draft: 'secondary',
  submitted: 'warning',
  approved: 'default',
  posted: 'success',
  reversed: 'error',
};

function totalDebit(e: JournalEntry) {
  return (e.lines ?? []).reduce((sum, l) => sum + Number(l.debit_amount || 0), 0);
}
function totalCredit(e: JournalEntry) {
  return (e.lines ?? []).reduce((sum, l) => sum + Number(l.credit_amount || 0), 0);
}

export interface JournalColumnCallbacks {
  onSubmit: (entry: JournalEntry) => void;
  onApprove: (entry: JournalEntry) => void;
  onPost: (entry: JournalEntry) => void;
  onReverse: (entry: JournalEntry) => void;
  // Each mirrors the underlying mutation's own `isPending` (one shared hook instance
  // per action across the whole list) — matches the pre-DataTable behavior where,
  // say, submitting one entry disabled the Submit button on every draft row.
  submitPending: boolean;
  approvePending: boolean;
  postPending: boolean;
  reversePending: boolean;
}

export function buildJournalColumns(cb: JournalColumnCallbacks): DataTableColumn<JournalEntry>[] {
  return [
    {
      key: 'entry_number',
      header: 'Entry #',
      primary: true,
      sortable: true,
      accessor: (e) => e.entry_number,
      cellClassName: 'font-mono text-xs font-bold',
    },
    {
      key: 'entry_date',
      header: 'Date',
      sortable: true,
      accessor: (e) => e.entry_date,
      render: (e) => new Date(e.entry_date).toLocaleDateString(),
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (e) => e.description ?? '',
      cellClassName: 'max-w-52 truncate',
      render: (e) => e.description || '---',
    },
    {
      key: 'reference_type',
      header: 'Reference',
      mobileHidden: true,
      accessor: (e) => e.reference_type ?? '',
      render: (e) =>
        e.reference_type ? (
          <div className="flex flex-col">
            <span className="capitalize font-medium">{e.reference_type.replace(/_/g, ' ')}</span>
            {e.reference_id && (
              <span className="font-mono text-[10px] text-muted-foreground">{e.reference_id.slice(0, 8)}</span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'recorded_by',
      header: 'Recorded By',
      mobileHidden: true,
      // REQ-005 audit: journal entries record the posting USER (created_by = the
      // cashier/accountant analog); a customer applies only via the referenced
      // source document, so no Customer column is invented here.
      accessor: (e) => e.created_by_email ?? e.created_by ?? '',
      render: (e) => (
        <span title={e.created_by}>
          {e.created_by_email
            ? e.created_by_email
            : !e.created_by || /^0+(-0+)*$/.test(e.created_by.replace(/-/g, ''))
              ? <span className="text-muted-foreground italic">System</span>
              : e.created_by.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'debit',
      header: 'Debit',
      align: 'right',
      cellClassName: 'font-bold',
      accessor: (e) => totalDebit(e),
      render: (e) => totalDebit(e).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right',
      cellClassName: 'font-bold',
      accessor: (e) => totalCredit(e),
      render: (e) => totalCredit(e).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      filterable: true,
      filterOptions: Object.keys(journalStatusVariant).map((value) => ({ value })),
      accessor: (e) => e.status,
      render: (e) => <Badge variant={journalStatusVariant[e.status] ?? 'outline'}>{e.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      exportable: false,
      mobileAction: true,
      render: (entry) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {entry.status === 'draft' && (
            <Button size="sm" variant="ghost" onClick={() => cb.onSubmit(entry)} disabled={cb.submitPending} title="Submit">
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
          {entry.status === 'submitted' && (
            <Button size="sm" variant="ghost" onClick={() => cb.onApprove(entry)} disabled={cb.approvePending} title="Approve">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {entry.status === 'approved' && (
            <Button size="sm" variant="ghost" onClick={() => cb.onPost(entry)} disabled={cb.postPending} title="Post">
              <Stamp className="h-3.5 w-3.5" />
            </Button>
          )}
          {entry.status === 'posted' && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => cb.onReverse(entry)}
              disabled={cb.reversePending}
              title="Reverse"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];
}
