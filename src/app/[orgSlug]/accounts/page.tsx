'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeactivateAccount,
} from '@/hooks/use-accounts';
import { useJournalEntries } from '@/hooks/use-ledger';
import type { Account } from '@/lib/api/accounts';
import {
  ArrowUpRight,
  Landmark,
  Layers3,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

const typeColors: Record<string, string> = {
  asset: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  liability: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  equity: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  revenue: 'bg-green-500/10 text-green-500 border-green-500/20',
  expense: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const accountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
const currencies = ['KES', 'USD', 'EUR'] as const;

interface AccountFormData {
  account_code: string;
  account_name: string;
  account_type: string;
  currency: string;
  opening_balance: string;
  description: string;
  parent_id: string;
  is_active: boolean;
}

const emptyForm: AccountFormData = {
  account_code: '',
  account_name: '',
  account_type: 'asset',
  currency: 'KES',
  opening_balance: '0.00',
  description: '',
  parent_id: '',
  is_active: true,
};

function flattenAccounts(accounts: Account[], level = 0): Array<Account & { level: number }> {
  return accounts.flatMap((account) => [
    { ...account, level },
    ...flattenAccounts(account.children ?? [], level + 1),
  ]);
}

export default function AccountsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountFormData>(emptyForm);

  const { data: accountsData, isLoading, error } = useAccounts(effectiveTenant, {});
  const { data: journalData } = useJournalEntries(effectiveTenant, { status: 'posted' });
  const createMutation = useCreateAccount(effectiveTenant);
  const updateMutation = useUpdateAccount(effectiveTenant);
  const deactivateMutation = useDeactivateAccount(effectiveTenant);

  const accounts = accountsData?.accounts ?? [];
  const flattenedAccounts = flattenAccounts(accounts);
  const selectedAccount = flattenedAccounts.find((account) => account.id === selectedAccountId) ?? flattenedAccounts[0] ?? null;
  const parentAccount = selectedAccount ? accounts.find((account) => account.id === selectedAccount.parent_id) ?? null : null;
  const postedEntries = journalData?.entries ?? [];
  const selectedAccountActivity = selectedAccount
    ? postedEntries.filter((entry) =>
        entry.lines.some(
          (line) => line.account_id === selectedAccount.id || line.account_code === selectedAccount.account_code,
        ),
      )
    : [];
  const latestActivity = selectedAccountActivity[0];

  // Platform-only account codes: not visible to regular tenants
  const PLATFORM_ONLY_CODES = ['4000', '4200', '4300', '2000', '2100', '5000', '5100', '5200', '5300'];

  const filtered = flattenedAccounts.filter((acc) => {
    // Hide platform-only accounts from non-platform users
    if (!isPlatformOwner && PLATFORM_ONLY_CODES.includes(acc.account_code)) return false;
    const name = acc.account_name ?? '';
    const code = acc.account_code ?? '';
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.includes(searchQuery);
    const matchesType = typeFilter === 'all' || acc.account_type === typeFilter;
    return matchesSearch && matchesType;
  });

  function openCreate() {
    setFormData({ ...emptyForm });
    setCreateOpen(true);
  }

  function openCreateForParent(account: Account | null) {
    setFormData({
      ...emptyForm,
      parent_id: account?.id ?? '',
      account_type: account?.account_type ?? 'asset',
    });
    setCreateOpen(true);
  }

  function openEdit(account: Account) {
    setSelectedAccountId(account.id);
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      currency: account.currency ?? 'KES',
      opening_balance: String(account.metadata?.opening_balance ?? 0),
      description: account.description ?? '',
      parent_id: account.parent_id ?? '',
      is_active: account.is_active ?? true,
    });
    setEditAccount(account);
  }

  function handleCreate() {
    createMutation.mutate(
      {
        account_code: formData.account_code,
        account_name: formData.account_name,
        account_type: formData.account_type,
        description: formData.description || undefined,
        parent_id: formData.parent_id || undefined,
        metadata: {
          is_active: formData.is_active,
          opening_balance: Number(formData.opening_balance || 0),
          currency: formData.currency,
        },
      },
      {
        onSuccess: () => setCreateOpen(false),
      },
    );
  }

  function handleUpdate() {
    if (!editAccount) return;
    updateMutation.mutate(
      {
        id: editAccount.id,
        data: {
          account_name: formData.account_name,
          description: formData.description || undefined,
          is_active: formData.is_active,
          metadata: {
            is_active: formData.is_active,
            opening_balance: Number(formData.opening_balance || 0),
            currency: formData.currency,
          },
        },
      },
      {
        onSuccess: () => setEditAccount(null),
      },
    );
  }

  function handleDeactivate() {
    if (!deleteAccount) return;
    deactivateMutation.mutate(deleteAccount.id, {
      onSuccess: () => setDeleteAccount(null),
    });
  }

  const inputClasses =
    'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none';

  const totalsByType = accountTypes.reduce((acc, type) => {
    acc[type] = accounts.filter((account) => account.account_type === type).length;
    return acc;
  }, {} as Record<string, number>);
  const activeCount = accounts.filter((account) => account.is_active !== false).length;
  const inactiveCount = accounts.filter((account) => account.is_active === false).length;
  const subAccountCount = accounts.filter((account) => Boolean(account.parent_id)).length;
  const topLevelAccounts = accounts.filter((account) => !account.parent_id);

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-background/80 p-3 shadow-sm">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Ledger foundation</p>
              <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Build the account structure that powers journals, reconciliations, reporting, and month-end close.
              </p>
            </div>
          </div>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-2xl border border-dashed border-border bg-accent/10 px-6 py-10 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above to view their chart of accounts and start managing the ledger.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load accounts. Check your connection and try again.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total accounts</p>
            <p className="mt-2 text-2xl font-bold">{accounts.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Configured in the current ledger</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active accounts</p>
            <p className="mt-2 text-2xl font-bold">{activeCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Ready for transactions and reporting</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subaccounts</p>
            <p className="mt-2 text-2xl font-bold">{subAccountCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Nested under parent accounts for clearer reporting</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account mix</p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Assets {totalsByType.asset} · Liabilities {totalsByType.liability} · Equity {totalsByType.equity}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Revenue and expense structure is tracked separately</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Account structure</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLevelAccounts.slice(0, 6).map((account) => (
              <div key={account.id} className="rounded-xl border border-border/70 bg-accent/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{account.account_name}</p>
                    <p className="text-xs text-muted-foreground">{account.account_code}</p>
                  </div>
                  <Badge className={cn('capitalize', typeColors[account.account_type])}>{account.account_type}</Badge>
                </div>
              </div>
            ))}
            {topLevelAccounts.length === 0 && <p className="text-sm text-muted-foreground">No top-level accounts available yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-tight">Selected account</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedAccount ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{selectedAccount.account_code}</p>
                  <p className="mt-1 text-lg font-semibold">{selectedAccount.account_name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn('capitalize', typeColors[selectedAccount.account_type])}>{selectedAccount.account_type}</Badge>
                  <Badge className={cn(selectedAccount.is_active === false ? 'bg-muted text-muted-foreground border-border' : 'bg-green-500/10 text-green-600 border-green-500/20')}>
                    {selectedAccount.is_active === false ? 'Inactive' : 'Active'}
                  </Badge>
                </div>
                <div className="rounded-xl border border-border/70 bg-accent/10 p-3 text-sm text-muted-foreground">
                  <p>{selectedAccount.description || 'No description provided yet.'}</p>
                </div>
                <div className="grid gap-2 rounded-xl border border-border/70 bg-accent/10 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Current balance</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(Number(selectedAccount.balance), selectedAccount.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Opening balance</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(Number(selectedAccount.metadata?.opening_balance ?? 0), selectedAccount.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Parent account</span>
                    <span className="text-right text-xs text-muted-foreground">{parentAccount ? `${parentAccount.account_code} · ${parentAccount.account_name}` : 'Top-level account'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Posted activity</span>
                    <span className="font-semibold tabular-nums">{selectedAccountActivity.length} entries</span>
                  </div>
                </div>
                {latestActivity && (
                  <div className="rounded-xl border border-border/70 bg-accent/10 p-3 text-sm text-muted-foreground">
                    <p className="text-xs font-semibold uppercase tracking-wider">Latest posting</p>
                    <p className="mt-1 font-medium text-foreground">{latestActivity.entry_number}</p>
                    <p className="text-xs">{latestActivity.description || 'No description provided'}</p>
                  </div>
                )}
                <div className="rounded-xl border border-border/70 bg-accent/10 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openCreateForParent(selectedAccount)}>Add subaccount</Button>
                    <Button size="sm" variant="outline" onClick={() => setSearchQuery(selectedAccount.account_code)}>Show related entries</Button>
                  </div>
                </div>
                <div className="space-y-2 rounded-xl border border-border/70 bg-accent/10 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent account activity</p>
                  {selectedAccountActivity.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{entry.entry_number}</span>
                        <span className="text-xs text-muted-foreground">{entry.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.description || 'No description provided'}</p>
                    </div>
                  ))}
                  {selectedAccountActivity.length === 0 && <p className="text-xs text-muted-foreground">No posted activity yet.</p>}
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" size="sm" onClick={() => openEdit(selectedAccount)}>Edit</Button>
                  {isPlatformOwner && (
                    <Button variant="outline" size="sm" onClick={() => setDeleteAccount(selectedAccount)}>Deactivate</Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select an account to inspect its details here.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by name or code..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', ...accountTypes].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold capitalize transition-all',
                  typeFilter === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((account) => (
                <div
                  key={account.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors cursor-pointer group"
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    openEdit(account);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border shrink-0">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div style={{ paddingLeft: `${account.level * 18}px` }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-muted-foreground">
                          {account.account_code}
                        </span>
                        <h4 className="text-sm font-bold group-hover:text-primary transition-colors">
                          {account.account_name}
                        </h4>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge className={cn('mt-1', typeColors[account.account_type])}>
                          {account.account_type}
                        </Badge>
                        {account.level > 0 && (
                          <Badge className="bg-accent/30 text-muted-foreground border-border">
                            Subaccount
                          </Badge>
                        )}
                        <Badge className={cn(
                          account.is_active === false
                            ? 'bg-muted text-muted-foreground border-border'
                            : 'bg-green-500/10 text-green-600 border-green-500/20',
                        )}>
                          {account.is_active === false ? 'Inactive' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{formatCurrency(Number(account.balance), account.currency)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Balance
                      </p>
                    </div>
                    {isPlatformOwner && (
                      <button
                        type="button"
                        aria-label={`Deactivate account ${account.account_code} ${account.account_name}`}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteAccount(account);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-accent/30">
                    <Landmark className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">No accounts match this view</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try broadening the search or add a new account to start building the chart.
                  </p>
                  <Button className="mt-5 gap-2" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Create account
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Add Account" description="Create a new ledger account." onClose={() => setCreateOpen(false)}>
          <div className="space-y-4">
            <FormField label="Account Code" required>
              <input
                className={inputClasses}
                placeholder="e.g. 1500"
                value={formData.account_code}
                onChange={(e) => setFormData((p) => ({ ...p, account_code: e.target.value }))}
              />
            </FormField>
            <FormField label="Account Name" required>
              <input
                className={inputClasses}
                placeholder="e.g. Cash at Bank"
                value={formData.account_name}
                onChange={(e) => setFormData((p) => ({ ...p, account_name: e.target.value }))}
              />
            </FormField>
            <FormField label="Type" required>
              <select
                className={inputClasses}
                value={formData.account_type}
                onChange={(e) => setFormData((p) => ({ ...p, account_type: e.target.value }))}
              >
                {accountTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Parent Account">
              <select
                className={inputClasses}
                value={formData.parent_id}
                onChange={(e) => setFormData((p) => ({ ...p, parent_id: e.target.value }))}
              >
                <option value="">None (top-level)</option>
                {flattenedAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {' '.repeat(account.level * 2)}{account.account_code} - {account.account_name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Currency">
              <select
                className={inputClasses}
                value={formData.currency}
                onChange={(e) => setFormData((p) => ({ ...p, currency: e.target.value }))}
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Opening Balance">
              <input
                type="number"
                step="0.01"
                className={inputClasses}
                placeholder="0.00"
                value={formData.opening_balance}
                onChange={(e) => setFormData((p) => ({ ...p, opening_balance: e.target.value }))}
              />
            </FormField>
            <FormField label="Description">
              <textarea
                className={cn(inputClasses, 'min-h-20 resize-none')}
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Active account
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.account_code || !formData.account_name || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={!!editAccount} onOpenChange={(open) => !open && setEditAccount(null)}>
        <DialogContent title="Edit Account" description="Update account details." onClose={() => setEditAccount(null)}>
          <div className="space-y-4">
            <FormField label="Account Code">
              <input className={cn(inputClasses, 'opacity-60')} value={formData.account_code} disabled />
            </FormField>
            <FormField label="Account Name" required>
              <input
                className={inputClasses}
                value={formData.account_name}
                onChange={(e) => setFormData((p) => ({ ...p, account_name: e.target.value }))}
              />
            </FormField>
            <FormField label="Type">
              <input
                className={cn(inputClasses, 'opacity-60 capitalize')}
                value={formData.account_type}
                disabled
              />
            </FormField>
            <FormField label="Opening Balance">
              <input
                type="number"
                step="0.01"
                className={inputClasses}
                value={formData.opening_balance}
                onChange={(e) => setFormData((p) => ({ ...p, opening_balance: e.target.value }))}
              />
            </FormField>
            <FormField label="Description">
              <textarea
                className={cn(inputClasses, 'min-h-20 resize-none')}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Active account
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditAccount(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!formData.account_name || updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={!!deleteAccount} onOpenChange={(open) => !open && setDeleteAccount(null)}>
        <DialogContent title="Deactivate Account" onClose={() => setDeleteAccount(null)}>
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to deactivate{' '}
            <span className="font-bold text-foreground">
              {deleteAccount?.account_code} - {deleteAccount?.account_name}
            </span>
            ? This will prevent new postings to this account.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteAccount(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
