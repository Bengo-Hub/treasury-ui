'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { money } from '@/components/charts/chart-theme';
import { ReceivePaymentModal } from '@/components/clients/ReceivePaymentModal';
import { RecordPaymentModal, type PayableInvoice } from '@/components/documents/RecordPaymentModal';
import { useARAging, useCustomerBalances } from '@/hooks/use-invoices';
import { useBills } from '@/hooks/use-bills';
import type { ARAgingRow, CustomerBalance } from '@/lib/api/invoices';
import type { Bill } from '@/lib/api/bills';
import { cn } from '@/lib/utils';
import { ArrowUpRight, Banknote, ChevronLeft, ChevronRight, Loader2, ReceiptText } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const PAGE_SIZE = 5;

/** Paged slice + pager controls shared by both lists (client-side, compact dashboard widget). */
function usePager<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  return {
    slice: rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    page: current,
    pages,
    setPage,
  };
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-border text-xs text-muted-foreground">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="p-1 rounded hover:bg-accent disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span>{page} / {pages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className="p-1 rounded hover:bg-accent disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Receivables due/overdue — paginated list of customers owing money, from the AR aging: the SAME
 * source as Total Receivable, the aging chips and Top Debtors, so the dashboard can never say
 * "all settled" beside a non-zero receivable again. It used to read only the customer ledger
 * (CustomerBalance), so every customer owing on invoices alone (no ledger row) was missing.
 * Ledger debt settles via Receive payment (AR receipt); invoice debt via Record Payment against
 * that debtor's open invoices, prefilled with each invoice's real balance.
 */
export function ReceivablesDueList({ tenant }: { tenant: string }) {
  const { data: aging, isLoading } = useARAging(tenant, !!tenant);
  const { data: balances } = useCustomerBalances(tenant, !!tenant);
  const [payBalance, setPayBalance] = useState<CustomerBalance | null>(null);
  const [payInvoices, setPayInvoices] = useState<PayableInvoice[] | null>(null);

  const rows = useMemo(() => {
    const open = (aging?.rows ?? []).filter((r) => (Number(r.total) || 0) > 0.0001);
    // Overdue first, then largest balance.
    return open.sort((a, b) => {
      const ao = Number(a.overdue ?? 0) || 0;
      const bo = Number(b.overdue ?? 0) || 0;
      if ((ao > 0) !== (bo > 0)) return ao > 0 ? -1 : 1;
      return (Number(b.total) || 0) - (Number(a.total) || 0);
    });
  }, [aging]);
  const pager = usePager(rows);

  const settle = (r: ARAgingRow) => {
    if (r.source === 'invoices' && r.open_invoices?.length) {
      setPayInvoices(r.open_invoices.map((inv) => ({
        id: inv.id, invoice_number: inv.invoice_number, customer_name: r.entity_name, currency: inv.currency,
        total_amount: inv.total, amount_paid: inv.paid, amount_due: inv.open,
        settlement_account_id: inv.settlement_account_id,
      })));
      return;
    }
    const bal = (balances ?? []).find((b) => b.id === r.customer_balance_id);
    if (bal) setPayBalance(bal);
  };

  return (
    <Card>
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Receivables due &amp; overdue</h3>
          {rows.length > 0 && <Badge variant="warning">{rows.length}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No customer balances due — all settled.</p>
        )}
        {!isLoading && pager.slice.map((r, i) => {
          const due = Number(r.total) || 0;
          const overdue = Number(r.overdue ?? 0) || 0;
          const oldest = r.oldest_due_date ? new Date(r.oldest_due_date) : null;
          const invoiceCount = r.open_invoices?.length ?? 0;
          const canSettle = r.source === 'invoices'
            ? invoiceCount > 0
            : !!(balances ?? []).find((b) => b.id === r.customer_balance_id);
          return (
            <div key={r.customer_balance_id ?? `${r.entity_name}-${i}`} className="px-4 py-2.5 flex items-center justify-between gap-3 border-t border-border/60 first:border-t-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{r.entity_name || 'Customer'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {overdue > 0.0001
                    ? `Overdue ${money(overdue)}`
                    : oldest
                      ? `Due ${oldest.toLocaleDateString()}`
                      : 'Within credit terms'}
                  {invoiceCount > 0 && ` · ${invoiceCount} open invoice${invoiceCount > 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn('text-sm font-bold tabular-nums', overdue > 0.0001 ? 'text-destructive' : 'text-amber-600')}>
                  {money(due)}
                </span>
                <Button size="sm" disabled={!canSettle} onClick={() => settle(r)}>Record payment</Button>
              </div>
            </div>
          );
        })}
        <Pager page={pager.page} pages={pager.pages} onPage={pager.setPage} />
      </CardContent>
      {payBalance && (
        <ReceivePaymentModal tenant={tenant} target={payBalance} onClose={() => setPayBalance(null)} />
      )}
      {payInvoices && (
        <RecordPaymentModal tenant={tenant} choices={payInvoices} onClose={() => setPayInvoices(null)} />
      )}
    </Card>
  );
}

const OPEN_BILL_STATUSES = new Set(['draft', 'received', 'approved', 'overdue', 'partial']);

/**
 * Payables due/overdue — paginated list of open supplier bills with an Add-payment action
 * that deep-links into the Bills page pay flow (approvals-gated there). Credit notes show
 * as negative rows netting the payable. Replaces the old AP aging bar chart.
 */
export function PayablesDueList({ tenant }: { tenant: string }) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? tenant;
  const { data, isLoading } = useBills(tenant, {}, !!tenant);

  const rows = useMemo(() => {
    const list: Bill[] = data?.data ?? [];
    const open = list.filter((b) => OPEN_BILL_STATUSES.has((b.status || '').toLowerCase()));
    const now = Date.now();
    return open.sort((a, b) => {
      const aOver = a.document_type !== 'credit_note' && new Date(a.due_date).getTime() < now;
      const bOver = b.document_type !== 'credit_note' && new Date(b.due_date).getTime() < now;
      if (aOver !== bOver) return aOver ? -1 : 1;
      return Math.abs(parseFloat(b.total_amount) || 0) - Math.abs(parseFloat(a.total_amount) || 0);
    });
  }, [data]);
  const pager = usePager(rows);

  return (
    <Card>
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Payables due &amp; overdue</h3>
          {rows.length > 0 && <Badge variant="warning">{rows.length}</Badge>}
        </div>
        <button
          onClick={() => router.push(`/${orgSlug}/bills`)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          All bills <ArrowUpRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No open supplier bills.</p>
        )}
        {!isLoading && pager.slice.map((b) => {
          const amt = parseFloat(b.total_amount) || 0;
          const isCN = b.document_type === 'credit_note';
          const isOverdue = !isCN && new Date(b.due_date).getTime() < Date.now();
          return (
            <div key={b.id} className="px-4 py-2.5 flex items-center justify-between gap-3 border-t border-border/60 first:border-t-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{b.vendor_name || 'Supplier'}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {b.bill_number}
                  <span className="font-sans">
                    {isCN
                      ? ' · credit note'
                      : isOverdue
                        ? ` · overdue since ${new Date(b.due_date).toLocaleDateString()}`
                        : ` · due ${new Date(b.due_date).toLocaleDateString()}`}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn(
                  'text-sm font-bold tabular-nums',
                  isCN || amt < 0 ? 'text-emerald-600' : isOverdue ? 'text-destructive' : 'text-amber-600',
                )}>
                  {money(amt)}
                </span>
                {!isCN && (
                  <Button size="sm" variant="outline" onClick={() => router.push(`/${orgSlug}/bills?pay=${b.id}`)}>
                    Add payment
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        <Pager page={pager.page} pages={pager.pages} onPage={pager.setPage} />
      </CardContent>
    </Card>
  );
}
