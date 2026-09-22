'use client';

import { useEffect, useMemo, useState } from 'react';
import { SettlementModal, RECEIVE_METHODS, resolveDefaultAccount } from '@bengo-hub/shared-ui-lib/payments';
import { useAdjustCustomerStoreCredit } from '@/hooks/use-invoices';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { bankAccountHint } from '@/lib/api/bank-accounts';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import type { CustomerBalance } from '@/lib/api/invoices';

interface AddStoreCreditModalProps {
  tenant: string;
  target: CustomerBalance;
  onClose: () => void;
}

/**
 * Manually add store credit for a customer who hands over cash purely to bank for future use —
 * not tied to any sale, return, or existing debt (the one case RecordARPayment/ApplyCustomerCredit
 * can't express: RecordARPayment requires an existing debit to settle before any surplus routes to
 * credit, and every ApplyCustomerCredit mode only ever draws an EXISTING credit down). A thin
 * wrapper over the shared SettlementModal, styled the same as ReceivePaymentModal (including its
 * account-picker pattern) but with no "balance due" framing and a mandatory reason field — this
 * bypasses the normal money-in path, so every use needs a human-readable "why" on the audit trail.
 * Works even for a customer with no prior AR history at all. Reused by ClientsManager.
 */
export function AddStoreCreditModal({ tenant, target, onClose }: AddStoreCreditModalProps) {
  const adjust = useAdjustCustomerStoreCredit(tenant);
  const contactId = target.crm_contact_id || target.customer_identifier || target.id;

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
  useEffect(() => {
    if (accountTouched || accountId || !bankAccountsData?.bank_accounts?.length) return;
    const def = resolveDefaultAccount(bankAccountsData.bank_accounts, RECEIVE_METHODS[0]?.value);
    if (def) setAccountId(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccountsData]);

  const [reason, setReason] = useState('');

  return (
    <SettlementModal
      open
      mode="receive"
      title="Add store credit"
      subjectName={target.customer_name || target.customer_identifier || 'Customer'}
      amountLabel="Amount to add"
      amountValue={0}
      currency={target.currency}
      methods={RECEIVE_METHODS}
      isPending={adjust.isPending}
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
          <div>
            <label className="text-xs font-semibold text-gray-500">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. customer deposited cash for future purchases"
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>
      }
      onSubmit={({ amount, reference, effectiveAt }) =>
        new Promise((resolve, reject) => {
          if (!accountId) {
            reject(new Error('Select which account this deposit landed in.'));
            return;
          }
          if (!reason.trim()) {
            reject(new Error('Enter a reason for this store-credit addition.'));
            return;
          }
          adjust.mutate(
            { contactId, amount, direction: 'credit', accountId, reason: reason.trim(), reference, paidAt: effectiveAt },
            { onSuccess: () => { onClose(); resolve(); }, onError: reject },
          );
        })
      }
    />
  );
}
