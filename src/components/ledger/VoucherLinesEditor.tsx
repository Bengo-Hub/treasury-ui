'use client';

import { Button } from '@/components/ui/base';
import { InfoTip } from '@/components/ui/info-tip';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { Plus, Trash2 } from 'lucide-react';

export interface VoucherLineState {
  account_id: string;
  amount: string;
  debit: string;
  credit: string;
  description: string;
}

export const emptyVoucherLine = (): VoucherLineState => ({ account_id: '', amount: '', debit: '', credit: '', description: '' });

export const toNumber = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const money = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TIP = {
  accountPayment:
    'What the money was spent on. Pick an expense (for example Salaries and Wages, Repairs and Maintenance) or a balance you are paying off (Accrued Salary Payable after a payroll run, a supplier balance). Cash and bank accounts are not listed here; use a Contra voucher to move money between them.',
  accountReceipt:
    'What the money was received for. Pick an income account, a balance someone is paying back, or Owner Capital for money the owner put in. Cash and bank accounts are not listed here.',
  accountGrid: 'The ledger account this line changes.',
  amountPayment:
    'How much of this payment went to this account. Enter a positive number. The voucher total is credited to the Paid from account for you, so the entry always balances.',
  amountReceipt:
    'How much of this receipt belongs to this account. Enter a positive number. The voucher total is debited to the Received into account for you.',
  debit:
    'Enter an amount here to increase an asset or expense account, or to reduce a liability, equity or income account. Leave Credit empty on the same line.',
  credit:
    'Enter an amount here to increase a liability, equity or income account, or to reduce an asset or expense account (money leaving a bank account is a credit). Leave Debit empty on the same line.',
  memo: 'A short note for this line, shown on the account statement. For example "Casual labour, 3 days" or "CCTV installation, office".',
};

/**
 * Lines of a voucher. "amount" mode (payment and receipt) asks only for account and amount: the
 * balancing cash line is built by the API. "grid" mode (journal, sales, purchase) is a full
 * double entry grid that must balance.
 */
export function VoucherLinesEditor({
  mode,
  kind,
  lines,
  accountOptions,
  cashLabel,
  onChange,
}: {
  mode: 'amount' | 'grid';
  kind: 'payment' | 'receipt' | 'other';
  lines: VoucherLineState[];
  accountOptions: ComboboxOption[];
  /** Name of the cash account the total is booked to (amount mode), for the totals row. */
  cashLabel?: string;
  onChange: (lines: VoucherLineState[]) => void;
}) {
  const minLines = mode === 'amount' ? 1 : 2;
  const update = (i: number, patch: Partial<VoucherLineState>) =>
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => {
    if (lines.length > minLines) onChange(lines.filter((_, idx) => idx !== i));
  };

  const totalAmount = lines.reduce((s, l) => s + toNumber(l.amount), 0);
  const totalDebit = lines.reduce((s, l) => s + toNumber(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + toNumber(l.credit), 0);
  const diff = Math.round((totalDebit - totalCredit) * 100) / 100;

  const accountTip = mode === 'grid' ? TIP.accountGrid : kind === 'receipt' ? TIP.accountReceipt : TIP.accountPayment;
  const amountTip = kind === 'receipt' ? TIP.amountReceipt : TIP.amountPayment;
  const numberInput = 'w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs text-right';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {mode === 'amount' ? (kind === 'receipt' ? 'Received for' : 'Paid for') : 'Lines'}
        </p>
        <Button size="sm" variant="ghost" onClick={() => onChange([...lines, emptyVoucherLine()])} className="gap-1">
          <Plus className="h-3 w-3" /> Add line
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/5">
              <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1">Account <InfoTip text={accountTip} align="left" /></span>
              </th>
              {mode === 'amount' ? (
                <th className="w-36 px-3 py-2 text-right text-xs font-bold text-muted-foreground">
                  <span className="inline-flex items-center gap-1">Amount <InfoTip text={amountTip} align="right" /></span>
                </th>
              ) : (
                <>
                  <th className="w-32 px-3 py-2 text-right text-xs font-bold text-muted-foreground">
                    <span className="inline-flex items-center gap-1">Debit <InfoTip text={TIP.debit} align="right" /></span>
                  </th>
                  <th className="w-32 px-3 py-2 text-right text-xs font-bold text-muted-foreground">
                    <span className="inline-flex items-center gap-1">Credit <InfoTip text={TIP.credit} align="right" /></span>
                  </th>
                </>
              )}
              <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1">Memo <InfoTip text={TIP.memo} align="right" /></span>
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="min-w-52 px-3 py-2">
                  <SearchableCombobox
                    options={accountOptions}
                    value={line.account_id}
                    onChange={(v) => update(i, { account_id: v })}
                    placeholder="Select account"
                    searchPlaceholder="Search by code or name"
                    emptyText="No matching account"
                    clearable
                  />
                </td>
                {mode === 'amount' ? (
                  <td className="px-3 py-2">
                    <input
                      type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00"
                      aria-label="Amount" value={line.amount}
                      onChange={(e) => update(i, { amount: e.target.value })}
                      className={numberInput}
                    />
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-2">
                      <input
                        type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00"
                        aria-label="Debit" value={line.debit}
                        // A line is either a debit or a credit: typing one clears the other.
                        onChange={(e) => update(i, { debit: e.target.value, credit: e.target.value ? '' : line.credit })}
                        className={numberInput}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00"
                        aria-label="Credit" value={line.credit}
                        onChange={(e) => update(i, { credit: e.target.value, debit: e.target.value ? '' : line.debit })}
                        className={numberInput}
                      />
                    </td>
                  </>
                )}
                <td className="px-3 py-2">
                  <input
                    type="text" placeholder="Memo" aria-label="Memo" value={line.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs"
                  />
                </td>
                <td className="px-1 py-2">
                  <button
                    type="button" aria-label="Remove line" onClick={() => remove(i)} disabled={lines.length <= minLines}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {mode === 'amount' ? (
              <tr className="bg-accent/10 font-bold">
                <td className="px-3 py-2 text-xs uppercase">Total</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{money(totalAmount)}</td>
                <td colSpan={2} className="px-3 py-2 text-xs font-normal text-muted-foreground">
                  {totalAmount > 0 && (kind === 'receipt'
                    ? `Debited to ${cashLabel || 'the account it was received into'}`
                    : `Credited to ${cashLabel || 'the account it was paid from'}`)}
                </td>
              </tr>
            ) : (
              <tr className="bg-accent/10 font-bold">
                <td className="px-3 py-2 text-xs uppercase">Total</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{money(totalDebit)}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{money(totalCredit)}</td>
                <td colSpan={2} className="px-3 py-2 text-xs">
                  {totalDebit > 0 && diff === 0 ? (
                    <span className="text-green-600">Balanced</span>
                  ) : totalDebit > 0 || totalCredit > 0 ? (
                    <span className="text-destructive">Difference {money(Math.abs(diff))}</span>
                  ) : null}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}
