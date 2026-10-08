'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SettlementModal, RECEIVE_METHODS, resolveDefaultAccount } from '@bengo-hub/shared-ui-lib/payments';
import { useRecordCustomerPayment } from '@/hooks/use-invoices';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { bankAccountHint } from '@/lib/api/bank-accounts';
import { useTenantCurrency } from '@/hooks/use-currencies';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  ReceivedCurrencyFields,
  receivedCurrencyPayload,
  SAME_CURRENCY,
  type ReceivedCurrency,
} from '@/components/currency/ReceivedCurrencyFields';
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
  // The account follows the selected method's tenant default (BankAccount.default_payment_methods,
  // reported by SettlementModal's onMethodChange) until the user picks one explicitly; still fully
  // editable via the picker below.
  const [method, setMethod] = useState<string>(RECEIVE_METHODS[0]?.value ?? 'cash');
  const [pickedAccount, setPickedAccount] = useState('');
  const accountId = pickedAccount || resolveDefaultAccount(bankAccountsData?.bank_accounts, method)?.id || '';

  // What the payer actually handed over. Defaults to the books' currency (the ledger's, else the
  // tenant's default_currency setting); another currency records the real amount and rate
  // structurally (exchange_rate/base_amount on the ledger line) instead of a tenant typing
  // "1850000/29.2" into Reference, which left the statement with no real transaction ID.
  const tenantCurrency = useTenantCurrency(tenant);
  const baseCurrency = target.currency || tenantCurrency;
  const [received, setReceived] = useState<ReceivedCurrency>(SAME_CURRENCY);

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
      currency={baseCurrency}
      methods={RECEIVE_METHODS}
      onMethodChange={setMethod}
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
                onChange={(v) => setPickedAccount(v ?? '')}
                placeholder="Select cash / bank account"
                searchPlaceholder="Search accounts…"
                emptyText="No matching accounts"
              />
            </div>
          </div>
          <ReceivedCurrencyFields tenant={tenant} baseCurrency={baseCurrency} value={received} onChange={setReceived} />
        </div>
      }
      onSubmit={({ amount, method, reference, effectiveAt, overpaymentAction }) =>
        new Promise((resolve, reject) => {
          if (!accountId) {
            reject(new Error('Select which account this payment landed in.'));
            return;
          }
          let foreign: ReturnType<typeof receivedCurrencyPayload>;
          try {
            foreign = receivedCurrencyPayload(received, baseCurrency);
          } catch (e) {
            reject(e);
            return;
          }
          recordPay.mutate(
            {
              contactId, amount, paymentMethod: method, reference, paidAt: effectiveAt, accountId,
              surplusAction: overpaymentAction === 'store_credit' ? 'store_credit' : undefined,
              foreignAmount: foreign?.foreignAmount,
              exchangeRate: foreign?.exchangeRate,
              foreignCurrency: foreign?.foreignCurrency,
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
