'use client';

// DataTable column definitions for the Chart of Accounts list — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention.

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { BookOpen, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Account } from '@/lib/api/accounts';

export const typeColors: Record<string, string> = {
  asset: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  liability: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  equity: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  revenue: 'bg-green-500/10 text-green-500 border-green-500/20',
  expense: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export interface AccountColumnCallbacks {
  orgSlug: string;
  isPlatformOwner: boolean;
  onDeactivate: (account: Account) => void;
}

export function buildAccountColumns(cb: AccountColumnCallbacks): DataTableColumn<Account>[] {
  return [
    {
      key: 'account_code',
      header: 'Code',
      sortable: true,
      accessor: (a) => a.account_code,
      cellClassName: 'font-mono text-xs font-bold text-muted-foreground',
      mobileLabel: 'Code',
    },
    {
      key: 'account_name',
      header: 'Account Name',
      sortable: true,
      primary: true,
      accessor: (a) => a.account_name,
      render: (a) => <span className="font-bold">{a.account_name}</span>,
    },
    {
      key: 'account_type',
      header: 'Type',
      accessor: (a) => a.account_type,
      render: (a) => <Badge className={cn(typeColors[a.account_type])}>{a.account_type}</Badge>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortable: true,
      accessor: (a) => Number(a.balance),
      cellClassName: 'font-bold tabular-nums',
      render: (a) => formatCurrency(Number(a.balance), a.currency),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      exportable: false,
      mobileAction: true,
      render: (a) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {cb.isPlatformOwner && (
            <button
              type="button"
              aria-label={`Deactivate account ${a.account_code} ${a.account_name}`}
              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => cb.onDeactivate(a)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <Link
            href={`/${cb.orgSlug}/ledger/accounts/${a.id}`}
            aria-label={`View ledger for ${a.account_code} ${a.account_name}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <BookOpen className="h-3.5 w-3.5" /> Ledger
          </Link>
        </div>
      ),
    },
  ];
}
