'use client';

// DataTable column definitions for the Bank Reconciliation tabs — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention.

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { BankAccount, StatementLine } from '@/lib/api/reconciliation';
import { cn } from '@/lib/utils';

// Badge variant per bank_statement_line.match_status, mirroring the billStatusVariant convention.
export const matchStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  unmatched: 'warning',
  matched: 'success',
  manual: 'default',
  suggested: 'secondary',
};

const matchStatusLabel: Record<string, string> = {
  unmatched: 'Unmatched',
  matched: 'Matched',
  manual: 'Manually Matched',
  suggested: 'Suggested',
};

// The API's match_status enum is unmatched | matched | manual. An auto-reconcile run also parks a
// confidence_score on lines it scored but did not auto-confirm (50-84%) — surface those as
// "Suggested" rather than lumping them in with never-scored lines.
const suggestedThreshold = 50;

function lineMatchStatus(l: StatementLine): string {
  const status = l.match_status ?? l.status ?? 'unmatched';
  if (status === 'unmatched' && (l.confidence_score ?? 0) >= suggestedThreshold) {
    return 'suggested';
  }
  return status;
}

export function buildBankAccountColumns(): DataTableColumn<BankAccount>[] {
  return [
    {
      key: 'account_name',
      header: 'Account Name',
      primary: true,
      sortable: true,
      accessor: (a) => a.account_name,
      render: (a) => <span className="font-bold">{a.account_name}</span>,
    },
    {
      key: 'bank_name',
      header: 'Bank',
      sortable: true,
      accessor: (a) => a.bank_name,
    },
    {
      key: 'account_number',
      header: 'Account Number',
      accessor: (a) => a.account_number,
      cellClassName: 'font-mono text-xs',
    },
    {
      key: 'currency',
      header: 'Currency',
      align: 'right',
      mobileAction: true,
      accessor: (a) => a.currency,
      render: (a) => <Badge variant="outline">{a.currency}</Badge>,
    },
  ];
}

export function buildUnreconciledColumns(): DataTableColumn<StatementLine>[] {
  return [
    {
      key: 'description',
      header: 'Description',
      primary: true,
      sortable: true,
      accessor: (l) => l.description,
      render: (l) => <span className="font-bold">{l.description}</span>,
    },
    {
      key: 'transaction_date',
      header: 'Date',
      sortable: true,
      accessor: (l) => l.transaction_date,
    },
    {
      key: 'reference',
      header: 'Reference',
      mobileHidden: true,
      accessor: (l) => l.reference || '',
      render: (l) => l.reference || 'N/A',
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      accessor: (l) => Number(l.amount),
      render: (l) => {
        const isDebit = parseFloat(l.amount) < 0;
        return <span className={cn('font-bold', isDebit ? 'text-red-500' : 'text-green-500')}>{isDebit ? '' : '+'}{l.amount}</span>;
      },
    },
    {
      key: 'match_status',
      header: 'Status',
      align: 'right',
      mobileAction: true,
      filterable: true,
      filterOptions: Object.keys(matchStatusVariant).map((value) => ({ value })),
      // Render the row's real status — a hardcoded "Unmatched" badge mislabelled every matched line.
      accessor: (l) => lineMatchStatus(l),
      render: (l) => {
        const status = lineMatchStatus(l);
        return (
          <Badge variant={matchStatusVariant[status] ?? 'outline'}>
            {matchStatusLabel[status] ?? status}
            {status === 'suggested' && l.confidence_score ? ` ${l.confidence_score}%` : ''}
          </Badge>
        );
      },
    },
  ];
}
