'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeactivateAccount,
} from '@/hooks/use-accounts';
import type { Account } from '@/lib/api/accounts';
import {
  ArrowUpRight,
  Landmark,
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
  description: string;
}

const emptyForm: AccountFormData = {
  account_code: '',
  account_name: '',
  account_type: 'asset',
  currency: 'KES',
  description: '',
};

export default function AccountsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountFormData>(emptyForm);

  // Build query params
  const params: Record<string, string> = {};
  if (isPlatformOwner && tenantQueryParam) params.tenantId = tenantQueryParam;

  const { data: accountsData, isLoading } = useAccounts(tenantPathId, params);
  const createMutation = useCreateAccount(tenantPathId);
  const updateMutation = useUpdateAccount(tenantPathId);
  const deactivateMutation = useDeactivateAccount(tenantPathId);

  const accounts = accountsData?.accounts ?? [];

  const filtered = accounts.filter((acc) => {
    const name = acc.account_name ?? '';
    const code = acc.account_code ?? '';
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.includes(searchQuery);
    const matchesType = typeFilter === 'all' || acc.account_type === typeFilter;
    return matchesSearch && matchesType;
  });

  function openCreate() {
    setFormData(emptyForm);
    setCreateOpen(true);
  }

  function openEdit(account: Account) {
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      currency: 'KES', // backend doesn't store currency on account model; default
      description: account.description ?? '',
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

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your treasury ledger accounts and balances.
          </p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Account
        </Button>
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
                  onClick={() => openEdit(account)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-muted-foreground">
                          {account.account_code}
                        </span>
                        <h4 className="text-sm font-bold group-hover:text-primary transition-colors">
                          {account.account_name}
                        </h4>
                      </div>
                      <Badge className={cn('mt-1', typeColors[account.account_type])}>
                        {account.account_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold">{account.balance}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Balance
                      </p>
                    </div>
                    <button
                      type="button"
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteAccount(account);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  No accounts match your search.
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
            <FormField label="Description">
              <textarea
                className={cn(inputClasses, 'min-h-20 resize-none')}
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </FormField>
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
            <FormField label="Description">
              <textarea
                className={cn(inputClasses, 'min-h-20 resize-none')}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </FormField>
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
