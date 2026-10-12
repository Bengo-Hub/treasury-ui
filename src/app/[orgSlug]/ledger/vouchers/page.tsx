'use client';

import { ExportMenu } from '@/components/documents/ExportMenu';
import { VoucherDialog } from '@/components/ledger/VoucherDialog';
import { VOUCHER_LABEL, VOUCHER_TYPES, voucherNumberOf } from '@/components/ledger/voucher-types';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildVoucherColumns } from './voucher-columns';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useApproveJournalEntry,
  useJournalEntries,
  usePostJournalEntry,
  useRejectJournalEntry,
  useReverseJournalEntry,
  useSubmitJournalEntry,
} from '@/hooks/use-ledger';
import type { JournalEntry, ListJournalEntriesParams, VoucherType } from '@/lib/api/ledger';
import { cn } from '@/lib/utils';
import { BookOpen, Plus, Receipt, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePageReset } from '@/hooks/use-page-reset';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Awaiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'posted', label: 'Posted' },
  { value: 'reversed', label: 'Reversed' },
];

export default function VouchersPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const [typeFilter, setTypeFilter] = useState<'all' | VoucherType>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<JournalEntry | null>(null);
  const [pageSize, setPageSize] = useState(50);

  // Type, status, search and paging all run server-side over the voucher book only.
  const filterParams = useMemo<ListJournalEntriesParams>(() => ({
    vouchers: 'true',
    ...(typeFilter !== 'all' ? { voucher_type: typeFilter } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
  }), [typeFilter, statusFilter, searchQuery]);
  const [page, setPage] = usePageReset([filterParams, pageSize]);
  const { data, isLoading, error, refetch, isFetching } = useJournalEntries(effectiveTenant, { ...filterParams, page, limit: pageSize });
  // Count of vouchers awaiting a decision, whatever the current filters.
  const { data: awaiting } = useJournalEntries(effectiveTenant, { vouchers: 'true', status: 'submitted', page: 1, limit: 1 });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  const submit = useSubmitJournalEntry('Voucher');
  const approve = useApproveJournalEntry('Voucher');
  const reject = useRejectJournalEntry('Voucher');
  const post = usePostJournalEntry();
  const reverse = useReverseJournalEntry();
  const busy = submit.isPending || approve.isPending || reject.isPending || post.isPending || reverse.isPending;

  const columns = useMemo(
    () => buildVoucherColumns({
      onSubmit: (e) => submit.mutate({ tenantSlug: effectiveTenant, entryID: e.id }),
      onApprove: (e) => approve.mutate({ tenantSlug: effectiveTenant, entryID: e.id }),
      onReject: (e) => reject.mutate({ tenantSlug: effectiveTenant, entryID: e.id }),
      onPost: (e) => post.mutate({ tenantSlug: effectiveTenant, entryID: e.id }),
      onReverse: (e) => setReverseTarget(e),
      busy,
    }),
    [effectiveTenant, submit, approve, reject, post, busy],
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
                Record money paid out, received or moved between your accounts without an invoice or bill: casual wages,
                small repairs, transport, deposits, cash banked. Each voucher is approved under your approval rules, then
                posted to the ledger.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={isFetching} onClick={() => refetch()} title="Refresh">
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vouchers</p>
            <p className="mt-2 text-2xl font-bold">{total.toLocaleString()}</p>
            <p className="mt-1 text-sm text-muted-foreground">Matching the filters below</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Awaiting approval</p>
            <p className="mt-2 text-2xl font-bold">{(awaiting?.total ?? 0).toLocaleString()}</p>
            <Link href={`/${orgSlug}/approvals`} className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ShieldCheck className="h-3.5 w-3.5" /> Open the Approvals queue
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Draft, submit, approve in the Approvals queue (your rules and approvers apply), then post. Posted vouchers are
              corrected by reversing them.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voucher number, payee, reference or narration..."
                className="w-full rounded-lg border border-border bg-accent/30 py-2 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm"
            >
              {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', ...VOUCHER_TYPES] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold transition-all',
                  typeFilter === type ? 'bg-primary text-primary-foreground' : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {type === 'all' ? 'All' : VOUCHER_LABEL[type]}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-2 pb-2">
            <DataTable<JournalEntry>
              columns={columns}
              rows={entries}
              rowKey={(e) => e.id}
              loading={isLoading}
              loadingRows={8}
              error={!!error}
              storageKey="vouchers-table-v2"
              page={page}
              totalPages={Math.max(1, Math.ceil(total / pageSize))}
              onPageChange={setPage}
              total={total}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              toolbarActions={
                <ExportMenu
                  tenant={effectiveTenant}
                  path="ledger/journal-entries/export"
                  fileBase="vouchers"
                  title="Vouchers"
                  params={filterParams as Record<string, string>}
                />
              }
              emptyState={
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-accent/30">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">No vouchers found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Create a voucher to record money paid, received or moved.</p>
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      <VoucherDialog open={createOpen} onOpenChange={setCreateOpen} tenantSlug={effectiveTenant} />

      <ConfirmDialog
        open={!!reverseTarget}
        onOpenChange={(o) => { if (!o) setReverseTarget(null); }}
        title="Reverse voucher"
        description={reverseTarget ? `Reverse ${voucherNumberOf(reverseTarget)}? A reversing entry undoes its effect on every account. The original stays on record.` : undefined}
        confirmLabel="Reverse"
        destructive
        isPending={reverse.isPending}
        onConfirm={() => {
          if (!reverseTarget) return;
          reverse.mutate({ tenantSlug: effectiveTenant, entryID: reverseTarget.id }, { onSettled: () => setReverseTarget(null) });
        }}
      />
    </div>
    </SubscriptionGate>
  );
}
