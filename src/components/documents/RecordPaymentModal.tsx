'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  SettlementModal,
  SETTLE_CREDIT_SALE_METHODS,
  resolveDefaultAccount,
} from '@bengo-hub/shared-ui-lib/payments';
import { useInvoices, useRecordPayment } from '@/hooks/use-invoices';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { bankAccountHint } from '@/lib/api/bank-accounts';
import { invoiceAmountDue, type Invoice } from '@/lib/api/invoices';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';

/** The invoice fields Record Payment needs. Invoice, DocumentRow and an AR aging open invoice
 *  (mapped by the caller) all satisfy it. */
export interface PayableInvoice {
  id: string;
  invoice_number: string;
  customer_name?: string;
  currency: string;
  total_amount: string;
  amount_paid?: string;
  /** Server-computed balance (payments AND credit notes netted). */
  amount_due?: string;
  settlement_account_id?: string;
}

interface Props {
  tenant: string;
  /** The invoice being paid. Omit to pick one open invoice inside the modal. */
  invoice?: PayableInvoice;
  /** Restricts the picker to these invoices (e.g. one debtor's open invoices from the dashboard);
   *  without it the picker lists the tenant's open invoices. */
  choices?: PayableInvoice[];
  onClose: () => void;
}

const PICKER_LIMIT = 100;

/**
 * Record a manual payment against an invoice (POST /invoices/{id}/record-payment). A thin wrapper
 * over the shared SettlementModal (@bengo-hub/shared-ui-lib/payments), exactly like
 * ReceivePaymentModal: the shared modal owns amount / method / reference / backdated date and their
 * validation, with the canonical offline-collection method registry. This component only adds the
 * "paid into account" picker (required by RecordPayment) and, when no invoice is given, the invoice
 * picker.
 *
 * It replaces a hand-rolled 3-step modal that forked its own method list, defaulted the amount to
 * the invoice TOTAL (so a part-paid invoice offered the full amount again: KES 137,000 prefilled on
 * INV-260917-000025 with 71,000 left), and in multi-invoice mode recorded the SAME full amount
 * against every selected invoice. The amount now defaults to the server's amount_due (payments and
 * credit notes netted) and is capped at it, one invoice at a time.
 */
export function RecordPaymentModal({ tenant, invoice, choices, onClose }: Props) {
  const recordPayment = useRecordPayment(tenant);

  // Picker mode only: the tenant's open invoices, unpaid and part-paid, when the caller did not
  // pass its own candidates.
  const pickerNeedsFetch = !invoice && !choices;
  const unpaid = useInvoices(tenant, { payment_status: 'unpaid', limit: PICKER_LIMIT }, pickerNeedsFetch);
  const partial = useInvoices(tenant, { payment_status: 'partial', limit: PICKER_LIMIT }, pickerNeedsFetch);
  const candidates = useMemo<PayableInvoice[]>(() => {
    if (invoice) return [invoice];
    if (choices) return choices;
    const rows: Invoice[] = [...(unpaid.data?.invoices ?? []), ...(partial.data?.invoices ?? [])];
    return rows.filter((r) => !['draft', 'void', 'cancelled', 'pending_approval', 'rejected'].includes(r.status)
      && r.invoice_type !== 'credit_note' && invoiceAmountDue(r) > 0.0001);
  }, [invoice, choices, unpaid.data, partial.data]);

  const [pickedId, setPickedId] = useState(invoice?.id ?? choices?.[0]?.id ?? '');
  const target = candidates.find((c) => c.id === pickedId) ?? (invoice ? invoice : undefined);
  const due = target ? invoiceAmountDue(target) : 0;
  const currency = target?.currency ?? invoice?.currency ?? 'KES';

  // Sourced from the real bank_accounts table: RecordPayment's account_id resolves as a
  // financial-account lookup (ledger.ResolveCashCode), so the picker offers BankAccount IDs.
  const { data: bankAccountsData } = useBankAccounts(tenant);
  const accounts = bankAccountsData?.bank_accounts;
  const accountOptions = useMemo<ComboboxOption[]>(
    () => (accounts ?? [])
      .filter((a) => a.is_active !== false)
      .map((a) => ({ value: a.id, label: a.account_name, hint: bankAccountHint(a) })),
    [accounts],
  );
  // The account follows the method's tenant default until the user picks one. The invoice's own
  // settlement account (the account it was raised against) wins over the method default.
  const [method, setMethod] = useState<string>(SETTLE_CREDIT_SALE_METHODS[0]?.value ?? 'cash');
  const [pickedAccount, setPickedAccount] = useState('');
  const accountId = pickedAccount
    || target?.settlement_account_id
    || resolveDefaultAccount(accounts, method)?.id
    || '';

  const invoiceOptions = useMemo<ComboboxOption[]>(
    () => candidates.map((c) => ({
      value: c.id,
      label: `${c.invoice_number}${c.customer_name ? ` · ${c.customer_name}` : ''}`,
      hint: `${c.currency} ${invoiceAmountDue(c).toLocaleString('en-KE', { minimumFractionDigits: 2 })} due`,
    })),
    [candidates],
  );

  const subject = target
    ? `${target.invoice_number}${target.customer_name ? ` · ${target.customer_name}` : ''}`
    : 'Select an invoice';

  return (
    <SettlementModal
      // Re-mount on invoice change so the amount re-defaults to the newly picked balance.
      key={target?.id ?? 'none'}
      open
      mode="receive"
      title="Record payment"
      subjectName={subject}
      amountLabel="Balance due"
      amountValue={due}
      defaultAmount={due}
      maxAmount={due}
      currency={currency}
      methods={SETTLE_CREDIT_SALE_METHODS}
      onMethodChange={setMethod}
      isPending={recordPayment.isPending}
      onClose={onClose}
      extraFields={
        <div className="space-y-3">
          {!invoice && (
            <div>
              <label className="text-xs font-semibold text-gray-500">Invoice</label>
              <div className="mt-1">
                <Combobox
                  options={invoiceOptions}
                  value={pickedId}
                  onChange={(v) => { setPickedId(v ?? ''); setPickedAccount(''); }}
                  placeholder={pickerNeedsFetch && (unpaid.isLoading || partial.isLoading) ? 'Loading open invoices…' : 'Select an open invoice'}
                  searchPlaceholder="Search invoice or customer…"
                  emptyText="No open invoices"
                />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500">Paid into account</label>
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
        </div>
      }
      onSubmit={({ amount, method: m, reference, effectiveAt }) =>
        new Promise<void>((resolve, reject) => {
          if (!target) {
            reject(new Error('Select the invoice this payment is for.'));
            return;
          }
          if (due <= 0) {
            reject(new Error('This invoice has nothing left to pay.'));
            return;
          }
          if (!accountId) {
            reject(new Error('Select which account this payment landed in.'));
            return;
          }
          recordPayment.mutate(
            {
              invoiceId: target.id,
              amount: String(amount),
              method: m,
              account_id: accountId,
              reference,
              paid_at: effectiveAt,
            },
            {
              onSuccess: () => {
                toast.success(`Payment recorded on ${target.invoice_number}`);
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
