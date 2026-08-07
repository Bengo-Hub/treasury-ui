'use client';

// DataTable column definitions for the Bad-Debt Relief tab's candidates table
// — split out of bad-debt-relief-tab.tsx to mirror the vendors/expenses/budgets
// list convention.

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { BadDebtReliefCandidate } from '@/lib/api/tax';
import { money } from '@/components/charts/chart-theme';
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

function StatusPill({ status, days }: { status: string; days: number }) {
  if (status === 'eligible') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"><CheckCircle2 className="h-3 w-3" />Eligible now</span>;
  }
  if (status === 'expired') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"><AlertTriangle className="h-3 w-3" />Past 10-yr deadline</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"><Clock className="h-3 w-3" />Eligible in {Math.max(0, days)}d</span>;
}

export interface BadDebtReliefColumnCallbacks {
  onClaim: (candidate: BadDebtReliefCandidate) => void;
  claimPending: boolean;
  claimPendingInvoiceId?: string;
}

export function buildBadDebtReliefColumns(cb: BadDebtReliefColumnCallbacks): DataTableColumn<BadDebtReliefCandidate>[] {
  return [
    { key: 'invoice_number', header: 'Invoice', primary: true, sortable: true, cellClassName: 'font-mono text-xs', accessor: (c) => c.invoice_number },
    { key: 'customer_name', header: 'Customer', sortable: true, accessor: (c) => c.customer_name || '', render: (c) => c.customer_name || '—' },
    { key: 'invoice_date', header: 'Date', mobileHidden: true, cellClassName: 'text-muted-foreground', accessor: (c) => c.invoice_date },
    {
      key: 'recoverable_vat', header: 'Recoverable VAT', align: 'right', sortable: true, mobileAction: true, cellClassName: 'font-medium tabular-nums',
      accessor: (c) => Number(c.recoverable_vat), render: (c) => money(c.recoverable_vat),
    },
    { key: 'eligible_from', header: 'Eligible from', mobileHidden: true, cellClassName: 'text-muted-foreground', accessor: (c) => c.eligible_from },
    {
      key: 'status', header: 'Status', filterable: true,
      filterOptions: [{ value: 'eligible' }, { value: 'upcoming' }, { value: 'expired' }],
      accessor: (c) => c.status, render: (c) => <StatusPill status={c.status} days={c.days_until_eligible} />,
    },
    {
      key: 'actions', header: 'Action', align: 'right', exportable: false,
      render: (c) =>
        c.status === 'eligible' ? (
          <button
            onClick={(e) => { e.stopPropagation(); cb.onClaim(c); }}
            disabled={cb.claimPending}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {cb.claimPending && cb.claimPendingInvoiceId === c.invoice_id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Claim relief
          </button>
        ) : null,
    },
  ];
}
