'use client';

import { CreateLedgerEntryDialog } from '@/components/ledger/CreateLedgerEntryDialog';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildJournalColumns } from './journal-entry-columns';
import {
  useJournalEntries,
  useSubmitJournalEntry,
  useApproveJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
  useTrialBalance,
} from '@/hooks/use-ledger';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { JournalEntry } from '@/lib/api/ledger';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function JournalsPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  const searchParams = useSearchParams();
  const [view, setView] = useState<'entries' | 'trial-balance'>(
    searchParams.get('view') === 'trial-balance' ? 'trial-balance' : 'entries',
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refType, setRefType] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const listParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (statusFilter !== 'all') p.status = statusFilter;
    if (dateFrom) p.from = dateFrom;
    if (dateTo) p.to = dateTo;
    if (refType !== 'all') p.reference_type = refType;
    return Object.keys(p).length ? p : undefined;
  }, [statusFilter, dateFrom, dateTo, refType]);

  const { data, isLoading, isError, refetch, isFetching } = useJournalEntries(effectiveTenant, listParams);
  const entries = data?.entries ?? [];

  // Free-text search (entry #, description, reference id) is applied client-side over the
  // server-filtered set (status/date/reference_type are server-side).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      (e.entry_number ?? '').toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      (e.reference_type ?? '').toLowerCase().includes(q) ||
      (e.reference_id ?? '').toLowerCase().includes(q));
  }, [entries, search]);

  const statusOptions = ['all', 'draft', 'submitted', 'approved', 'posted', 'reversed'];
  // Common reference types posted by the platform (POS credit sales/returns, AR receipts, openings).
  const refTypeOptions = ['all', 'pos_credit_sale', 'pos_return', 'ar_receipt', 'customer_opening_balance', 'vendor_opening_balance', 'vendor_refund', 'invoice', 'bill'];

  return (
    <SubscriptionGate feature="ledger_posting">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground mt-1">Manage journal entries and view the trial balance.</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'entries' | 'trial-balance')}>
            <TabsList>
              <TabsTrigger value="entries">Entries</TabsTrigger>
              <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'entries' && (
            <Button
              variant="outline"
              disabled={isFetching}
              onClick={() => refetch()}
              title="Refresh — pulls newly posted entries if they haven't shown up yet"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          )}
          {view === 'entries' && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Entry
            </Button>
          )}
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s journal entries. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {/* Always render the table (with its own empty state) using the resolved own-tenant
          query by default — never a hint-only blank screen for the platform owner. */}
      {view === 'entries' ? (
        <JournalEntriesList
          entries={filtered}
          isLoading={isLoading}
          isError={isError}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          statusOptions={statusOptions}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          refType={refType}
          setRefType={setRefType}
          refTypeOptions={refTypeOptions}
          search={search}
          setSearch={setSearch}
          tenantSlug={effectiveTenant}
        />
      ) : (
        <TrialBalanceView tenantSlug={effectiveTenant} />
      )}

      <CreateLedgerEntryDialog
        variant="journal"
        open={createOpen}
        onOpenChange={setCreateOpen}
        tenantSlug={effectiveTenant}
      />
    </div>
    </SubscriptionGate>
  );
}

// ---- Journal Entries Table ----

function JournalEntriesList({
  entries,
  isLoading,
  isError,
  statusFilter,
  setStatusFilter,
  statusOptions,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  refType,
  setRefType,
  refTypeOptions,
  search,
  setSearch,
  tenantSlug,
}: {
  entries: JournalEntry[];
  isLoading: boolean;
  isError: boolean;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  statusOptions: string[];
  dateFrom: string;
  setDateFrom: (s: string) => void;
  dateTo: string;
  setDateTo: (s: string) => void;
  refType: string;
  setRefType: (s: string) => void;
  refTypeOptions: string[];
  search: string;
  setSearch: (s: string) => void;
  tenantSlug: string;
}) {
  const submitMutation = useSubmitJournalEntry();
  const approveMutation = useApproveJournalEntry();
  const postMutation = usePostJournalEntry();
  const reverseMutation = useReverseJournalEntry();

  const columns = useMemo(
    () =>
      buildJournalColumns({
        onSubmit: (entry) => submitMutation.mutate({ tenantSlug, entryID: entry.id }),
        onApprove: (entry) => approveMutation.mutate({ tenantSlug, entryID: entry.id }),
        onPost: (entry) => postMutation.mutate({ tenantSlug, entryID: entry.id }),
        onReverse: (entry) => reverseMutation.mutate({ tenantSlug, entryID: entry.id }),
        submitPending: submitMutation.isPending,
        approvePending: approveMutation.isPending,
        postPending: postMutation.isPending,
        reversePending: reverseMutation.isPending,
      }),
    [tenantSlug, submitMutation, approveMutation, postMutation, reverseMutation],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 py-4">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Entries</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold capitalize transition-all',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {/* Date range + reference-type + free-text search (status/date/ref-type are server-side). */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
            className="bg-accent/30 border border-border rounded-lg py-1.5 px-2 focus:ring-1 focus:ring-primary"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
            className="bg-accent/30 border border-border rounded-lg py-1.5 px-2 focus:ring-1 focus:ring-primary"
          />
          <select
            value={refType}
            onChange={(e) => setRefType(e.target.value)}
            title="Reference type"
            className="bg-accent/30 border border-border rounded-lg py-1.5 px-2 focus:ring-1 focus:ring-primary capitalize"
          >
            {refTypeOptions.map((r) => (
              <option key={r} value={r}>{r === 'all' ? 'All references' : r.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input
            placeholder="Search entry #, description, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] bg-accent/30 border border-border rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-primary"
          />
          {(dateFrom || dateTo || refType !== 'all' || search) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setRefType('all'); setSearch(''); }}
              className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent/30"
            >
              Clear
            </button>
          )}
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
            error={isError}
            storageKey="journal-entries-table"
            showExportCsv
            exportFileName="journal-entries"
            emptyText="No journal entries found."
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Trial Balance View ----

function TrialBalanceView({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useTrialBalance(tenantSlug);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Trial Balance</h3>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <Badge variant={data.is_balanced ? 'success' : 'error'}>
              {data.is_balanced ? 'Balanced' : 'Unbalanced'}
            </Badge>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh trial balance"
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading trial balance...
          </div>
        )}
        {!isLoading && isError && (
          <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load trial balance. Check your connection and try again.
          </div>
        )}
        {!isLoading && !isError && data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/5">
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Code</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Account</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Debit</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data.rows ?? []).map((row) => (
                  <tr key={row.account_id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs">{row.account_code}</td>
                    <td className="px-6 py-3 text-xs">{row.account_name}</td>
                    <td className="px-6 py-3 text-xs capitalize text-muted-foreground">{row.account_type}</td>
                    <td className="px-6 py-3 text-right text-xs font-bold">
                      {Number(row.debit) > 0 ? Number(row.debit).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="px-6 py-3 text-right text-xs font-bold">
                      {Number(row.credit) > 0 ? Number(row.credit).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-accent/10 font-bold">
                  <td colSpan={3} className="px-6 py-3 text-xs uppercase">Total</td>
                  <td className="px-6 py-3 text-right text-xs">{Number(data.total_debit).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-3 text-right text-xs">{Number(data.total_credit).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
