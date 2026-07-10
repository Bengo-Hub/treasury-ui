'use client';

import { CreateLedgerEntryDialog } from '@/components/ledger/CreateLedgerEntryDialog';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useJournalEntries } from '@/hooks/use-ledger';
import { cn } from '@/lib/utils';
import { BookOpen, Loader2, Plus, Receipt, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

const voucherTypes = ['payment', 'receipt', 'journal', 'sales', 'purchase'] as const;
const voucherLabels: Record<string, string> = {
  payment: 'Payment Voucher',
  receipt: 'Receipt Voucher',
  journal: 'Journal Voucher',
  sales: 'Sales Voucher',
  purchase: 'Purchase Voucher',
};

export default function VouchersPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useJournalEntries(
    effectiveTenant,
    statusFilter !== 'all' ? { status: statusFilter } : undefined,
  );

  const entries = data?.entries ?? [];
  const voucherEntries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return entries.filter((entry) => {
      const meta = (entry.metadata as Record<string, unknown> | undefined) ?? {};
      const voucherType = String(meta.voucher_type ?? entry.reference_type ?? '').toLowerCase();
      const matchesType = typeFilter === 'all' || voucherType === typeFilter;
      const matchesSearch =
        entry.entry_number.toLowerCase().includes(query) ||
        entry.description?.toLowerCase().includes(query) ||
        voucherType.includes(query);
      return matchesType && matchesSearch;
    });
  }, [entries, searchQuery, typeFilter]);

  const summaryByType = useMemo(() => {
    return voucherTypes.reduce(
      (acc, type) => {
        acc[type] = entries.filter((entry) => {
          const meta = (entry.metadata as Record<string, unknown> | undefined) ?? {};
          return String(meta.voucher_type ?? entry.reference_type ?? '').toLowerCase() === type;
        }).length;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [entries]);

  return (
    <SubscriptionGate feature="ledger_posting">
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-background/80 p-3 shadow-sm">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Voucher book</p>
              <h1 className="text-3xl font-bold tracking-tight">Vouchers</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Capture payment, receipt, sales, purchase, and journal vouchers in the same ledger workflow used for journals and reporting.
              </p>
            </div>
          </div>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Voucher
          </Button>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-2xl border border-dashed border-border bg-accent/10 px-6 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s voucher book. Drill into a tenant via the filter above to view theirs.
        </div>
      )}
      <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total vouchers</p>
                <p className="mt-2 text-2xl font-bold">{entries.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Tracked through the same ledger engine</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment / receipt</p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  Payments {summaryByType.payment} · Receipts {summaryByType.receipt}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow</p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">Drafts, approvals, posting, and reversal handled together</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voucher number or description..."
                  className="w-full rounded-lg border border-border bg-accent/30 py-2 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['all', ...voucherTypes].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-bold capitalize transition-all',
                      typeFilter === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {type === 'all' ? 'All' : voucherLabels[type]}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading vouchers...
                </div>
              ) : error ? (
                <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Failed to load vouchers. Check your connection and try again.
                </div>
              ) : voucherEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-accent/30">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">No vouchers found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create a new voucher to start building your voucher book.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {voucherEntries.map((entry) => {
                    const meta = (entry.metadata as Record<string, unknown> | undefined) ?? {};
                    const voucherType = String(meta.voucher_type ?? entry.reference_type ?? '').toLowerCase();
                    const totalDebit = (entry.lines ?? []).reduce((sum, line) => sum + Number(line.debit_amount || 0), 0);
                    return (
                      <div key={entry.id} className="flex items-center justify-between px-6 py-4 hover:bg-accent/5 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-muted-foreground">{entry.entry_number}</span>
                            <Badge className="capitalize">{voucherLabels[voucherType] ?? (voucherType || 'Voucher')}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{entry.description || 'No description'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{totalDebit.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                          <p className="text-xs text-muted-foreground">{entry.status}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>

      <CreateLedgerEntryDialog variant="voucher" open={createOpen} onOpenChange={setCreateOpen} tenantSlug={effectiveTenant} />
    </div>
    </SubscriptionGate>
  );
}
