'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { InfoTip } from '@/components/ui/info-tip';
import { useAccounts } from '@/hooks/use-accounts';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { useCreateVoucher } from '@/hooks/use-ledger';
import { usePaidFromAccounts } from '@/hooks/use-paid-from-accounts';
import type { CreateVoucherRequest, VoucherType } from '@/lib/api/ledger';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { emptyPayee, PayeePicker, type PayeeSource, type PayeeValue } from './PayeePicker';
import { isCashVoucher, PAYMENT_METHODS, VOUCHER_HINT, VOUCHER_LABEL, VOUCHER_TYPES } from './voucher-types';
import { emptyVoucherLine, toNumber, VoucherLinesEditor, type VoucherLineState } from './VoucherLinesEditor';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// The voucher-level party. Payment and receipt vouchers name the payee on each line instead, so
// one voucher can pay several people (five casual workers and a supplier).
const PAYEE_LABEL: Partial<Record<VoucherType, string>> = {
  sales: 'Customer',
  purchase: 'Supplier',
};

const DEFAULT_PAYEE_SOURCE: Partial<Record<VoucherType, PayeeSource>> = {
  payment: 'supplier',
  receipt: 'customer',
  sales: 'customer',
  purchase: 'supplier',
};

const linesFor = (t: VoucherType): VoucherLineState[] => {
  const source = DEFAULT_PAYEE_SOURCE[t] ?? 'other';
  return isCashVoucher(t) ? [emptyVoucherLine(source)] : [emptyVoucherLine(source), emptyVoucherLine(source)];
};

/** A line's payee as the API takes it: the name, and the link when it was picked from a list. */
const linePayee = (p: VoucherLineState['payee']) => {
  const name = p.name.trim();
  if (!name) return {};
  return p.id && p.source !== 'other' ? { payee: name, payee_id: p.id, payee_type: p.source } : { payee: name };
};

/**
 * The voucher book's entry form. Payment and receipt vouchers ask for the cash, bank or M-Pesa
 * account once and, per line, the account the money was for and who it was paid to (so one
 * voucher can pay several casual workers and a supplier); the API adds the balancing cash line,
 * so they always balance. Contra moves money between two of the business's accounts. Journal, sales and
 * purchase vouchers use a debit and credit grid that must balance. Every pick from existing data
 * (accounts, cash accounts, payee) is a searchable combobox.
 */
