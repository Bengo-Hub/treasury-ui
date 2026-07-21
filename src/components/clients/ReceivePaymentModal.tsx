'use client';

import { SettlementModal, RECEIVE_METHODS } from '@bengo-hub/shared-ui-lib/payments';
import { useRecordCustomerPayment } from '@/hooks/use-invoices';
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
 */
export function ReceivePaymentModal({ tenant, target, onClose }: ReceivePaymentModalProps) {
  const recordPay = useRecordCustomerPayment(tenant);
  const contactId = target.crm_contact_id || target.customer_identifier || target.id;

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
      onSubmit={({ amount, method, reference }) =>
        new Promise((resolve, reject) => {
          recordPay.mutate(
            { contactId, amount, paymentMethod: method, reference },
            { onSuccess: () => { onClose(); resolve(); }, onError: reject },
          );
        })
      }
    />
  );
}
