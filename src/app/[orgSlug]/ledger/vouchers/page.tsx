'use client';

import { CreateLedgerEntryDialog } from '@/components/ledger/CreateLedgerEntryDialog';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildVoucherColumns, voucherLabels, voucherTypeOf } from './voucher-columns';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useJournalEntries } from '@/hooks/use-ledger';
import type { JournalEntry } from '@/lib/api/ledger';
import { cn } from '@/lib/utils';
import { BookOpen, Plus, Receipt, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

const voucherTypes = ['payment', 'receipt', 'journal', 'sales', 'purchase'] as const;

export default function VouchersPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useJournalEntries(
    effectiveTenant,
    statusFilter !== 'all' ? { status: statusFilter } : undefined,
  );

  const entries = data?.entries ?? [];
  const voucherEntries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return entries.filter((entry) => {
      const voucherType = voucherTypeOf(entry);
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
        acc[type] = entries.filter((entry) => voucherTypeOf(entry) === type).length;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [entries]);

  const voucherColumns = useMemo(
    () => buildVoucherColumns(voucherTypes.map((value) => ({ value, label: voucherLabels[value] }))),
    [],
  );

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={isFetching}
              onClick={() => refetch()}
              title="Refresh — pulls newly recorded vouchers if they haven't shown up yet"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Voucher
            </Button>
          </div>
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
              <div className="px-2 pb-2">
                <DataTable<JournalEntry>
                  columns={voucherColumns}
                  rows={voucherEntries}
                  rowKey={(e) => e.id}
                  loading={isLoading}
                  loadingRows={8}
                  error={!!error}
                  storageKey="vouchers-table"
                  showExportCsv
                  exportFileName="vouchers"
                  emptyState={
                    <div className="text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-accent/30">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold">No vouchers found</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Create a new voucher to start building your voucher book.
                      </p>
                    </div>
                  }
                />
              </div>
            </CardContent>
          </Card>
        </>

      <CreateLedgerEntryDialog variant="voucher" open={createOpen} onOpenChange={setCreateOpen} tenantSlug={effectiveTenant} />
    </div>
    </SubscriptionGate>
  );
}