export function VoucherDialog({
  open,
  onOpenChange,
  tenantSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}) {
  const create = useCreateVoucher();
  const [type, setType] = useState<VoucherType>('payment');
  const [date, setDate] = useState(todayLocal());
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [payee, setPayee] = useState<PayeeValue>(emptyPayee('supplier'));
  const [cashAccountId, setCashAccountId] = useState('');
  const [toCashAccountId, setToCashAccountId] = useState('');
  const [contraAmount, setContraAmount] = useState('');
  const [lines, setLines] = useState<VoucherLineState[]>(linesFor('payment'));

  const { data: accountsData } = useAccounts(open ? tenantSlug : '');
  const { data: bankData } = useBankAccounts(open ? tenantSlug : '');
  const { options: cashOptions, defaultAccountId } = usePaidFromAccounts(open ? tenantSlug : '');
  const effectiveCash = cashAccountId || (isCashVoucher(type) || type === 'contra' ? defaultAccountId : '');

  // Ledger leaves that belong to a real cash, bank or M-Pesa account. Payment and receipt lines
  // leave them out (moving money between them is a contra voucher), as Tally and Zoho do.
  const cashLeafIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of bankData?.bank_accounts ?? []) if (b.ledger_account_id) ids.add(b.ledger_account_id);
    for (const a of accountsData?.accounts ?? []) if (a.metadata?.financial_account_id) ids.add(a.id);
    return ids;
  }, [bankData, accountsData]);

  const accountOptions = useMemo<ComboboxOption[]>(() => {
    const hideCash = isCashVoucher(type);
    return (accountsData?.accounts ?? [])
      .filter((a) => a.is_active !== false && !(hideCash && cashLeafIds.has(a.id)))
      .map((a) => ({ value: a.id, label: `${a.account_code} - ${a.account_name}`, hint: a.account_type }));
  }, [accountsData, cashLeafIds, type]);

  const cashLabel = cashOptions.find((o) => o.value === effectiveCash)?.label;

  function changeType(t: VoucherType) {
    setType(t);
    setLines(linesFor(t));
    setPayee(emptyPayee(DEFAULT_PAYEE_SOURCE[t] ?? 'other'));
    setToCashAccountId('');
    setContraAmount('');
  }

  function reset() {
    changeType('payment');
    setDate(todayLocal());
    setReference('');
    setDescription('');
    setPaymentMethod('');
    setCashAccountId('');
  }

  /** Builds the request, or returns the first problem to show the user. */
  function build(submit: boolean): CreateVoucherRequest | string {
    if (!date) return 'Enter the voucher date.';
    const req: CreateVoucherRequest = {
      voucher_type: type,
      voucher_date: date,
      reference: reference.trim() || undefined,
      description: description.trim() || undefined,
      payment_method: paymentMethod || undefined,
      submit,
    };
    if (PAYEE_LABEL[type] && payee.name.trim()) {
      req.payee = payee.name.trim();
      if (payee.id && payee.source !== 'other') {
        req.payee_id = payee.id;
        req.payee_type = payee.source;
      }
    }
    if (type === 'contra') {
      if (!effectiveCash || !toCashAccountId) return 'Choose the account the money left and the account it went to.';
      if (effectiveCash === toCashAccountId) return 'Choose two different accounts.';
      const amt = toNumber(contraAmount);
      if (amt <= 0) return 'Enter the amount moved.';
      return { ...req, cash_account_id: effectiveCash, to_cash_account_id: toCashAccountId, amount: amt };
    }
    const used = lines.filter((l) => l.account_id || l.amount || l.debit || l.credit || l.description.trim() || l.payee.name.trim());
    if (isCashVoucher(type)) {
      if (!effectiveCash) return type === 'payment' ? 'Choose the account the money was paid from.' : 'Choose the account the money was received into.';
      if (used.length === 0) return 'Add at least one line.';
      for (const l of used) {
        if (!l.account_id) return 'Every line needs an account.';
        if (toNumber(l.amount) <= 0) return 'Every line needs an amount above zero.';
      }
      return {
        ...req,
        cash_account_id: effectiveCash,
        lines: used.map((l) => ({
          account_id: l.account_id, amount: toNumber(l.amount), description: l.description.trim() || undefined, ...linePayee(l.payee),
        })),
      };
    }
    if (used.length < 2) return 'A voucher needs at least two lines.';
    let debit = 0;
    let credit = 0;
    for (const l of used) {
      const d = toNumber(l.debit);
      const c = toNumber(l.credit);
      if (!l.account_id) return 'Every line needs an account.';
      if ((d > 0) === (c > 0)) return 'Each line needs either a debit or a credit amount.';
      debit += d;
      credit += c;
    }
    if (Math.round((debit - credit) * 100) !== 0) return 'Debits must equal credits.';
    return {
      ...req,
      lines: used.map((l) => ({
        account_id: l.account_id,
        debit_amount: toNumber(l.debit) || undefined,
        credit_amount: toNumber(l.credit) || undefined,
        description: l.description.trim() || undefined,
      })),
    };
  }

  function save(submit: boolean) {
    const built = build(submit);
    if (typeof built === 'string') {
      toast.error(built);
      return;
    }
    create.mutate(
      { tenantSlug, data: built },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      },
    );
  }

  const input = 'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm';
  const cashTip =
    type === 'receipt'
      ? 'The cash, bank or M-Pesa account the money came into. It is debited with the voucher total.'
      : 'The cash, bank or M-Pesa account the money left. It is credited with the voucher total.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="New Voucher"
        description="Record money paid, received or moved. Saved vouchers follow the approval rules before they are posted."
        onClose={() => onOpenChange(false)}
        className="max-w-6xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Voucher type" required>
              <select value={type} onChange={(e) => changeType(e.target.value as VoucherType)} className={input}>
                {VOUCHER_TYPES.map((t) => (
                  <option key={t} value={t}>{VOUCHER_LABEL[t]}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Voucher date" required>
              <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} className={input} />
            </FormField>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{VOUCHER_HINT[type]}</p>

          {(isCashVoucher(type) || type === 'contra') && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 text-sm font-medium">
                  {type === 'receipt' ? 'Received into' : type === 'contra' ? 'From account' : 'Paid from'} <span className="text-destructive">*</span>
                  <InfoTip align="left" text={type === 'contra' ? 'The account the money left. It is credited.' : cashTip} />
                </span>
                <SearchableCombobox
                  options={cashOptions}
                  value={effectiveCash}
                  onChange={(v) => setCashAccountId(v)}
                  placeholder={cashOptions.length ? 'Select cash, bank or M-Pesa account' : 'No accounts yet. Add one under Accounts.'}
                  searchPlaceholder="Search accounts"
                  emptyText="No matching account"
                />
              </div>
              {type === 'contra' ? (
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 text-sm font-medium">
                    To account <span className="text-destructive">*</span>
                    <InfoTip align="right" text="The account the money went into. It is debited." />
                  </span>
                  <SearchableCombobox
                    options={cashOptions.filter((o) => o.value !== effectiveCash)}
                    value={toCashAccountId}
                    onChange={(v) => setToCashAccountId(v)}
                    placeholder="Select cash, bank or M-Pesa account"
                    searchPlaceholder="Search accounts"
                    emptyText="No matching account"
                  />
                </div>
              ) : (
                <FormField label="Payment method">
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={input}>
                    <option value="">Not specified</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>
          )}

          {PAYEE_LABEL[type] && (
            <PayeePicker tenant={tenantSlug} label={PAYEE_LABEL[type]!} value={payee} onChange={setPayee} />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1 text-sm font-medium">
                Reference
                <InfoTip align="left" text="The outside document number: cheque number, M-Pesa or bank reference, or the supplier's receipt number. The voucher number (PV-000123) is given automatically." />
              </span>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. QWE12RT45Y or cheque 004512" className={input} />
            </div>
            <FormField label="Narration">
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this voucher is for" className={input} />
            </FormField>
          </div>

          {type === 'contra' ? (
            <div className="max-w-xs space-y-1.5">
              <span className="inline-flex items-center gap-1 text-sm font-medium">
                Amount <span className="text-destructive">*</span>
                <InfoTip align="left" text="How much moved from the first account to the second." />
              </span>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={contraAmount} onChange={(e) => setContraAmount(e.target.value)} placeholder="0.00" className={`${input} text-right`} />
            </div>
          ) : (
            <VoucherLinesEditor
              mode={isCashVoucher(type) ? 'amount' : 'grid'}
              kind={type === 'payment' ? 'payment' : type === 'receipt' ? 'receipt' : 'other'}
              lines={lines}
              accountOptions={accountOptions}
              cashLabel={cashLabel}
              tenant={isCashVoucher(type) ? tenantSlug : undefined}
              onChange={setLines}
            />
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => save(false)} disabled={create.isPending}>
              Save as draft
            </Button>
            <Button onClick={() => save(true)} disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save and submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
