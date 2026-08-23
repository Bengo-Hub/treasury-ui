'use client';

import { useMemo, useState } from 'react';
import { SettlementModal, RECEIVE_METHODS } from '@bengo-hub/shared-ui-lib/payments';
import { useRecordCustomerPayment } from '@/hooks/use-invoices';
import { useAccounts } from '@/hooks/use-accounts';
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

  const { data: accountsData } = useAccounts(tenant);
  const accountOptions = useMemo<ComboboxOption[]>(
    () =>
      (accountsData?.accounts ?? [])
        .filter((a) => a.account_type === 'asset' && a.is_active !== false)
        .map((a) => ({ value: a.id, label: a.account_name, hint: a.account_code })),
    [accountsData],
  );
  const [accountId, setAccountId] = useState('');

  return (
    <SettlementModal
      open
      mode="receive"
      title="Receive payment"
      subjectName={target.customer_name || target.customer_identifier || 'Customer'}
      amountLabel="Balance due"
      amountValue={parseFloat(target.outstanding_debit) || 0}
      defaultAmount={parseFloat(target.outstanding_debit) || 0}
      currency={target.currency}
      methods={RECEIVE_METHODS}
      isPending={recordPay.isPending}
      onClose={onClose}
      extraFields={
        <div>
          <label className="text-xs font-semibold text-gray-500">Received into account</label>
          <div className="mt-1">
            <Combobox
              options={accountOptions}
              value={accountId}
              onChange={(v) => setAccountId(v ?? '')}
              placeholder="Select cash / bank account"
              searchPlaceholder="Search accounts…"
              emptyText="No matching accounts"
            />
          </div>
        </div>
      }
      onSubmit={({ amount, method, reference, effectiveAt }) =>
        new Promise((resolve, reject) => {
          if (!accountId) {
            reject(new Error('Select which account this payment landed in.'));
            return;
          }
          recordPay.mutate(
            { contactId, amount, paymentMethod: method, reference, paidAt: effectiveAt, accountId },
            { onSuccess: () => { onClose(); resolve(); }, onError: reject },
          );
        })
      }
    />
  );
}
