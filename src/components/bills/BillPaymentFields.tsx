'use client';

import { BankAccountVerify } from '@/components/payments/bank-account-verify';
import { Combobox } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/form-field';
import { formatCurrency } from '@/lib/utils/currency';
import { nowDatetimeLocal } from '@bengo-hub/shared-ui-lib/payments';
import { AlertTriangle } from 'lucide-react';
import {
  ONLINE_METHODS, OFFLINE_METHODS, isPhoneMethod, isShortcodeMethod, offlineMethodRequiresReference,
  type BillPaymentForm,
} from './use-bill-payment-form';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

/**
 * The "how is this vendor payment made" fields: method, the account the money leaves from
 * (offline), the supplier's payout destination (online), reference and payment date. State lives
 * in useBillPaymentForm so PayBillDialog and SettleVendorDialog share one set of rules.
 */
export function BillPaymentFields({ form, tenant, currency }: { form: BillPaymentForm; tenant: string; currency: string }) {
  const { method, online } = form;
  return (
    <>
      <FormField label="Payment method" required>
        <select value={method} onChange={(e) => form.setMethod(e.target.value)} className={inputClass}>
          <optgroup label="Offline">
            {OFFLINE_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </optgroup>
          <optgroup label="Online (dispatched for real)">
            {ONLINE_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </optgroup>
        </select>
      </FormField>

      {!online && (
        <FormField
          label="Paid from account"
          required
          description={
            form.insufficientBalance
              ? `Warning: this account's balance (${formatCurrency(form.selectedAccountBalance ?? 0, form.selectedAccount?.currency || currency)}) won't cover this payment.`
              : 'The cash / bank account the money left.'
          }
        >
          <Combobox
            options={form.accountOptions}
            value={form.accountId}
            onChange={(v) => { form.setAccountId(v ?? ''); form.setAccountTouched(true); }}
            placeholder={form.accountOptions.length ? 'Select cash / bank account' : 'No cash/bank accounts yet — create one first'}
            searchPlaceholder="Search accounts…"
            emptyText="No matching accounts"
          />
          {form.insufficientBalance && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" /> Insufficient balance on this account — you can still proceed.
            </p>
          )}
        </FormField>
      )}

      {online && isPhoneMethod(method) && (
        <FormField label="Recipient phone" required description="The supplier's payout phone number.">
          <input
            value={form.recipientPhone}
            onChange={(e) => form.setRecipientPhone(e.target.value)}
            placeholder="2547XXXXXXXX"
            className={inputClass}
          />
        </FormField>
      )}

      {online && isShortcodeMethod(method) && (
        <div className="space-y-3">
          <FormField
            label="Recipient shortcode"
            required
            description="The supplier's OWN M-Pesa paybill or till number — B2B pays a business account, never a phone number."
          >
            <input
              value={form.recipientShortcode}
              onChange={(e) => form.setRecipientShortcode(e.target.value)}
              placeholder="e.g. 600000"
              className={inputClass}
            />
          </FormField>
          <FormField label="Shortcode type">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => form.setRecipientIsTill(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${!form.recipientIsTill ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
              >
                Paybill
              </button>
              <button
                type="button"
                onClick={() => form.setRecipientIsTill(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.recipientIsTill ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
              >
                Till / Buy Goods
              </button>
            </div>
          </FormField>
          <FormField label="Account reference" description="The account number at the recipient's paybill, if applicable.">
            <input
              value={form.recipientAccountNumber}
              onChange={(e) => form.setRecipientAccountNumber(e.target.value)}
              className={inputClass}
            />
          </FormField>
        </div>
      )}

      {online && method === 'paystack_bank' && (
        <BankAccountVerify
          tenantSlug={tenant}
          value={{
            bank_name: form.recipientBankName,
            bank_code: form.recipientBankCode,
            account_number: form.recipientAccountNumber,
            account_name: form.recipientAccountName,
          }}
          onChange={(patch) => {
            if (patch.bank_name !== undefined) form.setRecipientBankName(patch.bank_name);
            if (patch.bank_code !== undefined) form.setRecipientBankCode(patch.bank_code);
            if (patch.account_number !== undefined) form.setRecipientAccountNumber(patch.account_number);
            if (patch.account_name !== undefined) form.setRecipientAccountName(patch.account_name);
          }}
        />
      )}

      <FormField
        label="Reference"
        required={!online && offlineMethodRequiresReference(method)}
        description={
          online
            ? 'Optional — defaults to a generated dispatcher reference.'
            : offlineMethodRequiresReference(method)
              ? 'e.g. cheque no., bank transaction ref.'
              : 'Optional — cash and card have nothing to write down.'
        }
      >
        <input
          value={form.reference}
          onChange={(e) => form.setReference(e.target.value)}
          placeholder={online || !offlineMethodRequiresReference(method) ? 'Optional' : 'Required'}
          className={inputClass}
        />
      </FormField>

      <FormField label="Payment date & time" required>
        <input
          type="datetime-local"
          value={form.paidAtLocal}
          max={nowDatetimeLocal()}
          onChange={(e) => form.setPaidAtLocal(e.target.value)}
          className={inputClass}
        />
      </FormField>
    </>
  );
}
