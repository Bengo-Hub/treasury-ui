'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useAccountStatement, useLinkAccountLedger } from '@/hooks/use-bank-accounts';
import { ReportDocument, type ReportKpi } from '@/components/reports/ReportDocument';
import {
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/reports/ReportTable';
import { Button } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import { money } from '@/components/charts/chart-theme';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import type { AccountStatementLine } from '@/lib/api/bank-accounts';

const num = (v?: string) => (v ? parseFloat(v) || 0 : 0);
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—');

const columns: ReportTableColumn[] = [
  { header: 'Date', align: 'left' },
  { header: 'Description', align: 'left' },
  { header: 'Reference', align: 'left' },
  { header: 'Debit', align: 'right' },
  { header: 'Credit', align: 'right' },
  { header: 'Balance', align: 'right' },
];

function statementRows(lines: AccountStatementLine[]): ReportTableRow[] {
  return lines.map((l, i) => ({
    key: `${l.reference_id ?? l.reference_type ?? 'line'}-${i}`,
    cells: [
      fmtDate(l.date),
      l.description || '—',
      l.reference_type || '—',
      num(l.debit) ? money(num(l.debit)) : '—',
      num(l.credit) ? money(num(l.credit)) : '—',
      money(num(l.running_balance)),
    ],
  }));
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  bank: 'Bank Account',
  mobile_money: 'Mobile Money Account',
  cash: 'Cash Account',
  gateway: 'Gateway Settlement Account',
};

/**
 * Financial account statement — pullable, drillable, exportable (PDF via print + CSV) GL statement
 * for one real account (bank/mobile-money/cash/gateway). Mirrors the customer-statement page
 * exactly (same ReportDocument/ReportTable pattern) but sources from
 * GET /bank-accounts/{id}/statement (a GL ledger query on the account's own dedicated chart-of-
 * accounts leaf) rather than the AR subledger.
 */
export default function AccountStatementPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const accountId = (params?.accountId as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const today = () => new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(today());

  const { data, isLoading, isError, error, refetch, isFetching } = useAccountStatement(
    effectiveTenant,
    accountId,
    { from: from || undefined, to: to || undefined },
    !!effectiveTenant && !!accountId,
  );
  const notLinked = (error as { response?: { status?: number } } | null)?.response?.status === 409;
  const linkLedger = useLinkAccountLedger(effectiveTenant);

  const lines = data?.lines ?? [];
  const opening = num(data?.opening_balance);
  const closing = num(data?.closing_balance);
  const periodLabel = from ? `${fmtDate(from)} – ${fmtDate(to)}` : `Up to ${fmtDate(to)}`;
  const title = `Account Statement${data?.account_name ? ` — ${data.account_name}` : ''}`;
  const typeLabel = data ? (ACCOUNT_TYPE_LABEL[data.account_type] ?? data.account_type) : '';

  const rows = useMemo(() => statementRows(lines), [lines]);

  const kpis: ReportKpi[] = [
    { label: 'Account Type', value: typeLabel || '—' },
    { label: 'Opening Balance', value: money(opening) },
    { label: 'Closing Balance', value: money(closing), tone: 'primary' },
    { label: 'Transactions', value: lines.length },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${orgSlug}/banking/accounts`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Accounts
        </Button>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-border bg-accent/30 px-2.5 py-1.5 text-xs"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-border bg-accent/30 px-2.5 py-1.5 text-xs"
            aria-label="To date"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading statement...
        </div>
      )}

      {!isLoading && isError && notLinked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>This account isn&apos;t linked to the ledger yet, so it has no statement — this
            happens on older accounts created before ledger-linking existed. Link it now to fix
            this permanently.</span>
          <Button
            variant="outline"
            size="sm"
            disabled={linkLedger.isPending}
            onClick={() => linkLedger.mutate(accountId, { onSuccess: () => refetch() })}
          >
            {linkLedger.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : null}
            Link to ledger
          </Button>
        </div>
      )}

      {!isLoading && isError && !notLinked && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load the statement. Please try again.
        </div>
      )}

      {!isLoading && !isError && data && (
        <ReportDocument
          title={title}
          periodLabel={periodLabel}
          kpis={kpis}
          csv={{
            filename: `account-statement-${accountId}.csv`,
            title,
            periodLabel,
            columns,
            sections: [{ rows }],
          }}
        >
          <ReportTable
            columns={columns}
            sections={[{ title: 'Transactions', rows }]}
            grandTotal={{
              cells: ['', '', 'Closing Balance', '', '', money(closing)],
            }}
          />
          {lines.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions in this period.
            </p>
          )}
        </ReportDocument>
      )}
    </div>
  );
}
