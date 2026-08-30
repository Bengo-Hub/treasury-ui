'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SettlementModal, RECEIVE_METHODS, resolveDefaultAccount } from '@bengo-hub/shared-ui-lib/payments';
import { useRecordCustomerPayment } from '@/hooks/use-invoices';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { bankAccountHint } from '@/lib/api/bank-accounts';
import { useSupportedCurrencies } from '@/hooks/use-currencies';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import type { CustomerBalance } from '@/lib/api/invoices';

interface ReceivePaymentModalProps {
  tenant: string;
  target: CustomerBalance;
  onClose: () => void;
}

/**
 * Receive a customer's AR repayment (POST /ar/customers/{contactID}/payment via
 * useRecordCustomerPayment) — a thin wrapper over the shared SettlementModal
 * (@bengo-hub/shared-ui-lib/payments), which owns the amount/method/reference form and the
 * canonical RECEIVE_METHODS list shared with pos-ui's credit-sale settlement. Reused by
 * ClientsManager.
 *
 * The account picker is injected via SettlementModal's own `extraFields` slot (state kept
 * locally here, merged into the mutate call) rather than a shared-ui-lib change — this manual
 * "Receive Payment" action is the ONLY caller of this component; the same backend endpoint's
 * pos-api S2S till-settlement caller (a completely different code path, not this component)
 * remains account-optional, so the picker only needs to exist on this side of that split.
 */
export function ReceivePaymentModal({ tenant, target, onClose }: ReceivePaymentModalProps) {
  const recordPay = useRecordCustomerPayment(tenant);
  const contactId = target.crm_contact_id || target.customer_identifier || target.id;

  // Sourced from the real bank_accounts table — RecordARPayment's account_id resolves as a
  // financial-account lookup (ledger.ResolveCashCode), which needs a BankAccount ID, not a
  // ChartOfAccount one. Previously sourced ChartOfAccount rows here, so this picker's selection
  // was silently ignored (fell through to a fallback account) on every submission.
  const { data: bankAccountsData } = useBankAccounts(tenant);
  const accountOptions = useMemo<ComboboxOption[]>(
    () =>
      (bankAccountsData?.bank_accounts ?? [])
        .filter((a) => a.is_active !== false)
        .map((a) => ({ value: a.id, label: a.account_name, hint: bankAccountHint(a) })),
    [bankAccountsData],
  );
  const [accountId, setAccountId] = useState('');
  const [accountTouched, setAccountTouched] = useState(false);
  // Preload from the tenant's own BankAccount.default_payment_methods mapping for whichever
  // method SettlementModal shows selected by default (its own initial state is always
  // methods[0], i.e. RECEIVE_METHODS[0] = cash) — still fully editable via the picker below, and
  // never re-applied once the user has touched it. Doesn't react to a later in-modal method
  // change, since SettlementModal's internal method selection isn't exposed to this parent.
  useEffect(() => {
    if (accountTouched || accountId || !bankAccountsData?.bank_accounts?.length) return;
    const def = resolveDefaultAccount(bankAccountsData.bank_accounts, RECEIVE_METHODS[0]?.value);
    if (def) setAccountId(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccountsData]);

  // Optional — for a payment actually received in a different currency (e.g. Uganda MTN Mobile
  // Money against a KES AR ledger). Recorded structurally (exchange_rate/base_amount on the
  // ledger line) instead of the Reference field being used to note the conversion math by hand —
  // confirmed live: a tenant typed "1850000/29.2" (UGX amount / rate) into Reference because
  // there was nowhere else to put it, leaving the customer's statement with no real transaction
  // ID to cross-check against their own MTN SMS.
  const { data: currenciesData } = useSupportedCurrencies();
  const foreignCurrencyOptions = (currenciesData?.currencies ?? []).filter((c) => c.code !== target.currency);
  const [foreignCurrency, setForeignCurrency] = useState('');
  const [foreignAmount, setForeignAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');

  return (
    <SettlementModal
      open
      mode="receive"
      title="Receive payment"
      subjectName={target.customer_name || target.customer_identifier || 'Customer'}
      amountLabel="Balance due"
      amountValue={parseFloat(target.outstanding_debit) || 0}
      defaultAmount={parseFloat(target.outstanding_debit) || 0}
      allowOverpayment
      currency={target.currency}
      methods={RECEIVE_METHODS}
      isPending={recordPay.isPending}
      onClose={onClose}
      extraFields={
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Received into account</label>
            <div className="mt-1">
              <Combobox
                options={accountOptions}
                value={accountId}
                onChange={(v) => { setAccountId(v ?? ''); setAccountTouched(true); }}
                placeholder="Select cash / bank account"
                searchPlaceholder="Search accounts…"
                emptyText="No matching accounts"
              />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-2.5">
            <p className="text-xs font-semibold text-gray-500">Received in a different currency? (optional)</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              The Amount above should still be the {target.currency} equivalent you&apos;re crediting —
              record the real amount and rate you converted here, and put the real transaction ID
              (not the conversion) in Reference.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className="text-[11px] text-gray-500">Currency</label>
                <select
                  value={foreignCurrency}
                  onChange={(e) => setForeignCurrency(e.target.value)}
                  className="w-full mt-0.5 bg-gray-50 border-none rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-black"
                >
                  <option value="">—</option>
                  {foreignCurrencyOptions.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-500">Amount received</label>
                <input
                  type="number" inputMode="decimal" value={foreignAmount}
                  onChange={(e) => setForeignAmount(e.target.value)}
                  className="w-full mt-0.5 bg-gray-50 border-none rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500">Rate (1 {target.currency} = ?)</label>
                <input
                  type="number" inputMode="decimal" value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-full mt-0.5 bg-gray-50 border-none rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          </div>
        </div>
      }
      onSubmit={({ amount, method, reference, effectiveAt, overpaymentAction }) =>
        new Promise((resolve, reject) => {
          if (!accountId) {
            reject(new Error('Select which account this payment landed in.'));
            return;
          }
          const fAmount = parseFloat(foreignAmount);
          const fRate = parseFloat(exchangeRate);
          const hasForeign = foreignAmount.trim() !== '' && exchangeRate.trim() !== '';
          if (hasForeign && (!fAmount || fAmount <= 0 || !fRate || fRate <= 0)) {
            reject(new Error('Enter a valid foreign amount and exchange rate, or leave both blank.'));
            return;
          }
          recordPay.mutate(
            {
              contactId, amount, paymentMethod: method, reference, paidAt: effectiveAt, accountId,
              surplusAction: overpaymentAction === 'store_credit' ? 'store_credit' : undefined,
              foreignAmount: hasForeign ? fAmount : undefined,
              exchangeRate: hasForeign ? fRate : undefined,
              foreignCurrency: hasForeign ? (foreignCurrency || undefined) : undefined,
            },
            {
              onSuccess: (res) => {
                const surplus = parseFloat(res.surplus_amount || '0');
                if (surplus > 0) {
                  toast.success(`Payment recorded — ${surplus.toLocaleString()} credited to ${target.customer_name || 'the customer'}'s store credit`);
                }
                onClose();
                resolve();
              },
              onError: reject,
            },
          );
        })
      }
    />
  );
}
