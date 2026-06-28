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
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { SyncToCrmDialog } from './SyncToCrmDialog';

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

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [clients, searchQuery]);

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
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search clients..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading clients...
            </div>
          )}
          {!isLoading && (
            <div className="divide-y divide-border">
              {filtered.map((c) => (
                <div
                  key={c.key}
                  onClick={() => setSelectedKey(c.key)}
                  className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold group-hover:text-primary transition-colors truncate">{c.name}</h4>
                        {c.fromCRM && <Badge variant="outline" className="capitalize">{c.contactType || 'CRM'}</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                        <span>{c.invoiceCount} invoice{c.invoiceCount !== 1 ? 's' : ''}</span>
                        {c.email && (
                          <span className="flex items-center gap-1">· <Mail className="h-2.5 w-2.5" />{c.email}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(c.totalAmount, c.currency)}</p>
                      <p className={cn('text-[10px] uppercase tracking-wider', c.outstanding > 0 ? 'text-amber-500' : 'text-emerald-500')}>
                        {c.outstanding > 0 ? `${formatCurrency(c.outstanding, c.currency)} due` : 'Fully paid'}
                      </p>
                    </div>
                    {!c.fromCRM && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={syncingKey === c.key}
                        title="Sync this client to the CRM"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleSyncToCRM(c);
                        }}
                      >
                        {syncingKey === c.key ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <CloudUpload className="h-3.5 w-3.5 mr-1" />
                        )}
                        Sync to CRM
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      title="Set this client's carried-in AR opening balance"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setOpeningClient(c);
                      }}
                    >
                      <Wallet className="h-3.5 w-3.5 mr-1" />
                      Opening Balance
                    </Button>
                    {c.customerId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          openStatement(c);
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Statement
                      </Button>
                    )}
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </div>
                </div>
              ))}
              {filtered.length === 0 && !isLoading && (
                <div className="p-12 text-center text-muted-foreground">No clients found.</div>
              )}
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
