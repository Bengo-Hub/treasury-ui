'use client';

import { SettlementModal } from '@bengo-hub/shared-ui-lib/payments';
import { useApplyCustomerCreditToDebt } from '@/hooks/use-invoices';
import type { CustomerBalance } from '@/lib/api/invoices';

interface ApplyCreditToDebtModalProps {
  tenant: string;
  target: CustomerBalance;
  onClose: () => void;
}

/**
 * Net a customer's EXISTING stored credit against their OWN outstanding debit — the explicit,
 * visible action that replaces the old silent behaviour where an unrelated cash payment could
 * drive balance_due to zero while a store-credit grant stayed stranded and invisible (the
 * boi-enterprises incident). A thin wrapper over the shared SettlementModal — no method
 * selector needed (this always nets the SAME customer's two balances against each other).
 * POST /ar/customers/{contactID}/apply-to-debt.
 */
export function ApplyCreditToDebtModal({ tenant, target, onClose }: ApplyCreditToDebtModalProps) {
  const applyToDebt = useApplyCustomerCreditToDebt(tenant);
  const available = parseFloat(target.store_credit_balance) || 0;
  const owed = parseFloat(target.outstanding_debit) || 0;
  const cap = Math.min(available, owed);
  const contactId = target.crm_contact_id || target.customer_identifier || target.id;

  return (
    <SettlementModal
      open
      mode="apply_to_debt"
      title="Apply store credit to debt"
      subjectName={target.customer_name || target.customer_identifier || 'Customer'}
      amountLabel={`Available credit ${target.currency} ${available.toLocaleString()} · Outstanding debit ${target.currency} ${owed.toLocaleString()}`}
      amountValue={cap}
      defaultAmount={cap}
      maxAmount={cap}
      currency={target.currency}
      methods={[]}
      isPending={applyToDebt.isPending}
      onClose={onClose}
      onSubmit={({ amount, reference }) =>
        new Promise((resolve, reject) => {
          applyToDebt.mutate(
            { contactId, amount, reference },
            { onSuccess: () => { onClose(); resolve(); }, onError: reject },
          );
        })
      }
    />
  );
}
