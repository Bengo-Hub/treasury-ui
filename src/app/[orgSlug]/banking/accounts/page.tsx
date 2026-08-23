'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { BankAccountForm, EMPTY_BANK_ACCOUNT, type BankAccountValue } from '@/components/payments/bank-account-form';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useBankAccounts,
  useCreateBankAccount,
  useDeleteBankAccount,
} from '@/hooks/use-bank-accounts';
import type { AccountType, BankAccount, BankAccountRequest } from '@/lib/api/bank-accounts';
import { money } from '@/components/charts/chart-theme';
import { cn } from '@/lib/utils';
import { Banknote, Landmark, Loader2, Plus, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: typeof Landmark }[] = [
  { value: 'bank', label: 'Bank Account', icon: Landmark },
  { value: 'mobile_money', label: 'Mobile Money (Till / Paybill)', icon: Smartphone },
  { value: 'cash', label: 'Cash Drawer / Petty Cash', icon: Banknote },
];

const TYPE_ICON: Record<string, typeof Landmark> = {
  bank: Landmark,
  mobile_money: Smartphone,
  cash: Banknote,
  gateway: Wallet,
};

const TYPE_LABEL: Record<string, string> = {
  bank: 'Bank',
  mobile_money: 'Mobile Money',
  cash: 'Cash',
  gateway: 'Gateway',
};

/**
 * Accounts — the tenant's real, ledger-linked money-holding accounts (bank/mobile-money/cash/
 * gateway), each with a live GL-derived balance and a drillable statement. Distinct from the
 * "/accounts" page (chart of accounts — GL categories like "6100 General Operating Expense"), and
 * from the Reconciliation page's own account picker (statement import / auto-match — a paid
 * feature; this list is the free, core bookkeeping view every tenant gets). Reuses BankAccountForm
 * (the same Paystack-verified bank-details widget used everywhere else in the app) unchanged for
 * the bank type; mobile_money/cash get their own lightweight fields.
 */
export default function AccountsPage() {
  const router = useRouter();
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  const tenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data, isLoading, isError } = useBankAccounts(tenant);
  const createMutation = useCreateBankAccount(tenant);
  const deleteMutation = useDeleteBankAccount(tenant);

  const accounts = data?.bank_accounts ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [bankValue, setBankValue] = useState<BankAccountValue>(EMPTY_BANK_ACCOUNT);
  const [accountName, setAccountName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  function resetForm() {
    setAccountType('bank');
    setBankValue(EMPTY_BANK_ACCOUNT);
    setAccountName('');
    setMobileNumber('');
    setOpeningBalance('');
  }

  function handleCreate() {
    const payload: BankAccountRequest = {
      account_type: accountType,
      account_name:
        accountType === 'bank' ? bankValue.account_name : accountName,
      // Only KES accounts are supported today (backend rejects anything else) — always send it
      // explicitly rather than relying on the backend's implicit empty-string default.
      currency: 'KES',
      opening_balance: openingBalance ? parseFloat(openingBalance) : undefined,
    };
    if (accountType === 'bank') {
      if (!bankValue.account_name || !bankValue.bank_name || !bankValue.account_number) {
        toast.error('Bank name, account number, and account name are required');
        return;
      }
      payload.bank_name = bankValue.bank_name;
      payload.account_number = bankValue.account_number;
      payload.bank_branch = bankValue.bank_branch || undefined;
      payload.branch_code = bankValue.branch_code || undefined;
    } else if (accountType === 'mobile_money') {
      if (!accountName || !mobileNumber) {
        toast.error('Account name and till/paybill number are required');
        return;
      }
      payload.account_number = mobileNumber;
    } else if (accountType === 'cash') {
      if (!accountName) {
        toast.error('Account name is required');
        return;
      }
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Account created');
        setDialogOpen(false);
        resetForm();
      },
      onError: () => toast.error('Failed to create account'),
    });
  }

  function handleDeactivate(account: BankAccount) {
    deleteMutation.mutate(account.id, {
      onError: (err: any) =>
        toast.error(err?.response?.data?.error ?? 'Failed to deactivate — it may still have a balance'),
    });
  }

  const columns: DataTableColumn<BankAccount>[] = useMemo(
    () => [
      {
        key: 'account_name',
        header: 'Account',
        primary: true,
        sortable: true,
        accessor: (a) => a.account_name,
        render: (a) => {
          const Icon = TYPE_ICON[a.account_type] ?? Landmark;
          return (
            <button
              type="button"
              className="flex items-center gap-2 text-left hover:underline"
              onClick={() => router.push(`/${orgSlug}/banking/accounts/${a.id}`)}
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="block font-bold">{a.account_name}</span>
                {a.bank_name && <span className="block text-xs text-muted-foreground">{a.bank_name}</span>}
              </span>
            </button>
          );
        },
      },
      {
        key: 'account_type',
        header: 'Type',
        accessor: (a) => a.account_type,
        render: (a) => (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
            {TYPE_LABEL[a.account_type] ?? a.account_type}
          </span>
        ),
      },
      {
        key: 'account_number',
        header: 'Number',
        accessor: (a) => a.account_number ?? '',
        cellClassName: 'font-mono text-xs',
        render: (a) => a.account_number || '—',
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        accessor: (a) => parseFloat(a.balance || '0'),
        render: (a) => (
          <span className={cn('font-semibold', !a.ledger_account_id && 'text-muted-foreground')}>
            {a.ledger_account_id ? money(parseFloat(a.balance || '0')) : 'Not linked'}
          </span>
        ),
      },
      {
        key: 'currency',
        header: 'Currency',
        accessor: (a) => a.currency,
      },
      {
        key: 'actions',
        header: '',
        render: (a) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/${orgSlug}/banking/accounts/${a.id}`)}>
              Statement
            </Button>
            {a.is_active && (
              <Button variant="ghost" size="sm" onClick={() => handleDeactivate(a)} disabled={deleteMutation.isPending}>
                Deactivate
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgSlug],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Your real bank, mobile money, and cash accounts — each with a live balance and a
            drillable, exportable statement.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-2 pb-2">
            <DataTable<BankAccount>
              columns={columns}
              rows={accounts}
              rowKey={(a) => a.id}
              loading={isLoading}
              loadingRows={6}
              error={isError}
              storageKey="treasury-accounts-table"
              emptyText="No accounts yet. Add your first bank, mobile money, or cash account."
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent
          title="Add Account"
          description="Add a real bank, mobile money, or cash account — it gets its own ledger entry so its balance and statement are always accurate."
          onClose={() => setDialogOpen(false)}
        >
          <div className="space-y-4">
            <FormField label="Account Type" required>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {ACCOUNT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = accountType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAccountType(t.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors',
                        active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent/30',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </FormField>

            {accountType === 'bank' && (
              // Only KES is supported today (backend hard-rejects anything else, bank_accounts.go)
              // — hide the currency/country picker so the form doesn't offer options that would
              // just fail on submit.
              <BankAccountForm orgSlug={tenant} value={bankValue} onChange={setBankValue} hideCurrency />
            )}

            {accountType === 'mobile_money' && (
              <>
                <FormField label="Account Name" required description="e.g. 'M-Pesa Till — Westlands Branch'">
                  <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Till / Paybill Number" required>
                  <input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className={inputClass} placeholder="e.g. 174379" />
                </FormField>
              </>
            )}

            {accountType === 'cash' && (
              <FormField label="Account Name" required description="e.g. 'Petty Cash — Head Office'">
                <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} />
              </FormField>
            )}

            <FormField label="Opening Balance (optional)" description="Posted as a real journal entry against Opening Balance Equity.">
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
