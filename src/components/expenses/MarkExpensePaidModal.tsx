'use client';

import { Button } from '@/components/ui/base';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useAccounts } from '@/hooks/use-accounts';
import type { Expense } from '@/lib/api/expenses';
import { formatCurrency } from '@/lib/utils/currency';
import { useMemo, useState } from 'react';

interface Props {
  tenant: string;
  expense: Expense;
  onClose: () => void;
  /** Fired with the chosen cash/bank account id (empty string = use tenant default). */
  onConfirm: (paidFromAccountId: string) => void;
  pending?: boolean;
}

// MarkExpensePaidModal settles a direct business expense (e.g. the business bought charcoal and
// paid from M-Pesa/cash/bank). It records which cash/bank account the money left, which the backend
// posts as DR Accounts Payable / CR that account. No gateway involved — that's the "Pay via gateway"
// path. Paid-from options are the tenant's asset (1xxx) accounts.
export function MarkExpensePaidModal({ tenant, expense, onClose, onConfirm, pending }: Props) {
  const { data: accountsData } = useAccounts(tenant);
  const options = useMemo<ComboboxOption[]>(
    () =>
      (accountsData?.accounts ?? [])
        .filter((a) => a.account_type === 'asset' && a.is_active !== false)
        .map((a) => ({ value: a.id, label: a.account_name, hint: a.account_code })),
    [accountsData],
  );
  // Default to the Cash account (code 1000) when present, else leave empty (backend default).
  const defaultAccount = useMemo(
    () => (accountsData?.accounts ?? []).find((a) => a.account_code === '1000')?.id ?? '',
    [accountsData],
  );
  const [accountId, setAccountId] = useState<string>('');
  const effective = accountId || defaultAccount;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-foreground">Mark paid</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {expense.expense_number} · {formatCurrency(Number(expense.total_amount), expense.currency)}
            </p>
          </div>

          <FormField label="Paid from account" description="The cash / bank account the money left. Posts the Accounts Payable settlement.">
            <Combobox
              options={options}
              value={effective}
              onChange={(v) => setAccountId(v ?? '')}
              placeholder={options.length ? 'Select cash / bank account' : 'No cash/bank accounts — tenant default will be used'}
              searchPlaceholder="Search accounts…"
              emptyText="No matching accounts"
              clearable
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onConfirm(effective)} disabled={pending}>
              {pending ? 'Posting…' : 'Mark paid'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
