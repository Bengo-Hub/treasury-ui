'use client';

/**
 * BankDetailsPicker — the bank-details control on the quotation/invoice form.
 *
 *  - An "Include bank details" toggle. When OFF, the document is issued with NO bank block
 *    (honoured server-side via metadata.exclude_bank_details) — nothing is auto-included.
 *  - When ON, pick an existing business bank account (from the shared tenant bank-account list)
 *    or "+ Add new bank account", which opens the canonical BankAccountForm (with Paystack Verify)
 *    in a modal and saves it to the shared list so it's reusable everywhere afterwards.
 *
 * The selected account is snapshotted into the document metadata by the parent (bank_details), so
 * the issued document keeps the details it was raised with even if the account is later changed.
 */

import { useMemo, useState } from 'react';
import { Landmark, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { BankAccountForm, EMPTY_BANK_ACCOUNT, type BankAccountValue } from '@/components/payments/bank-account-form';
import { useBankAccounts, useCreateBankAccount } from '@/hooks/use-bank-accounts';
import type { BankAccount } from '@/lib/api/bank-accounts';

/** The snapshot the parent stores in document metadata.bank_details. */
export interface BankDetailsSnapshot {
  account_name: string;
  bank_name: string;
  account_number: string;
  bank_branch?: string;
  branch_code?: string;
}

interface BankDetailsPickerProps {
  orgSlug: string;
  /** false = exclude (no bank block on the document). */
  include: boolean;
  onIncludeChange: (include: boolean) => void;
  /** The currently selected bank details snapshot (or null when none picked). */
  value: BankDetailsSnapshot | null;
  onChange: (value: BankDetailsSnapshot | null) => void;
}

function toSnapshot(a: BankAccount): BankDetailsSnapshot {
  return {
    account_name: a.account_name,
    bank_name: a.bank_name,
    account_number: a.account_number,
    bank_branch: a.bank_branch,
    branch_code: a.branch_code,
  };
}

export function BankDetailsPicker({ orgSlug, include, onIncludeChange, value, onChange }: BankDetailsPickerProps) {
  const { data, isLoading } = useBankAccounts(orgSlug);
  const createMutation = useCreateBankAccount(orgSlug);
  const accounts = data?.bank_accounts ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<BankAccountValue>(EMPTY_BANK_ACCOUNT);

  const options = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: `${a.bank_name} · ${a.account_number}`, hint: a.account_name })),
    [accounts],
  );

  // Match the current snapshot back to an account id (by account number) for the combobox value.
  const selectedId = useMemo(() => {
    if (!value) return '';
    return accounts.find((a) => a.account_number === value.account_number)?.id ?? '';
  }, [accounts, value]);

  const onSelect = (id: string) => {
    const acct = accounts.find((a) => a.id === id);
    onChange(acct ? toSnapshot(acct) : null);
  };

  const handleAdd = () => {
    if (!draft.account_name || !draft.bank_name || !draft.account_number) {
      toast.error('Bank, account number, and account name are required');
      return;
    }
    createMutation.mutate(
      {
        account_name: draft.account_name,
        bank_name: draft.bank_name,
        account_number: draft.account_number,
        bank_branch: draft.bank_branch || undefined,
        branch_code: draft.branch_code || undefined,
        currency: draft.currency || undefined,
      },
      {
        onSuccess: (created) => {
          onChange(toSnapshot(created));
          setAddOpen(false);
          setDraft(EMPTY_BANK_ACCOUNT);
          toast.success('Bank account saved');
        },
        onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to save bank account'),
      },
    );
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onIncludeChange(!include)}
        className="flex items-center gap-3 text-left"
      >
        <span className={`relative w-11 h-6 rounded-full transition-colors ${include ? 'bg-primary' : 'bg-accent'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${include ? 'translate-x-5' : ''}`} />
        </span>
        <span>
          <span className="block text-sm font-semibold">Include bank details</span>
          <span className="block text-xs text-muted-foreground">Show a &quot;How to pay&quot; bank block on this document. Off = no bank details are printed.</span>
        </span>
      </button>

      {include && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <Combobox
                  options={options}
                  value={selectedId}
                  onChange={onSelect}
                  placeholder={isLoading ? 'Loading accounts…' : 'Select a bank account'}
                  searchPlaceholder="Search bank accounts…"
                  emptyText="No bank accounts yet — add one"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => { setDraft(EMPTY_BANK_ACCOUNT); setAddOpen(true); }}>
                <Plus className="h-4 w-4" /> Add new
              </Button>
            </div>
            {value && (
              <p className="text-xs text-muted-foreground">
                {value.bank_name} · {value.account_name} · {value.account_number}
                {value.bank_branch ? ` · ${value.bank_branch}` : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent title="Add Bank Account" description="Saved to your reusable bank-account list." onClose={() => setAddOpen(false)}>
          <div className="space-y-4">
            <BankAccountForm orgSlug={orgSlug} value={draft} onChange={setDraft} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Bank Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
