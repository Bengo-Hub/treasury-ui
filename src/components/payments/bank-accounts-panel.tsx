'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { BankAccountForm, EMPTY_BANK_ACCOUNT, type BankAccountValue } from '@/components/payments/bank-account-form';
import { SUPPORTED_CURRENCIES, CURRENCY_META, PAYMENT_METHOD_LABELS } from '@bengo-hub/shared-ui-lib/payments';
import { MultiSelectCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { INVOICE_TYPE_OPTIONS } from '@/lib/api/invoice-types';
import {
  useBankAccounts,
  useCreateBankAccount,
  useDeleteBankAccount,
  useLinkAccountLedger,
  useUpdateBankAccount,
} from '@/hooks/use-bank-accounts';
import type { AccountType, BankAccount, BankAccountRequest } from '@/lib/api/bank-accounts';
import { money } from '@/components/charts/chart-theme';
import { cn } from '@/lib/utils';
import { useMe } from '@/hooks/useMe';
import { Banknote, FileText, Landmark, Loader2, Pencil, Plus, RotateCcw, Smartphone, Tag, Wallet } from 'lucide-react';
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

// Every real payment method the platform actually handles in live transactions — the same
// registry every transaction list/receipt/export reads from (@bengo-hub/shared-ui-lib/payments),
// reused here instead of asking the user to type and hope they match the right value.
const PAYMENT_METHOD_OPTIONS: ComboboxOption[] = Object.entries(PAYMENT_METHOD_LABELS).map(
  ([value, label]) => ({ value, label }),
);

interface BankAccountsPanelProps {
  /** Tenant ID/slug to scope the accounts to (platform Gateways & Secrets passes the platform
   *  owner's own tenant; tenant Settings passes the current tenant). */
  tenant: string;
  /** Used only to build the "Statement" link to the full drillable /banking/accounts/[id] page —
   *  a statement is never rendered inline here, just linked to. */
  orgSlug: string;
  /** Hide the create dialog's launcher (read-only embed) — defaults to shown. */
  allowCreate?: boolean;
}

/**
 * The tenant's real, ledger-linked money-holding accounts (bank/mobile-money/cash/gateway) — list
 * + create, with a live GL-derived balance and a link to each account's drillable statement. This
 * is the ONE accounts list+create UI in the app: the dedicated `/banking/accounts` page and this
 * embed (used on the tenant Settings and platform Gateways & Secrets pages) both render this same
 * component so creating an account from any of the three places hits the identical `POST
 * /bank-accounts` endpoint and the identical `bank_accounts` table — no duplicate create logic.
 */
export function BankAccountsPanel({ tenant, orgSlug, allowCreate = true }: BankAccountsPanelProps) {
  const router = useRouter();

  const { data, isLoading, isError } = useBankAccounts(tenant);
  const { data: me } = useMe();
  const createMutation = useCreateBankAccount(tenant);
  const deleteMutation = useDeleteBankAccount(tenant);
  const linkLedgerMutation = useLinkAccountLedger(tenant);
  const updateMutation = useUpdateBankAccount(tenant);

  const accounts = data?.bank_accounts ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [bankValue, setBankValue] = useState<BankAccountValue>(EMPTY_BANK_ACCOUNT);
  const [accountName, setAccountName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  // Only used for mobile_money/cash — the bank type's own currency lives on bankValue.currency
  // (BankAccountForm's own picker) since a bank account is picked together with its country.
  const [currency, setCurrency] = useState('KES');

  const [methodsAccount, setMethodsAccount] = useState<BankAccount | null>(null);
  const [methodsValues, setMethodsValues] = useState<string[]>([]);

  function openMethodsDialog(account: BankAccount) {
    setMethodsAccount(account);
    setMethodsValues(account.default_payment_methods ?? []);
  }

  function handleSaveMethods() {
    if (!methodsAccount) return;
    updateMutation.mutate(
      { id: methodsAccount.id, data: { account_name: methodsAccount.account_name, default_payment_methods: methodsValues } },
      {
        onSuccess: () => {
          toast.success('Payment methods updated');
          setMethodsAccount(null);
        },
        onError: () => toast.error('Failed to update payment methods'),
      },
    );
  }

  // Mirrors the Payment Methods dialog above, one level up the document lifecycle: which invoice
  // TYPE (e.g. "subscription") a newly created invoice should settle into and print bank details
  // for by default, instead of every payment_method this account happens to collect.
  const [invoiceTypesAccount, setInvoiceTypesAccount] = useState<BankAccount | null>(null);
  const [invoiceTypesValues, setInvoiceTypesValues] = useState<string[]>([]);

  function openInvoiceTypesDialog(account: BankAccount) {
    setInvoiceTypesAccount(account);
    setInvoiceTypesValues(account.default_invoice_types ?? []);
  }

  function handleSaveInvoiceTypes() {
    if (!invoiceTypesAccount) return;
    updateMutation.mutate(
      { id: invoiceTypesAccount.id, data: { account_name: invoiceTypesAccount.account_name, default_invoice_types: invoiceTypesValues } },
      {
        onSuccess: () => {
          toast.success('Invoice types updated');
          setInvoiceTypesAccount(null);
        },
        onError: () => toast.error('Failed to update invoice types'),
      },
    );
  }

  // Full edit — account_name/bank_name/account_number/bank_branch/branch_code, the fields the
  // backend's PUT /bank-accounts/{id} already unconditionally supports. account_type and currency
  // are deliberately excluded: account_type's GL leaf code prefix is derived from it at creation
  // (changing it would misclassify every already-posted transaction), and currency has no Update
  // wiring at all server-side (by design — a live account's exchange-rate-stamped journal history
  // would corrupt if its native currency changed after the fact).
  interface EditFormState {
    account_name: string;
    bank_name: string;
    account_number: string;
    bank_branch: string;
    bank_code: string;
    branch_code: string;
    local_branch_code: string;
  }
  const EMPTY_EDIT: EditFormState = {
    account_name: '', bank_name: '', account_number: '', bank_branch: '',
    bank_code: '', branch_code: '', local_branch_code: '',
  };
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT);

  function openEditDialog(account: BankAccount) {
    setEditAccount(account);
    setEditForm({
      account_name: account.account_name,
      bank_name: account.bank_name ?? '',
      account_number: account.account_number ?? '',
      bank_branch: account.bank_branch ?? '',
      bank_code: account.bank_code ?? '',
      branch_code: account.branch_code ?? '',
      local_branch_code: account.local_branch_code ?? '',
    });
  }

  function handleSaveEdit() {
    if (!editAccount) return;
    if (!editForm.account_name.trim()) {
      toast.error('Account name is required');
      return;
    }
    updateMutation.mutate(
      {
        id: editAccount.id,
        data: {
          account_name: editForm.account_name.trim(),
          bank_name: editForm.bank_name.trim() || undefined,
          account_number: editForm.account_number.trim() || undefined,
          bank_branch: editForm.bank_branch,
          bank_code: editForm.bank_code,
          branch_code: editForm.branch_code,
          local_branch_code: editForm.local_branch_code,
        },
      },
      {
        onSuccess: () => {
          toast.success('Account updated');
          setEditAccount(null);
        },
        onError: () => toast.error('Failed to update account'),
      },
    );
  }

  function handleReactivate(account: BankAccount) {
    updateMutation.mutate(
      { id: account.id, data: { account_name: account.account_name, is_active: true } },
      {
        onSuccess: () => toast.success('Account reactivated'),
        onError: () => toast.error('Failed to reactivate account'),
      },
    );
  }

  function resetForm() {
    setAccountType('bank');
    setBankValue(EMPTY_BANK_ACCOUNT);
    setAccountName('');
    setMobileNumber('');
    setOpeningBalance('');
    setCurrency('KES');
  }

  function handleCreate() {
    const payload: BankAccountRequest = {
      account_type: accountType,
      account_name:
        accountType === 'bank' ? bankValue.account_name : accountName,
      // A real per-account native currency (e.g. a genuine KCB USD account) — the backend now
      // accepts any currency its forex module can quote, and converts opening-balance/transfer
      // postings against the tenant's other (typically KES) accounts automatically.
      currency: accountType === 'bank' ? bankValue.currency : currency,
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
      payload.bank_code = bankValue.bank_code || undefined;
      payload.branch_code = bankValue.branch_code || undefined;
      payload.local_branch_code = bankValue.local_branch_code || undefined;
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
      // The backend requires a custodian for a cash account (who's accountable for the drawer)
      // — this form has no staff picker, so default to whoever is creating it. Previously this
      // was omitted entirely, so every cash-account create failed backend validation
      // ("custodian_user_id is required for a cash account") with no field to fix it from here.
      if (me?.id) payload.custodian_user_id = me.id;
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
      onError: (err: unknown) =>
        toast.error(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Failed to deactivate — it may still have a balance',
        ),
    });
  }

  function handleLinkLedger(account: BankAccount) {
    linkLedgerMutation.mutate(account.id, {
      onSuccess: () => toast.success('Account linked to the ledger'),
      onError: () => toast.error('Failed to link this account to the ledger'),
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
        render: (a) =>
          a.ledger_account_id ? (
            <span className="font-semibold">{money(parseFloat(a.balance || '0'))}</span>
          ) : (
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
              disabled={linkLedgerMutation.isPending}
              onClick={() => handleLinkLedger(a)}
              title="This account predates ledger-linking — link it now to see its balance and statement"
            >
              Not linked — link now
            </button>
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => openEditDialog(a)}
              title="Edit account name, bank name, account number, branch, or SWIFT/branch code"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => openMethodsDialog(a)}
              title="Which payment methods (paystack, mpesa, card...) automatically post to this account"
            >
              <Tag className="h-3.5 w-3.5" />
              Payment Methods
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => openInvoiceTypesDialog(a)}
              title="Which invoice types (subscription, etc.) default to this account for settlement and printed bank details"
            >
              <FileText className="h-3.5 w-3.5" />
              Invoice Types
            </Button>
            {a.is_active ? (
              <Button variant="ghost" size="sm" onClick={() => handleDeactivate(a)} disabled={deleteMutation.isPending}>
                Deactivate
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => handleReactivate(a)}
                disabled={updateMutation.isPending}
                title="Reactivate this account"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reactivate
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
    <div className="space-y-4">
      {allowCreate && (
        <div className="flex justify-end">
          <Button className="gap-2" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>
      )}

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
          className="max-w-2xl"
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
              // A real per-account native currency — e.g. picking USD here creates a genuine
              // foreign-currency account (opening balance and future settlements convert against
              // the tenant's other accounts automatically; see docs/general-ledger.md).
              <BankAccountForm orgSlug={tenant} value={bankValue} onChange={setBankValue} />
            )}

            {accountType === 'mobile_money' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Account Name" required description="e.g. 'M-Pesa Till — Westlands Branch'">
                  <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Till / Paybill Number" required>
                  <input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className={inputClass} placeholder="e.g. 174379" />
                </FormField>
                <FormField label="Currency">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c} — {CURRENCY_META[c]?.name ?? c}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            )}

            {accountType === 'cash' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Account Name" required description="e.g. 'Petty Cash — Head Office'">
                  <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Currency">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c} — {CURRENCY_META[c]?.name ?? c}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            )}

            <FormField label="Opening Balance (optional)" description="Posted as a real journal entry against Opening Balance Equity.">
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className={inputClass + ' sm:max-w-xs'}
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

      <Dialog open={!!editAccount} onOpenChange={(o) => { if (!o) setEditAccount(null); }}>
        <DialogContent
          title="Edit Account"
          description={`Update "${editAccount?.account_name ?? ''}"'s details. Account type and currency can't be changed after creation — they're tied to this account's real GL leaf and its transaction history.`}
          onClose={() => setEditAccount(null)}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <FormField label="Account Name" required>
              <input
                value={editForm.account_name}
                onChange={(e) => setEditForm((p) => ({ ...p, account_name: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            {editAccount?.account_type === 'bank' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Bank Name">
                  <input
                    value={editForm.bank_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, bank_name: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Account Number">
                  <input
                    value={editForm.account_number}
                    onChange={(e) => setEditForm((p) => ({ ...p, account_number: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
              </div>
            )}
            {editAccount?.account_type !== 'cash' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Branch" description="e.g. 'Kisumu'">
                  <input
                    value={editForm.bank_branch}
                    onChange={(e) => setEditForm((p) => ({ ...p, bank_branch: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="SWIFT / BIC Code" description="Often branch-specific, e.g. 'KCBLKENX077'">
                  <input
                    value={editForm.branch_code}
                    onChange={(e) => setEditForm((p) => ({ ...p, branch_code: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
              </div>
            )}
            {editAccount?.account_type !== 'cash' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Bank Code" description="National bank code, e.g. '01' for KCB">
                  <input
                    value={editForm.bank_code}
                    onChange={(e) => setEditForm((p) => ({ ...p, bank_code: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Local Branch Code" description="Domestic sort code, e.g. '303' — distinct from SWIFT">
                  <input
                    value={editForm.local_branch_code}
                    onChange={(e) => setEditForm((p) => ({ ...p, local_branch_code: e.target.value }))}
                    className={inputClass}
                  />
                </FormField>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditAccount(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending || !editForm.account_name.trim()}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!methodsAccount} onOpenChange={(o) => { if (!o) setMethodsAccount(null); }}>
        <DialogContent
          title="Payment Methods"
          description={`Pick every payment method that should post to "${methodsAccount?.account_name ?? ''}" automatically, whenever a payment doesn't say which account to use.`}
          onClose={() => setMethodsAccount(null)}
        >
          <div className="space-y-4">
            <FormField
              label="Payment methods"
              description="Selecting none leaves the current list unchanged — the backend doesn't support clearing it yet."
            >
              <MultiSelectCombobox
                options={PAYMENT_METHOD_OPTIONS}
                values={methodsValues}
                onChange={setMethodsValues}
                placeholder="Select payment methods…"
                searchPlaceholder="Search payment methods…"
              />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setMethodsAccount(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveMethods} disabled={updateMutation.isPending || methodsValues.length === 0}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!invoiceTypesAccount} onOpenChange={(o) => { if (!o) setInvoiceTypesAccount(null); }}>
        <DialogContent
          title="Invoice Types"
          description={`Pick every invoice type that should default to "${invoiceTypesAccount?.account_name ?? ''}" for settlement and printed bank details, whenever a new invoice of that type doesn't say which account to use.`}
          onClose={() => setInvoiceTypesAccount(null)}
        >
          <div className="space-y-4">
            <FormField
              label="Invoice types"
              description="Selecting none leaves the current list unchanged — the backend doesn't support clearing it yet."
            >
              <MultiSelectCombobox
                options={INVOICE_TYPE_OPTIONS}
                values={invoiceTypesValues}
                onChange={setInvoiceTypesValues}
                placeholder="Select invoice types…"
                searchPlaceholder="Search invoice types…"
              />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setInvoiceTypesAccount(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveInvoiceTypes} disabled={updateMutation.isPending || invoiceTypesValues.length === 0}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
