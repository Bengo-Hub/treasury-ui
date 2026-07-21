'use client';

import { SettlementModal, PAYOUT_METHODS } from '@bengo-hub/shared-ui-lib/payments';
import { usePayoutCustomerCredit } from '@/hooks/use-invoices';
import type { CustomerBalance } from '@/lib/api/invoices';

interface PayoutCreditModalProps {
  tenant: string;
  target: CustomerBalance;
  onClose: () => void;
}

/**
 * Pay out some/all of a customer's EXISTING stored credit (store_credit_balance — tracked
 * independently of balance_due, see the Phase B fix) via a real channel, independent of any
 * return/sale — a thin wrapper over the shared SettlementModal. Reused by ClientsManager.
 */
export function PayoutCreditModal({ tenant, target, onClose }: PayoutCreditModalProps) {
  const payout = usePayoutCustomerCredit(tenant);
  const available = parseFloat(target.store_credit_balance) || 0;
  const contactId = target.crm_contact_id || target.customer_identifier || target.id;

  return (
    <SettlementModal
      open
      mode="payout"
      title="Pay out credit"
      subjectName={target.customer_name || target.customer_identifier || 'Customer'}
      amountLabel="Available credit"
      amountValue={available}
      defaultAmount={available}
      maxAmount={available}
      currency={target.currency}
      methods={PAYOUT_METHODS}
      isPending={payout.isPending}
      onClose={onClose}
      onSubmit={({ amount, method, reference }) =>
        new Promise((resolve, reject) => {
          payout.mutate(
            { contactId, amount, payoutChannel: method ?? 'cash', reference },
            { onSuccess: () => { onClose(); resolve(); }, onError: reject },
          );
        })
      }
    />
  );
}
