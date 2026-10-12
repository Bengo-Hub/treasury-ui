'use client';

// DataTable column definitions for the voucher book, split out of page.tsx to mirror the
// vendors/expenses/budgets list convention.

import { Badge, Button } from '@/components/ui/base';
import { journalStatusVariant } from '../journals/journal-entry-columns';
import { VOUCHER_LABEL, voucherMeta, voucherNumberOf, voucherTotal, voucherTypeOf } from '@/components/ledger/voucher-types';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { JournalEntry, VoucherType } from '@/lib/api/ledger';
import { CheckCircle2, RotateCcw, Send, Stamp, Undo2 } from 'lucide-react';

export interface VoucherColumnCallbacks {
  onSubmit: (entry: JournalEntry) => void;
  onApprove: (entry: JournalEntry) => void;
  onReject: (entry: JournalEntry) => void;
  onPost: (entry: JournalEntry) => void;
  onReverse: (entry: JournalEntry) => void;
  busy: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Awaiting approval',
  approved: 'Approved, not posted',
  posted: 'Posted',
  reversed: 'Reversed',
};

export function buildVoucherColumns(cb: VoucherColumnCallbacks): DataTableColumn<JournalEntry>[] {
  return [
    {
      key: 'voucher_number',
      header: 'Voucher #',
      primary: true,
      sortable: true,
      accessor: (e) => voucherNumberOf(e),
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
      key: 'voucher_type',
      header: 'Type',
      accessor: (e) => voucherTypeOf(e),
      render: (e) => {
        const type = voucherTypeOf(e) as VoucherType;
        return <Badge variant="outline">{VOUCHER_LABEL[type] ?? (type || 'Voucher')}</Badge>;
      },
    },
    {
      key: 'payee',
      header: 'Payee',
      accessor: (e) => voucherMeta(e, 'payee'),
      render: (e) => {
        const payee = voucherMeta(e, 'payee');
        const kind = voucherMeta(e, 'payee_type');
        return payee ? (
          <span className="flex flex-col">
            <span className="font-medium">{payee}</span>
            {kind && <span className="text-[10px] capitalize text-muted-foreground">{kind}</span>}
          </span>
        ) : <span className="text-muted-foreground">-</span>;
      },
    },
    {
      key: 'reference',
      header: 'Reference',
      mobileHidden: true,
      accessor: (e) => voucherMeta(e, 'reference'),
      cellClassName: 'font-mono text-xs',
      render: (e) => voucherMeta(e, 'reference') || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'description',
      header: 'Narration',
      mobileHidden: true,
      accessor: (e) => e.description ?? '',
      cellClassName: 'max-w-52 truncate',
      render: (e) => <span className="text-sm text-muted-foreground">{e.description || '-'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      cellClassName: 'font-semibold tabular-nums',
      accessor: (e) => voucherTotal(e),
      render: (e) => voucherTotal(e).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      accessor: (e) => e.status,
      render: (e) => <Badge variant={journalStatusVariant[e.status] ?? 'outline'}>{STATUS_LABEL[e.status] ?? e.status}</Badge>,
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
            <Button size="sm" variant="ghost" onClick={() => cb.onSubmit(entry)} disabled={cb.busy} title="Submit for approval">
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
          {entry.status === 'submitted' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => cb.onApprove(entry)} disabled={cb.busy} title="Approve (opens the Approvals queue when an approval rule applies)">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => cb.onReject(entry)} disabled={cb.busy} title="Send back to draft">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {entry.status === 'approved' && (
            <Button size="sm" variant="ghost" onClick={() => cb.onPost(entry)} disabled={cb.busy} title="Post to the ledger">
              <Stamp className="h-3.5 w-3.5" />
            </Button>
          )}
          {entry.status === 'posted' && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cb.onReverse(entry)} disabled={cb.busy} title="Reverse">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];
}
