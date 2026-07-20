'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import {
  DataTable,
  compareValues,
  type DataTableColumn,
  type SortState,
} from '@bengo-hub/shared-ui-lib/data-table';
import { StatementDialog } from '@/components/statement-dialog';
import { OpeningBalanceDialog } from '@/components/opening-balance-dialog';
import type { CustomerBalance } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  ArrowUpRight,
  CloudUpload,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Search,
  User,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSyncCustomerToCRM } from '@/hooks/use-invoices';
import { useClients, type ClientRecord } from './use-clients';
import { ClientDetail } from './ClientDetail';
import { CreditTermsDialog } from './CreditTermsDialog';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { PayoutCreditModal } from './PayoutCreditModal';
import { SyncToCrmDialog } from './SyncToCrmDialog';

/** Account-relationship filter: who owes me money vs whom I owe (store credit / overpayment). */
type BalanceFilter = 'all' | 'owe_me' | 'i_owe' | 'settled';
/** Credit-terms filter. */
type CreditFilter = 'all' | 'has_limit' | 'over_limit' | 'no_limit';

const numAcc = (v?: string | null) => parseFloat(v ?? '0') || 0;

/** Raw sort values per column key — shared by the DataTable headers and the host-side sort. */
const CLIENT_SORT_ACCESSORS: Record<string, (c: ClientRecord) => unknown> = {
  client: (c) => c.name.toLowerCase(),
  contact_id: (c) => c.customerId ?? '',
  credit_limit: (c) => numAcc(c.balance?.credit_limit),
  opening_balance: (c) => numAcc(c.balance?.opening_balance),
  store_credit: (c) => numAcc(c.balance?.total_credits),
  balance_due: (c) => c.outstanding,
  last_paid: (c) => (c.balance?.last_payment_date ? new Date(c.balance.last_payment_date).getTime() : 0),
};

