'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { StatementDialog } from '@/components/statement-dialog';
import { OpeningBalanceDialog } from '@/components/opening-balance-dialog';
import type { CustomerBalance } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  ArrowUpRight,
  Banknote,
  CloudUpload,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Search,
  User,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSyncCustomerToCRM } from '@/hooks/use-invoices';
import { useClients, type ClientRecord } from './use-clients';
import { ClientDetail } from './ClientDetail';
import { CreditTermsDialog } from './CreditTermsDialog';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { SyncToCrmDialog } from './SyncToCrmDialog';

/** Account-relationship filter: who owes me money vs whom I owe (store credit / overpayment). */
type BalanceFilter = 'all' | 'owe_me' | 'i_owe' | 'settled';
/** Credit-terms filter. */
type CreditFilter = 'all' | 'has_limit' | 'over_limit' | 'no_limit';
type SortKey = 'name' | 'highest_due' | 'store_credit' | 'recent_payment';

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
  const { clients, invoices, isLoading, error } = useClients(tenant);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [statementClient, setStatementClient] = useState<{ id: string; name: string } | null>(null);
  const [openingClient, setOpeningClient] = useState<ClientRecord | null>(null);
  const [payTarget, setPayTarget] = useState<CustomerBalance | null>(null);
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

  const outstanding = useMemo(
    () => clients.filter((c) => c.balance && c.outstanding > 0.0001),
    [clients],
  );

  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');
  const [creditFilter, setCreditFilter] = useState<CreditFilter>('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');

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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = clients.filter((c) => {
      if (q &&
        !(c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.customerId ?? '').toLowerCase().includes(q))) return false;
      if (balanceFilter === 'owe_me' && !(c.outstanding > 0.0001)) return false;
      if (balanceFilter === 'i_owe' && !owedToCustomer(c)) return false;
      if (balanceFilter === 'settled' && (c.outstanding > 0.0001 || owedToCustomer(c))) return false;
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
    const num = (v?: string) => parseFloat(v ?? '0') || 0;
    switch (sortKey) {
      case 'highest_due':
        rows.sort((a, b) => b.outstanding - a.outstanding);
        break;
      case 'store_credit':
        rows.sort((a, b) => num(b.balance?.total_credits) - num(a.balance?.total_credits));
        break;
      case 'recent_payment':
        rows.sort((a, b) =>
          new Date(b.balance?.last_payment_date ?? 0).getTime() - new Date(a.balance?.last_payment_date ?? 0).getTime());
        break;
      default:
        rows.sort((a, b) => a.name.localeCompare(b.name));
    }
    return rows;
  }, [clients, searchQuery, balanceFilter, creditFilter, methodFilter, sortKey]);

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

      {/* Outstanding AR balances (operational ledger) — includes POS credit sales (no
          invoice). This is where on-account debt is settled via "Receive Payment". */}
      {outstanding.length > 0 && (
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold">Outstanding balances (on account)</h3>
              <Badge variant="warning" className="ml-1">{outstanding.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {outstanding.map((c) => {
                const b = c.balance!;
                return (
                  <div key={c.key} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold truncate">{c.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Paid {formatCurrency(parseFloat(b.total_paid) || 0, b.currency)} of {formatCurrency(parseFloat(b.total_invoiced) || 0, b.currency)}
                        {b.last_payment_date && ` · last paid ${new Date(b.last_payment_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-600">{formatCurrency(c.outstanding, b.currency)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">due</p>
                      </div>
                      <Button size="sm" onClick={() => setPayTarget(b)}>Receive payment</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {payTarget && (
        <ReceivePaymentModal tenant={tenant} target={payTarget} onClose={() => setPayTarget(null)} />
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
              {BALANCE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setBalanceFilter(f.key)}
                  className={cn('px-3 py-1.5 rounded-full border transition-colors',
                    balanceFilter === f.key ? f.active : 'border-border text-muted-foreground hover:bg-accent/30')}
                >
                  {f.label}
                </button>
              ))}
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
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-accent/30 border-none rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-primary ml-auto"
              title="Sort"
            >
              <option value="name">Sort: name</option>
              <option value="highest_due">Sort: highest balance due</option>
              <option value="store_credit">Sort: store credit</option>
              <option value="recent_payment">Sort: recently paid</option>
            </select>
            <span className="text-muted-foreground">{filtered.length} of {clients.length}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading clients...
            </div>
          )}
          {!isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-semibold px-6 py-3">Client</th>
                    <th className="text-left font-semibold px-3 py-3">Contact ID</th>
                    <th className="text-right font-semibold px-3 py-3">Credit Limit</th>
                    <th className="text-right font-semibold px-3 py-3">Opening Bal.</th>
                    <th className="text-right font-semibold px-3 py-3">Store Credit</th>
                    <th className="text-right font-semibold px-3 py-3">Balance Due</th>
                    <th className="text-left font-semibold px-3 py-3">Last Paid</th>
                    <th className="text-right font-semibold px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => {
                    const b = c.balance;
                    const openingBal = b?.opening_balance ? parseFloat(b.opening_balance) || 0 : 0;
                    const storeCredit = b?.total_credits ? parseFloat(b.total_credits) || 0 : 0;
                    const creditLimit = b?.credit_limit ? parseFloat(b.credit_limit) || 0 : null;
                    return (
                      <tr
                        key={c.key}
                        onClick={() => setSelectedKey(c.key)}
                        className="hover:bg-accent/5 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-3">
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
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                          {c.customerId ? c.customerId.slice(0, 8) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                          {creditLimit != null ? formatCurrency(creditLimit, c.currency) : 'No limit'}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {openingBal ? formatCurrency(openingBal, c.currency) : '—'}
                        </td>
                        <td className={cn('px-3 py-3 text-right tabular-nums', storeCredit > 0 && 'text-emerald-600 font-semibold')}>
                          {storeCredit ? formatCurrency(storeCredit, c.currency) : '—'}
                        </td>
                        <td className={cn('px-3 py-3 text-right tabular-nums font-bold', c.outstanding > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                          {c.outstanding > 0 ? formatCurrency(c.outstanding, c.currency) : 'Settled'}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                          {b?.last_payment_method ? (
                            <span className="capitalize">{b.last_payment_method.replace(/_/g, ' ')}</span>
                          ) : '—'}
                          {b?.last_payment_date && (
                            <span className="block text-[10px]">{new Date(b.last_payment_date).toLocaleDateString()}</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {b && c.outstanding > 0 && (
                              <Button size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setPayTarget(b); }}>
                                Receive
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
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && !isLoading && (
                    <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">No clients found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
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
