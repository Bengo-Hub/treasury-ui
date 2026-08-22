'use client';

// DataTable column definitions for the Transactions list — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention.

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { getPaymentMethodLabel } from '@bengo-hub/shared-ui-lib';
import type { TransactionItem } from '@/lib/api/analytics';
import { ArrowUpRight, CheckCircle2, Eye, Loader2, RefreshCw, UserRound } from 'lucide-react';

const MARKETFLOW_UI_URL = process.env.NEXT_PUBLIC_MARKETFLOW_UI_URL ?? 'https://marketflow.codevertexafrica.com';

export function transactionStatusVariant(status: string): 'success' | 'warning' | 'error' {
  return status === 'succeeded' ? 'success' : status === 'pending' || status === 'processing' ? 'warning' : 'error';
}

export interface TransactionColumnCallbacks {
  orgSlug: string;
  onViewDetail: (txn: TransactionItem) => void;
  onCheckStatus: (txn: TransactionItem) => void;
  onConfirmManual: (txn: TransactionItem) => void;
  onStatementClick: (txn: TransactionItem) => void;
  checkingStatusId: string | null;
}

// Both actions apply to a stuck M-Pesa payment intent (pending or still-processing) — Check Status
// asks Daraja for the real status (Transaction Status Query, verified against real transactions);
// Confirm is a manual override with NO verification (marks it paid outright) for when staff have
// already confirmed the payment some other way (e.g. checked the bank/M-Pesa statement).
const isStuckMpesaTxn = (t: TransactionItem) =>
  !!t.payment_method?.includes('mpesa') && (t.status === 'pending' || t.status === 'processing');

export function buildTransactionColumns(cb: TransactionColumnCallbacks): DataTableColumn<TransactionItem>[] {
  return [
    {
      key: 'reference_id',
      header: 'Reference',
      primary: true,
      sortable: true,
      accessor: (t) => t.reference_id,
      cellClassName: 'font-mono text-xs font-bold',
    },
    {
      key: 'reference_type',
      header: 'Type',
      accessor: (t) => t.reference_type || 'payment',
      render: (t) => (
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
          <span className="capitalize text-xs font-medium">{t.reference_type || 'payment'}</span>
        </div>
      ),
    },
    {
      key: 'source_service',
      header: 'Source',
      mobileHidden: true,
      accessor: (t) => t.source_service || '',
      render: (t) => t.source_service || '—',
    },
    {
      key: 'customer_name',
      header: 'Customer',
      // REQ-005 audit: customer comes from the intent's metadata snapshot when the
      // source recorded one; cashier is N/A on payment intents (it lives on the
      // pos order / journal created_by).
      accessor: (t) => t.customer_name ?? '',
      render: (t) =>
        t.crm_contact_id ? (
          <button
            type="button"
            className="text-primary hover:underline underline-offset-2 text-left"
            title="View customer statement"
            onClick={(e) => {
              e.stopPropagation();
              cb.onStatementClick(t);
            }}
          >
            {t.customer_name || 'View statement'}
          </button>
        ) : (
          t.customer_name || '—'
        ),
    },
    {
      key: 'payment_method',
      header: 'Method',
      accessor: (t) => t.payment_method,
      render: (t) => (
        <div>
          <div>{getPaymentMethodLabel(t.payment_method, t.gateway_name)}</div>
          {t.provider_reference && (
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5" title="Provider reference">
              {t.provider_reference}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      mobileAction: true,
      cellClassName: 'font-bold',
      accessor: (t) => Number(t.amount),
      render: (t) => `${t.currency} ${t.amount}`,
    },
    {
      key: 'transaction_cost',
      header: 'Fee',
      align: 'right',
      mobileHidden: true,
      cellClassName: 'text-muted-foreground',
      accessor: (t) => Number(t.transaction_cost ?? 0),
      render: (t) => (t.transaction_cost && parseFloat(t.transaction_cost) > 0 ? `${t.currency} ${t.transaction_cost}` : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      filterable: true,
      accessor: (t) => t.status,
      render: (t) => <Badge variant={transactionStatusVariant(t.status)}>{t.status}</Badge>,
    },
    {
      key: 'created_at',
      header: 'Date',
      align: 'right',
      sortable: true,
      mobileHidden: true,
      cellClassName: 'text-muted-foreground',
      accessor: (t) => t.created_at,
      render: (t) => new Date(t.created_at).toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      exportable: false,
      render: (txn) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* View details — all transactions */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="View transaction details"
            onClick={() => cb.onViewDetail(txn)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {/* Check Status — real Daraja Transaction Status Query, pending or processing M-Pesa intents */}
          {isStuckMpesaTxn(txn) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Query Daraja for the real transaction status"
              disabled={cb.checkingStatusId === txn.id}
              onClick={() => cb.onCheckStatus(txn)}
            >
              {cb.checkingStatusId === txn.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          )}
          {/* Confirm — opens a modal that tries the real Transaction Status Query with a
              staff-provided code first, falling back to a manual (unverified) override only if
              that can't confirm it. */}
          {isStuckMpesaTxn(txn) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Confirm this payment — verifies the M-Pesa code against Safaricom first"
              onClick={() => cb.onConfirmManual(txn)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {/* CRM contact link */}
          {txn.crm_contact_id && (
            <a
              href={`${MARKETFLOW_UI_URL}/${cb.orgSlug}/contacts/${txn.crm_contact_id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="View CRM contact"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
            >
              <UserRound className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ),
    },
  ];
}
