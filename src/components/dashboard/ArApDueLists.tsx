'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { money } from '@/components/charts/chart-theme';
import { ReceivePaymentModal } from '@/components/clients/ReceivePaymentModal';
import { useCustomerBalances } from '@/hooks/use-invoices';
import { useBills } from '@/hooks/use-bills';
import type { CustomerBalance } from '@/lib/api/invoices';
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
 * Receivables due/overdue — paginated list of customers owing money (operational AR:
 * CustomerBalance, which includes POS credit sales), each with a Record-payment action.
 * Replaces the old AR aging bar chart (GoDigital "Sales Payment Due" pattern).
 */
export function ReceivablesDueList({ tenant }: { tenant: string }) {
  const { data: balances, isLoading } = useCustomerBalances(tenant, !!tenant);
  const [payTarget, setPayTarget] = useState<CustomerBalance | null>(null);

  const rows = useMemo(() => {
    const open = (balances ?? []).filter((b) => (parseFloat(b.balance_due) || 0) > 0.0001);
    // Overdue first, then largest balance.
    return open.sort((a, b) => {
      const ao = parseFloat(a.overdue_amount ?? '0') || 0;
      const bo = parseFloat(b.overdue_amount ?? '0') || 0;
      if ((ao > 0) !== (bo > 0)) return ao > 0 ? -1 : 1;
      return (parseFloat(b.balance_due) || 0) - (parseFloat(a.balance_due) || 0);
    });
  }, [balances]);
  const pager = usePager(rows);

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
        {!isLoading && pager.slice.map((b) => {
          const due = parseFloat(b.balance_due) || 0;
          const overdue = parseFloat(b.overdue_amount ?? '0') || 0;
          const oldest = b.oldest_due_date ? new Date(b.oldest_due_date) : null;
          return (
            <div key={b.id} className="px-4 py-2.5 flex items-center justify-between gap-3 border-t border-border/60 first:border-t-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{b.customer_name || b.customer_identifier || 'Customer'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {overdue > 0.0001
                    ? `Overdue ${money(overdue)}`
                    : oldest
                      ? `Due ${oldest.toLocaleDateString()}`
                      : 'Within credit terms'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn('text-sm font-bold tabular-nums', overdue > 0.0001 ? 'text-destructive' : 'text-amber-600')}>
                  {money(due)}
                </span>
                <Button size="sm" onClick={() => setPayTarget(b)}>Record payment</Button>
              </div>
            </div>
          );
        })}
        <Pager page={pager.page} pages={pager.pages} onPage={pager.setPage} />
      </CardContent>
      {payTarget && (
        <ReceivePaymentModal tenant={tenant} target={payTarget} onClose={() => setPayTarget(null)} />
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
