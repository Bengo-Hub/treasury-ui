'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { money } from '@/components/charts/chart-theme';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBudgetVersions, useLineTransactions } from '@/hooks/use-budgets';
import { num } from '@/lib/api/budgets';
import { cn } from '@/lib/utils';
import { statusLabel, statusVariant } from '../budget-columns';

const PAGE = 50;

const referenceLabel: Record<string, string> = {
  expense_payment: 'Expense',
  expense: 'Expense',
  bill: 'Supplier bill',
  vendor_bill: 'Supplier bill',
  invoice: 'Invoice',
  payment: 'Payment',
  payroll: 'Payroll',
  expense_claim: 'Staff claim',
};

/**
 * The booked ledger lines behind one budget line's actual. The API applies the same
 * most-specific-line rule as the actuals, so the total here matches the variance table.
 */
export function LineDrillDialog({
  tenant,
  orgSlug,
  budgetId,
  line,
  months,
  currency,
  onClose,
}: {
  tenant: string;
  orgSlug: string;
  budgetId: string;
  line: { id: string; name: string } | null;
  months: string[];
  currency: string;
  onClose: () => void;
}) {
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error } = useLineTransactions(tenant, budgetId, line?.id ?? null, {
    month: month || undefined,
    page,
    limit: PAGE,
  });
  if (!line) return null;
  const pages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={`Actual spend: ${line.name}`}
        description="Booked ledger lines that make up this line's actual, newest first. Amounts are in KES."
        className="max-w-4xl"
        onClose={onClose}
      >
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Whole budget period</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.count} {data.count === 1 ? 'line' : 'lines'}, total{' '}
              <span className="font-semibold text-foreground">{money(data.total, currency)}</span>
            </p>
          )}
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="py-6 text-sm text-destructive">Could not load the ledger lines.</p>
        ) : !data?.lines.length ? (
          <p className="py-6 text-sm text-muted-foreground">Nothing booked against this line{month ? ` in ${month}` : ''}.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Entry</th>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2">{new Date(l.transaction_date).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <p>{l.entry_number || '-'}</p>
                      {l.reference_type && (
                        <p className="text-xs text-muted-foreground">{referenceLabel[l.reference_type] ?? l.reference_type}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/${orgSlug}/ledger/accounts/${l.account_id}`} className="hover:underline">
                        {l.account_code} {l.account_name}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-muted-foreground" title={l.description}>
                      {l.description}
                    </td>
                    <td className={cn('px-3 py-2 text-right tabular-nums', num(l.amount) < 0 && 'text-green-600')}>
                      {money(l.amount, 'KES')}
                      {l.currency !== 'KES' && <p className="text-xs text-muted-foreground">{l.currency}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {page} of {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Every version of this budget, oldest first; the one being viewed is highlighted. */
export function VersionHistory({ tenant, orgSlug, budgetId }: { tenant: string; orgSlug: string; budgetId: string }) {
  const { data: versions } = useBudgetVersions(tenant, budgetId);
  if (!versions || versions.length < 2) return null;
  return (
    <Card>
      <CardHeader className="py-4">
        <h3 className="font-bold text-sm uppercase tracking-tight">Version history</h3>
        <p className="text-xs text-muted-foreground">A revision replaces its original once approved; the original is kept as revised.</p>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <tbody>
            {versions.map((ver) => (
              <tr key={ver.id} className={cn('border-t border-border/60', ver.id === budgetId && 'bg-accent/40')}>
                <td className="px-4 py-2 font-medium">
                  {ver.id === budgetId ? (
                    <span>Version {ver.version} (this one)</span>
                  ) : (
                    <Link href={`/${orgSlug}/budgets/${ver.id}`} className="hover:underline">
                      Version {ver.version}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={statusVariant[ver.status]}>{statusLabel[ver.status]}</Badge>
                </td>
                <td className="px-4 py-2 text-muted-foreground">Created {new Date(ver.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {ver.approved_at ? `Approved ${new Date(ver.approved_at).toLocaleDateString()}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
