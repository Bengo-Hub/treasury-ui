'use client';

import { Badge, Card, CardContent, CardHeader } from '@/components/ui/base';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { useAccountLedger } from '@/hooks/use-ledger';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { ArrowLeft, BookOpen, Landmark, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const typeColors: Record<string, string> = {
  asset: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  liability: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  equity: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  revenue: 'bg-green-500/10 text-green-500 border-green-500/20',
  expense: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function AccountLedgerPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const accountId = params?.accountId as string;
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data, isLoading, isError } = useAccountLedger(effectiveTenant, accountId);

  const currency = data?.lines?.[0]?.currency || 'KES';

  return (
    <SubscriptionGate feature="ledger_posting">
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${orgSlug}/accounts`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
          aria-label="Back to chart of accounts"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Ledger</h1>
          <p className="text-muted-foreground mt-1">
            Per-account transaction history with running balance.
          </p>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s ledger. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load the account ledger. Check your connection and try again.
        </div>
      )}

      {/* Account header */}
      {data && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-accent/30">
                <Landmark className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {data.account_code}
                  </span>
                  <h2 className="text-lg font-bold">{data.account_name}</h2>
                </div>
                <Badge className={cn('mt-1', typeColors[data.account_type])}>
                  {data.account_type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Opening Balance
                </p>
                <p className="text-sm font-bold tabular-nums">
                  {formatCurrency(Number(data.opening_balance), currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Closing Balance
                </p>
                <p className="text-lg font-bold tabular-nums">
                  {formatCurrency(Number(data.closing_balance), currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-tight">Transactions</h3>
          </div>
          {data && (
            <span className="text-xs text-muted-foreground">{data.total} lines</span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading account ledger...
            </div>
          )}
          {!isLoading && !isError && data && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Entry #</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Credit</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data.lines ?? []).map((line, i) => (
                    <tr key={`${line.journal_entry_id ?? line.entry_number ?? 'line'}-${i}`} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-3 text-xs">{new Date(line.transaction_date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 font-mono text-xs font-bold">{line.entry_number || '---'}</td>
                      <td className="px-6 py-3 max-w-[240px] truncate text-xs">{line.description || '---'}</td>
                      <td className="px-6 py-3 text-xs capitalize text-muted-foreground">{line.reference_type || '---'}</td>
                      <td className="px-6 py-3 text-right text-xs font-bold">
                        {Number(line.debit_amount) > 0 ? Number(line.debit_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''}
                      </td>
                      <td className="px-6 py-3 text-right text-xs font-bold">
                        {Number(line.credit_amount) > 0 ? Number(line.credit_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''}
                      </td>
                      <td className="px-6 py-3 text-right text-xs font-bold tabular-nums">
                        {Number(line.running_balance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && !isError && data && (data.lines ?? []).length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              No transactions posted to this account yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </SubscriptionGate>
  );
}
