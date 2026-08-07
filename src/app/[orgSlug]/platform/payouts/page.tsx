'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { usePayoutHistory } from '@/hooks/use-analytics';
import { usePlatformBalance, usePlatformBanks, useCreatePlatformRecipient } from '@/hooks/use-platform-payouts';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildPlatformPayoutColumns } from './payout-history-columns';
import { Building2, Calendar, Command, Filter, Landmark, Loader2, Plus, ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 90);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function PlatformPayoutsPage() {
  const { tenantPathId } = useResolvedTenant();
  const { data: balanceData, isLoading: loadingBalance } = usePlatformBalance();
  const { data: banksData, isLoading: loadingBanks } = usePlatformBanks();
  const createRecipient = useCreatePlatformRecipient();
  const { data: payoutData, isLoading: loadingPayouts, error: payoutsError } = usePayoutHistory(tenantPathId);

  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [recipientForm, setRecipientForm] = useState({
    name: '',
    account_number: '',
    bank_code: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(() => defaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => defaultDateRange().to);
  const [page, setPage] = useState(1);

  const payouts = payoutData?.payouts ?? [];

  const filtered = useMemo(() => {
    let result = payouts;

    // Date range filter
    if (dateFrom) {
      result = result.filter((p) => p.created_at >= dateFrom);
    }
    if (dateTo) {
      const toEnd = dateTo + 'T23:59:59';
      result = result.filter((p) => p.created_at <= toEnd);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.reference?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [payouts, dateFrom, dateTo, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useMemo(() => { setPage(1); }, [searchQuery, statusFilter, dateFrom, dateTo]);

  const statusOptions = ['all', 'completed', 'processing', 'pending', 'failed'];
  const payoutColumns = useMemo(() => buildPlatformPayoutColumns(), []);

  const handleCreateRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRecipient.mutateAsync({
        type: 'nuban',
        name: recipientForm.name,
        account_number: recipientForm.account_number,
        bank_code: recipientForm.bank_code,
        currency: 'KES',
      });
      toast.success('Transfer recipient created securely');
      setShowAddRecipient(false);
      setRecipientForm({ name: '', account_number: '', bank_code: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create recipient');
    }
  };

  const netBalance = Number(balanceData?.available ?? balanceData?.balance ?? 0);
  const pendingBalance = Number(balanceData?.pending ?? balanceData?.pending_balance ?? 0);
  const currency = balanceData?.currency ?? 'KES';
  // Per-tenant payable the platform collected on behalf — shown only when the API returns it.
  const hasOwed = balanceData?.owed_to_tenants !== undefined && balanceData?.owed_to_tenants !== null;
  const owedToTenants = Number(balanceData?.owed_to_tenants ?? 0);

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Treasury</h1>
          <p className="text-muted-foreground mt-1">Manage global balances, provider settlements, and payout banks.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-4 -translate-y-4">
            <Command className="w-48 h-48" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-slate-300">
                <Landmark className="h-5 w-5" />
                <span className="font-semibold uppercase tracking-wider text-sm">Paystack Balance</span>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            
            {loadingBalance ? (
              <div className="animate-pulse h-12 bg-slate-700/50 rounded w-48 mb-2"></div>
            ) : (
              <div className="text-5xl font-black mb-2 tracking-tight">
                {formatCurrency(netBalance, currency)}
              </div>
            )}
            <p className="text-slate-400 text-sm font-medium">Paystack balance available to disburse</p>
            {!loadingBalance && (pendingBalance > 0 || hasOwed) && (
              <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-2">
                {pendingBalance > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Pending settlement</span>
                    <span className="text-amber-300 font-semibold">{formatCurrency(pendingBalance, currency)}</span>
                  </div>
                )}
                {hasOwed && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Owed to tenants</span>
                    <span className="text-rose-300 font-semibold">{formatCurrency(owedToTenants, currency)}</span>
                  </div>
                )}
              </div>
            )}
            <p className="text-slate-500 text-xs mt-2">
              This is your live Paystack balance, not gross revenue. Collected funds auto-settle to your
              bank (Paystack settles T+1 in Kenya), so a low balance here is normal even when revenue is high.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Transfer Banks ({banksData?.country || 'Kenya'})</h3>
              <p className="text-sm text-muted-foreground mt-1">Today&apos;s Projected Payout destinations</p>
            </div>
            <Button size="sm" onClick={() => setShowAddRecipient(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Recipient
            </Button>
          </CardHeader>
          <CardContent>
            {loadingBanks ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading bank directory...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {banksData?.banks?.slice(0, 18).map((bank: any) => (
                  <div key={bank.code} className="p-3 border rounded-xl flex items-center gap-3 hover:bg-accent/5 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {bank.code}
                    </div>
                    <p className="text-sm font-medium truncate" title={bank.name}>{bank.name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {payoutsError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load payout history. Check your connection and try again.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div>
            <h3 className="text-lg font-bold">Payout History</h3>
            <p className="text-sm text-muted-foreground">Rider and merchant settlement disbursements.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                placeholder="Search by reference..."
                className="bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all w-56"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <div className="px-6 pb-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-wider">Status:</span>
          </div>
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-2" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-wider">Period:</span>
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-accent/30 border-none rounded-lg px-3 py-1 text-xs focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-accent/30 border-none rounded-lg px-3 py-1 text-xs focus:ring-1 focus:ring-primary"
          />
        </div>

        <CardContent className="p-0">
          <div className="px-2 pb-2">
            <DataTable
              columns={payoutColumns}
              rows={paginatedItems}
              rowKey={(p) => p.id}
              loading={loadingPayouts}
              storageKey="platform-payout-history-table"
              emptyState={
                <div className="text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h4 className="font-bold text-muted-foreground">No payouts found</h4>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    {statusFilter !== 'all' || searchQuery
                      ? 'Try adjusting your filters or search query.'
                      : 'Trigger equity distribution or manual settlements to see activity here.'}
                  </p>
                </div>
              }
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={filtered.length}
              pageSize={ITEMS_PER_PAGE}
            />
          </div>
        </CardContent>
      </Card>

      {showAddRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddRecipient(false)}>
          <div className="bg-card rounded-xl shadow-xl border border-border max-w-md w-full p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Register Transfer Recipient</h3>
            <form onSubmit={handleCreateRecipient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Recipient Name</label>
                <input
                  required
                  value={recipientForm.name}
                  onChange={e => setRecipientForm({...recipientForm, name: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Acme Corp Ltd"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Account Number</label>
                <input
                  required
                  value={recipientForm.account_number}
                  onChange={e => setRecipientForm({...recipientForm, account_number: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder="0123456789"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Bank Code</label>
                <select
                  required
                  value={recipientForm.bank_code}
                  onChange={e => setRecipientForm({...recipientForm, bank_code: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                >
                  <option value="">-- Select Destination Bank --</option>
                  {banksData?.banks?.map((b: any) => (
                    <option key={b.code} value={b.code}>[{b.code}] {b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowAddRecipient(false)}>Cancel</Button>
                <Button type="submit" disabled={createRecipient.isPending}>
                  {createRecipient.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verify & Register <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