const BALANCE_FILTERS: { key: BalanceFilter; label: string; active: string }[] = [
  { key: 'all', label: 'All', active: 'bg-primary/10 border-primary/50 text-primary' },
  { key: 'owe_me', label: 'Owe me (debtors)', active: 'bg-amber-500/15 border-amber-500/50 text-amber-700' },
  { key: 'i_owe', label: 'I owe (credit)', active: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700' },
  { key: 'settled', label: 'Settled', active: 'bg-accent border-border text-foreground' },
];

interface ClientsManagerProps {
  /** Tenant identifier (orgSlug or UUID) whose clients to manage. */
  tenant: string;
  /** Show the "showing your own org" platform-owner hint. */
  showOwnOrgHint?: boolean;
}

/**
 * ClientsManager — the ONE shared component listing a tenant's clients, merged from
 * doc-derived customers (invoices + operational AR balances) and CRM contacts (the
 * marketflow customer SoT). De-dupe/merge lives in `useClients`. Carries the full
 * Customers-page functionality: list/cards, outstanding balances, AR statement
 * (StatementDialog) and receive-payment (useRecordCustomerPayment). Reused by the
 * Customers page and every doc "Manage Clients" tab.
 */
export function ClientsManager({ tenant, showOwnOrgHint }: ClientsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // Search drives the CRM lookup server-side (whole directory), then the same query narrows the
  // merged rows client-side below — so a customer is findable even if beyond the preloaded page.
  const { clients, invoices, isLoading, error } = useClients(tenant, searchQuery);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [statementClient, setStatementClient] = useState<{ id: string; name: string } | null>(null);
  const [openingClient, setOpeningClient] = useState<ClientRecord | null>(null);
  const [payTarget, setPayTarget] = useState<CustomerBalance | null>(null);
  const [payoutTarget, setPayoutTarget] = useState<CustomerBalance | null>(null);
  const [creditTermsClient, setCreditTermsClient] = useState<ClientRecord | null>(null);
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [syncDialogClient, setSyncDialogClient] = useState<ClientRecord | null>(null);
  const syncCrm = useSyncCustomerToCRM(tenant);

  // Run the actual sync mutation with the resolved contact details.
  const performSync = (c: ClientRecord, email?: string, phone?: string) => {
    setSyncingKey(c.key);
    syncCrm.mutate(
      { customer_name: c.name, email: email || undefined, phone: phone || undefined },
      {
        onSuccess: (r) => {
          toast.success(`${c.name} synced to CRM · linked ${r.invoices_updated} invoice(s)`);
          setSyncDialogClient(null);
        },
        onError: () => toast.error('Failed to sync to CRM.'),
        onSettled: () => setSyncingKey(null),
      },
    );
  };

  // Sync a doc-only client (not yet in the CRM) into MarketFlow (customer SoT) + back-link docs.
  // With email/phone already on file, sync directly; otherwise prompt for contact details.
  const handleSyncToCRM = (c: ClientRecord) => {
    if (!c.email && !c.phone) {
      setSyncDialogClient(c);
      return;
    }
    performSync(c, c.email, c.phone);
  };

  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');
  const [creditFilter, setCreditFilter] = useState<CreditFilter>('all');
  const [methodFilter, setMethodFilter] = useState('all');
  // Sort + pagination now driven by the shared DataTable (sortable headers + entries selector).
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Payment-mode options come from the data itself (last_payment_method on the AR row),
  // so the dropdown only ever offers modes that actually occur in this tenant's book.
  const paymentMethods = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      const m = (c.balance?.last_payment_method ?? '').trim().toLowerCase();
      if (m) set.add(m);
    });
    return Array.from(set).sort();
  }, [clients]);

  // "I owe" = the customer holds value against me: store credit issued, or an
  // overpaid/negative balance (they paid more than they were invoiced).
  const owedToCustomer = (c: ClientRecord) => {
    const storeCredit = parseFloat(c.balance?.total_credits ?? '0') || 0;
    const due = parseFloat(c.balance?.balance_due ?? '0') || 0;
    return storeCredit > 0.0001 || due < -0.0001;
  };

  // Rows matching every filter EXCEPT the balance-relationship capsule — the base set the
  // balance filter (and its per-capsule count badges) narrows. Keeping the count base free of
  // the balance filter means each capsule badge shows how many rows it WOULD select.
  const scoped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clients.filter((c) => {
      if (q &&
        !(c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.customerId ?? '').toLowerCase().includes(q))) return false;
      if (creditFilter !== 'all') {
        const limit = parseFloat(c.balance?.credit_limit ?? '0') || 0;
        if (creditFilter === 'has_limit' && !(limit > 0)) return false;
        if (creditFilter === 'no_limit' && limit > 0) return false;
        if (creditFilter === 'over_limit' && !(limit > 0 && c.outstanding > limit)) return false;
      }
      if (methodFilter !== 'all' &&
        (c.balance?.last_payment_method ?? '').trim().toLowerCase() !== methodFilter) return false;
      return true;
    });
  }, [clients, searchQuery, creditFilter, methodFilter]);

  // Per-capsule counts (rendered as badges on each balance filter).
  const balanceCounts = useMemo<Record<BalanceFilter, number>>(() => {
    const counts: Record<BalanceFilter, number> = { all: scoped.length, owe_me: 0, i_owe: 0, settled: 0 };
    scoped.forEach((c) => {
      if (c.outstanding > 0.0001) counts.owe_me += 1;
      else if (owedToCustomer(c)) counts.i_owe += 1;
      else counts.settled += 1;
    });
    return counts;
  }, [scoped]);

  const matchesBalance = (c: ClientRecord) => {
    if (balanceFilter === 'owe_me') return c.outstanding > 0.0001;
    if (balanceFilter === 'i_owe') return owedToCustomer(c);
    if (balanceFilter === 'settled') return !(c.outstanding > 0.0001) && !owedToCustomer(c);
    return true;
  };

  const filtered = useMemo(() => {
    const rows = scoped.filter(matchesBalance);
    const acc = sort ? CLIENT_SORT_ACCESSORS[sort.key] : undefined;
    if (sort && acc) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      return [...rows].sort((a, b) => dir * compareValues(acc(a), acc(b)));
    }
    return [...rows].sort((a, b) => a.name.localeCompare(b.name)); // default: name A→Z
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, balanceFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  // Reset to page 1 whenever the result set changes (filter/search/sort).
  useEffect(() => { setPage(1); }, [searchQuery, balanceFilter, creditFilter, methodFilter, sort, pageSize]);

  if (!tenant) return null;

  const selected = selectedKey ? clients.find((c) => c.key === selectedKey) : undefined;
  if (selected) {
    return (
      <ClientDetail
        tenant={tenant}
        client={selected}
        invoices={invoices}
        onBack={() => setSelectedKey(null)}
      />
    );
  }

  const openStatement = (c: ClientRecord) => {
    if (c.customerId) setStatementClient({ id: c.customerId, name: c.name });
  };

  // Columns for the shared DataTable — same data + actions as the old hand-rolled table, now with
  // sortable headers, column-visibility, CSV export and pagination for free.
  const columns: DataTableColumn<ClientRecord>[] = [
    {
      key: 'client', header: 'Client', sortable: true, accessor: CLIENT_SORT_ACCESSORS.client,
      render: (c) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-accent/30 flex items-center justify-center border border-border shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold group-hover:text-primary transition-colors truncate">{c.name}</span>
              {c.fromCRM && <Badge variant="outline" className="capitalize">{c.contactType || 'CRM'}</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
              <span>{c.invoiceCount} invoice{c.invoiceCount !== 1 ? 's' : ''}</span>
              {c.email && <span className="flex items-center gap-1">· <Mail className="h-2.5 w-2.5" />{c.email}</span>}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact_id', header: 'Contact ID', accessor: CLIENT_SORT_ACCESSORS.contact_id,
      cellClassName: 'font-mono text-[11px] text-muted-foreground',
      render: (c) => (c.customerId ? c.customerId.slice(0, 8) : '—'),
    },
    {
      key: 'credit_limit', header: 'Credit Limit', align: 'right', sortable: true,
      accessor: CLIENT_SORT_ACCESSORS.credit_limit, cellClassName: 'tabular-nums text-muted-foreground',
      render: (c) => {
        const creditLimit = c.balance?.credit_limit ? parseFloat(c.balance.credit_limit) || 0 : null;
        return creditLimit != null ? formatCurrency(creditLimit, c.currency) : 'No limit';
      },
    },
    {
      key: 'opening_balance', header: 'Opening Bal.', align: 'right', sortable: true,
      accessor: CLIENT_SORT_ACCESSORS.opening_balance, cellClassName: 'tabular-nums',
      render: (c) => {
        const openingBal = c.balance?.opening_balance ? parseFloat(c.balance.opening_balance) || 0 : 0;
        return openingBal ? formatCurrency(openingBal, c.currency) : '—';
      },
    },
    {
      key: 'store_credit', header: 'Store Credit', align: 'right', sortable: true,
      accessor: CLIENT_SORT_ACCESSORS.store_credit,
      render: (c) => {
        const storeCredit = c.balance?.total_credits ? parseFloat(c.balance.total_credits) || 0 : 0;
        return (
          <span className={cn('tabular-nums', storeCredit > 0 && 'text-emerald-600 font-semibold')}>
            {storeCredit ? formatCurrency(storeCredit, c.currency) : '—'}
          </span>
        );
      },
    },
    {
      key: 'balance_due', header: 'Balance Due', align: 'right', sortable: true,
      accessor: CLIENT_SORT_ACCESSORS.balance_due,
      render: (c) => {
        const b = c.balance;
        const overdueAmt = parseFloat(b?.overdue_amount ?? '0') || 0;
        const oldestDue = b?.oldest_due_date ? new Date(b.oldest_due_date) : null;
        if (c.outstanding > 0.0001) {
          return (
            <div className="flex flex-col items-end gap-1">
              <span className="tabular-nums font-bold text-amber-600">{formatCurrency(c.outstanding, c.currency)}</span>
              {overdueAmt > 0.0001 ? (
                <span title="Past its due date — settle via Receive payment">
                  <Badge variant="error">Overdue {formatCurrency(overdueAmt, c.currency)}</Badge>
                </span>
              ) : (
                <span title={oldestDue ? `Falls due ${oldestDue.toLocaleDateString()}` : 'Open balance within credit terms'}>
                  <Badge variant="warning">Due{oldestDue ? ` ${oldestDue.toLocaleDateString()}` : ''}</Badge>
                </span>
              )}
            </div>
          );
        }
        if (owedToCustomer(c)) {
          const storeCr = parseFloat(b?.total_credits ?? '0') || 0;
          const overpaid = Math.max(-(parseFloat(b?.balance_due ?? '0') || 0), 0);
          return (
            <span title="Value the customer holds against you (store credit / overpayment)">
              <Badge variant="success">Owed {formatCurrency(storeCr + overpaid, c.currency)}</Badge>
            </span>
          );
        }
        return <span className="tabular-nums font-bold text-emerald-600">Settled</span>;
      },
    },
    {
      key: 'last_paid', header: 'Last Paid', sortable: true, accessor: CLIENT_SORT_ACCESSORS.last_paid,
      cellClassName: 'text-[11px] text-muted-foreground whitespace-nowrap',
      render: (c) => {
        const b = c.balance;
        return (
          <>
            {b?.last_payment_method ? (
              <span className="capitalize">{b.last_payment_method.replace(/_/g, ' ')}</span>
            ) : '—'}
            {b?.last_payment_date && (
              <span className="block text-[10px]">{new Date(b.last_payment_date).toLocaleDateString()}</span>
            )}
          </>
        );
      },
    },
    {
      key: 'actions', header: 'Actions', align: 'right', exportable: false,
      render: (c) => {
        const b = c.balance;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {b && c.outstanding > 0 && (
              <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setPayTarget(b); }}>
                Receive
              </Button>
            )}
            {b && owedToCustomer(c) && (
              <Button size="sm" variant="outline" title="Pay out the customer's stored credit"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setPayoutTarget(b); }}>
                Pay out
              </Button>
            )}
            {(c.customerId || b) && (
              <Button variant="outline" size="sm" title="Credit terms (limit & payment period)"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setCreditTermsClient(c); }}>
                <CreditCard className="h-3.5 w-3.5" />
              </Button>
            )}
            {!c.fromCRM && (
              <Button variant="outline" size="sm" disabled={syncingKey === c.key} title="Sync to CRM"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleSyncToCRM(c); }}>
                {syncingKey === c.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button variant="outline" size="sm" title="Set opening balance"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpeningClient(c); }}>
              <Wallet className="h-3.5 w-3.5" />
            </Button>
            {c.customerId && (
              <Button variant="outline" size="sm" title="AR statement"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); openStatement(c); }}>
                <FileText className="h-3.5 w-3.5" />
              </Button>
            )}
            <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-black tracking-tight text-foreground">Clients</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your clients merged from documents and the CRM, with balances and statements.
        </p>
      </div>

      {showOwnOrgHint && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s clients. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load clients. Check your connection and try again.
        </div>
      )}

      {payTarget && (
        <ReceivePaymentModal tenant={tenant} target={payTarget} onClose={() => setPayTarget(null)} />
      )}

      {payoutTarget && (
        <PayoutCreditModal tenant={tenant} target={payoutTarget} onClose={() => setPayoutTarget(null)} />
      )}

      <Card>
        <CardHeader className="space-y-3 py-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                placeholder="Search name, email, phone, contact ID..."
                className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Account-relationship capsule tabs: debtors (they owe me) vs creditors (I owe them). */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              {BALANCE_FILTERS.map((f) => {
                const isActive = balanceFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setBalanceFilter(f.key)}
                    className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors',
                      isActive ? f.active : 'border-border text-muted-foreground hover:bg-accent/30')}
                  >
                    {f.label}
                    <span className={cn(
                      'inline-flex min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                      isActive ? 'bg-current/15' : 'bg-accent text-muted-foreground')}
                    >
                      {balanceCounts[f.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <select
              value={creditFilter}
              onChange={(e) => setCreditFilter(e.target.value as CreditFilter)}
              className="bg-accent/30 border-none rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-primary"
              title="Credit terms filter"
            >
              <option value="all">Credit: any</option>
              <option value="has_limit">Has credit limit</option>
              <option value="over_limit">Over credit limit</option>
              <option value="no_limit">No credit limit</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-accent/30 border-none rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-primary"
              title="Filter by how the customer last paid"
            >
              <option value="all">Payment mode: any</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m} className="capitalize">{m.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <span className="text-muted-foreground ml-auto">{filtered.length} of {clients.length}</span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <DataTable<ClientRecord>
            columns={columns}
            rows={paged}
            rowKey={(c) => c.key}
            loading={isLoading}
            onRowClick={(c) => setSelectedKey(c.key)}
            rowClassName={() => 'group cursor-pointer'}
            sort={sort}
            onSortChange={setSort}
            storageKey="clients-table"
            showExportCsv
            exportFileName={`clients-${tenant || 'export'}`}
            onExportAll={() => Promise.resolve(filtered)}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={filtered.length}
            emptyText="No clients found."
          />
        </CardContent>
      </Card>

      {statementClient && (
        <StatementDialog
          kind="customer"
          open={!!statementClient}
          onClose={() => setStatementClient(null)}
          tenant={tenant}
          entityId={statementClient.id}
          name={statementClient.name}
        />
      )}

      {openingClient && (
        <OpeningBalanceDialog
          kind="customer"
          open={!!openingClient}
          onClose={() => setOpeningClient(null)}
          tenant={tenant}
          name={openingClient.name}
          crmContactId={openingClient.customerId}
          customerIdentifier={openingClient.name}
        />
      )}

      {creditTermsClient && (
        <CreditTermsDialog
          tenant={tenant}
          contactId={creditTermsClient.customerId || creditTermsClient.balance?.customer_identifier || creditTermsClient.balance?.id || creditTermsClient.name}
          customerName={creditTermsClient.name}
          currency={creditTermsClient.currency}
          currentLimit={creditTermsClient.balance?.credit_limit ? parseFloat(creditTermsClient.balance.credit_limit) || 0 : null}
          currentPeriodDays={creditTermsClient.balance?.credit_period_days ?? null}
          onClose={() => setCreditTermsClient(null)}
        />
      )}

      {syncDialogClient && (
        <SyncToCrmDialog
          name={syncDialogClient.name}
          defaultEmail={syncDialogClient.email}
          defaultPhone={syncDialogClient.phone}
          pending={syncingKey === syncDialogClient.key}
          onConfirm={({ email, phone }) => performSync(syncDialogClient, email, phone)}
          onClose={() => setSyncDialogClient(null)}
        />
      )}
    </div>
  );
}
