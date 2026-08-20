'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { cn } from '@/lib/utils';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeactivateAccount,
} from '@/hooks/use-accounts';
import type { Account } from '@/lib/api/accounts';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildAccountColumns } from './account-columns';
import {
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

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
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountFormData>(emptyForm);

  const { data: accountsData, isLoading, error } = useAccounts(effectiveTenant, {});
  const createMutation = useCreateAccount(effectiveTenant);
  const updateMutation = useUpdateAccount(effectiveTenant);
  const deactivateMutation = useDeactivateAccount(effectiveTenant);

  const accounts = accountsData?.accounts ?? [];

  // Platform-only account codes: not visible to regular tenants
  const PLATFORM_ONLY_CODES = ['4000', '4200', '4300', '2000', '2100', '5000', '5100', '5200', '5300'];

  const filtered = accounts.filter((acc) => {
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

  const columns = useMemo(
    () =>
      buildAccountColumns({
        orgSlug,
        isPlatformOwner,
        onDeactivate: (account) => setDeleteAccount(account),
      }),
    [orgSlug, isPlatformOwner],
  );

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
    <SubscriptionGate feature="ledger_posting">
    <div className="p-6 space-y-6">
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

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s chart of accounts. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load accounts. Check your connection and try again.
        </div>
      )}

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
          <div className="px-2 pb-2">
            <DataTable<Account>
              columns={columns}
              rows={filtered}
              rowKey={(a) => a.id}
              loading={isLoading}
              loadingRows={8}
              onRowClick={(a) => openEdit(a)}
              rowClassName={() => 'group cursor-pointer'}
              storageKey="accounts-table"
              showExportCsv
              exportFileName={`chart-of-accounts-${orgSlug || 'export'}`}
              emptyText="No accounts match your search."
            />
          </div>
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
    </SubscriptionGate>
  );
}
