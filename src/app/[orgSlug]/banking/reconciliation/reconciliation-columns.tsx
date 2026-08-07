'use client';

// DataTable column definitions for the Bank Reconciliation tabs — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention.

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { BankAccount, StatementLine } from '@/lib/api/reconciliation';
import { cn } from '@/lib/utils';

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
      key: 'status',
      header: 'Status',
      align: 'right',
      mobileAction: true,
      exportable: false,
      render: () => <Badge variant="warning">Unmatched</Badge>,
    },
  ];
}
