'use client';

import { Button } from '@/components/ui/base';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import type { Expense } from '@/lib/api/expenses';
import { formatCurrency } from '@/lib/utils/currency';
import { nowDatetimeLocal, datetimeLocalToISO } from '@bengo-hub/shared-ui-lib/payments';
import { useMemo, useState } from 'react';

interface Props {
  tenant: string;
  expense: Expense;
  onClose: () => void;
  /** Fired with the chosen cash/bank account id (empty string = use tenant default) and the
   *  payment's effective ISO date/time. */
  onConfirm: (paidFromAccountId: string, paidAt?: string) => void;
  pending?: boolean;
}

// MarkExpensePaidModal settles a direct business expense (e.g. the business bought charcoal and
// paid from M-Pesa/cash/bank). It records which REAL cash/bank/mobile-money account the money
// left, which the backend posts as DR Accounts Payable / CR that account's own dedicated ledger
// leaf (ledger.ResolveCashCode) — sourced from the real bank_accounts table, not the chart of
// accounts, so the payment shows up on that specific account's own GL statement/reconciliation
// (matching PayBillDialog/RecordPaymentModal/ReceivePaymentModal's already-fixed pattern; this
// modal previously sent a raw ChartOfAccount id, which the backend also accepted literally as
// such — internally consistent, but meant a payment "from" a real bank account never posted
// against that account's own leaf).
export function MarkExpensePaidModal({ tenant, expense, onClose, onConfirm, pending }: Props) {
  const { data: bankAccountsData } = useBankAccounts(tenant);
  const options = useMemo<ComboboxOption[]>(
    () =>
      (bankAccountsData?.bank_accounts ?? [])
        .filter((a) => a.is_active !== false)
        .map((a) => ({ value: a.id, label: a.account_name, hint: a.bank_name || a.account_number })),
    [bankAccountsData],
  );
  // Default to a cash-type account when present, else leave empty (backend default).
  const defaultAccount = useMemo(
    () => (bankAccountsData?.bank_accounts ?? []).find((a) => a.account_type === 'cash' && a.is_active !== false)?.id ?? '',
    [bankAccountsData],
  );
  const [accountId, setAccountId] = useState<string>('');
  const [paidAtLocal, setPaidAtLocal] = useState(nowDatetimeLocal());
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

          <FormField label="Paid from account" required description="The cash / bank account the money left. Posts the Accounts Payable settlement.">
            <Combobox
              options={options}
              value={effective}
              onChange={(v) => setAccountId(v ?? '')}
              placeholder={options.length ? 'Select cash / bank account' : 'No cash/bank accounts yet — create one first'}
              searchPlaceholder="Search accounts…"
              emptyText="No matching accounts"
            />
          </FormField>

          <FormField label="Payment date & time">
            <input
              type="datetime-local"
              value={paidAtLocal}
              max={nowDatetimeLocal()}
              onChange={(e) => setPaidAtLocal(e.target.value)}
              className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onConfirm(effective, datetimeLocalToISO(paidAtLocal))} disabled={pending || !effective}>
              {pending ? 'Posting…' : 'Mark paid'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
