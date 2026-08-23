'use client';

import { Button } from '@/components/ui/base';
import { BankAccountVerify } from '@/components/payments/bank-account-verify';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccounts } from '@/hooks/use-accounts';
import { usePayBill } from '@/hooks/use-bills';
import { ONLINE_PAYMENT_METHODS, type Bill, type PayBillRequest } from '@/lib/api/bills';
import { listPaymentIntents } from '@/lib/api/payments';
import { formatCurrency } from '@/lib/utils/currency';
import { nowDatetimeLocal, datetimeLocalToISO } from '@bengo-hub/shared-ui-lib/payments';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

// Per-method reference requirement — the SAME rule shared-ui-lib's SettlementModal registry uses
// everywhere else on the platform (AR receipts, vendor-credit payouts, POS credit-sale
// settlement): only methods that produce an actual slip/code (bank transfer, cheque) need one.
// Cash and card have nothing to write down. A previous version of this dialog blanket-required a
// reference for ANY offline method, including cash — that's the bug this map fixes.
const OFFLINE_METHODS: { value: string; label: string; requiresReference: boolean }[] = [
  { value: 'cash', label: 'Cash', requiresReference: false },
  { value: 'card', label: 'Card', requiresReference: false },
  { value: 'bank', label: 'Bank transfer', requiresReference: true },
  { value: 'cheque', label: 'Cheque', requiresReference: true },
];

const ONLINE_METHODS = [
  { value: 'mpesa_b2b', label: 'M-Pesa B2B' },
  { value: 'mpesa_b2c', label: 'M-Pesa B2C' },
  { value: 'paystack_bank', label: 'Paystack (bank)' },
  { value: 'paystack_mobile', label: 'Paystack (mobile)' },
];

const offlineMethodRequiresReference = (m: string): boolean =>
  OFFLINE_METHODS.find((om) => om.value === m)?.requiresReference ?? false;

const isOnlineMethod = (m: string): boolean => (ONLINE_PAYMENT_METHODS as readonly string[]).includes(m);
// mpesa_b2c/paystack_mobile pay an individual's OWN phone (MSISDN). mpesa_b2b is a DIFFERENT
// shape entirely — it pays another ORGANIZATION's paybill/till, never a phone number — so it gets
// its own field set (isShortcodeMethod below), not lumped in here.
const isPhoneMethod = (m: string): boolean => m === 'mpesa_b2c' || m === 'paystack_mobile';
const isShortcodeMethod = (m: string): boolean => m === 'mpesa_b2b';

interface PayBillDialogProps {
  tenant: string;
  orgSlug: string;
  bill: Bill | null;
  onClose: () => void;
}

/**
 * PayBillDialog settles a vendor bill via the complete PayBill flow: an explicit GL account +
 * payment method + reference (offline: cash/bank/card), a real online dispatch (mpesa_b2b/
 * mpesa_b2c/paystack_bank/paystack_mobile — routed through the payout Dispatcher), or the legacy
 * "Link a payment" mode that settles against an already-collected payment intent. Every method
 * passes through the SAME approval gate; a 409 surfaces here as an inline banner linking to the
 * Approvals inbox (the mutation's own toast, mirroring use-tax.ts, fires alongside it).
 */
export function PayBillDialog({ tenant, orgSlug, bill, onClose }: PayBillDialogProps) {
  const payMutation = usePayBill(tenant);

  const [mode, setMode] = useState<'settle' | 'link'>('settle');
  const [method, setMethod] = useState('cash');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientShortcode, setRecipientShortcode] = useState('');
  const [recipientIsTill, setRecipientIsTill] = useState(false);
  const [recipientBankName, setRecipientBankName] = useState('');
  const [recipientBankCode, setRecipientBankCode] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [recipientAccountName, setRecipientAccountName] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [paidAtLocal, setPaidAtLocal] = useState(nowDatetimeLocal());
  const [error, setError] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(false);

  const { data: accountsData } = useAccounts(tenant);
  const accountOptions = useMemo<ComboboxOption[]>(
    () =>
      (accountsData?.accounts ?? [])
        .filter((a) => a.account_type === 'asset' && a.is_active !== false)
        .map((a) => ({ value: a.id, label: a.account_name, hint: a.account_code })),
    [accountsData],
  );
  const selectedAccount = accountsData?.accounts?.find((a) => a.id === accountId);
  const selectedAccountBalance = selectedAccount?.balance !== undefined ? parseFloat(selectedAccount.balance) : undefined;
  // Warn (never hard-block — the cashier may still be entering figures, or the account genuinely
  // runs negative) when the chosen account's balance won't cover this payment — mirrors pos-ui's
  // add-expense-modal pattern.
  const insufficientBalance =
    !!selectedAccount &&
    selectedAccountBalance !== undefined &&
    !Number.isNaN(selectedAccountBalance) &&
    Number(amount || 0) > selectedAccountBalance;

  const { data: intentsData, isLoading: loadingIntents } = useQuery({
    queryKey: ['payment-intents', tenant],
    queryFn: () => listPaymentIntents(tenant),
    enabled: !!tenant && mode === 'link',
    staleTime: 60_000,
  });
  const intentOptions: ComboboxOption[] = (intentsData?.intents ?? []).map((it) => ({
    value: it.id,
    label: `${it.currency ?? 'KES'} ${it.amount} · ${it.status}${it.reference_type ? ` · ${it.reference_type}` : ''}`,
    hint: it.id.slice(0, 8),
  }));

  // balanceDue falls back to total_amount for a not-yet-refreshed cached bill row (pre-
  // amount_paid/balance_due fields) so the dialog never shows a blank/zero default.
  const balanceDue = bill ? Number(bill.balance_due ?? bill.total_amount) : 0;

  // Default the amount to the full outstanding balance whenever a (new) bill is loaded into the
  // dialog — the user can lower it to record a partial payment instead.
  useEffect(() => {
    if (bill) setAmount(String(balanceDue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill?.id]);

  const reset = () => {
    setMode('settle');
    setMethod('cash');
    setAccountId('');
    setAmount('');
    setReference('');
    setRecipientPhone('');
    setRecipientShortcode('');
    setRecipientIsTill(false);
    setRecipientBankName('');
    setRecipientBankCode('');
    setRecipientAccountNumber('');
    setRecipientAccountName('');
    setPaymentIntentId('');
    setPaidAtLocal(nowDatetimeLocal());
    setError('');
    setApprovalRequired(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const online = isOnlineMethod(method);

  const submit = () => {
    if (!bill) return;
    setError('');
    setApprovalRequired(false);

    let body: PayBillRequest;
    if (mode === 'link') {
      if (!paymentIntentId) {
        setError('Select a payment.');
        return;
      }
      body = { payment_intent_id: paymentIntentId };
    } else {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) {
        setError('Enter a valid amount to pay.');
        return;
      }
      if (amt > balanceDue + 0.0001) {
        setError(`Amount exceeds the outstanding balance (${formatCurrency(balanceDue, bill.currency)}).`);
        return;
      }
      if (online) {
        if (isPhoneMethod(method) && !recipientPhone.trim()) {
          setError('Recipient phone is required for this method.');
          return;
        }
        if (isShortcodeMethod(method) && !recipientShortcode.trim()) {
          setError('Recipient shortcode (paybill or till number) is required for this method.');
          return;
        }
        if (method === 'paystack_bank' && (!recipientBankCode.trim() || !recipientAccountNumber.trim())) {
          setError('Recipient bank code and account number are required for this method.');
          return;
        }
        body = {
          payment_method: method,
          amount: amt,
          reference: reference.trim() || undefined,
          recipient_phone: isPhoneMethod(method) ? recipientPhone.trim() || undefined : undefined,
          recipient_shortcode: isShortcodeMethod(method) ? recipientShortcode.trim() || undefined : undefined,
          recipient_is_till: isShortcodeMethod(method) ? recipientIsTill : undefined,
          recipient_bank_code: recipientBankCode.trim() || undefined,
          recipient_account_number: recipientAccountNumber.trim() || undefined,
          recipient_account_name: recipientAccountName.trim() || undefined,
          paid_at: datetimeLocalToISO(paidAtLocal),
        };
      } else {
        if (!accountId) {
          setError('Select which account this payment is coming from.');
          return;
        }
        if (offlineMethodRequiresReference(method) && !reference.trim()) {
          setError('A reference is required for this payment method.');
          return;
        }
        body = {
          payment_method: method,
          amount: amt,
          paid_from_account_id: accountId,
          reference: reference.trim() || undefined,
          paid_at: datetimeLocalToISO(paidAtLocal),
        };
      }
    }

    payMutation.mutate(
      { id: bill.id, data: body },
      {
        onSuccess: () => close(),
        onError: (e: any) => {
          if (e?.response?.data?.error === 'approval_required') setApprovalRequired(true);
        },
      },
    );
  };

  return (
    <Dialog open={!!bill} onOpenChange={(o) => !o && !payMutation.isPending && close()}>
      {bill && (
        <DialogContent
          title="Pay Bill"
          description={
            Number(bill.amount_paid) > 0
              ? `${bill.bill_number} · ${formatCurrency(balanceDue, bill.currency)} due of ${formatCurrency(Number(bill.total_amount), bill.currency)}`
              : `${bill.bill_number} · ${formatCurrency(Number(bill.total_amount), bill.currency)}`
          }
          onClose={close}
          className="max-w-lg"
        >
          <div className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'settle' | 'link')}>
              <TabsList>
                <TabsTrigger value="settle">Settle payment</TabsTrigger>
                <TabsTrigger value="link">Link a payment</TabsTrigger>
              </TabsList>

              <TabsContent value="settle" className="space-y-4 pt-4">
                <FormField
                  label="Amount to pay"
                  required
                  description={
                    amount && Number(amount) < balanceDue
                      ? `Partial payment — ${formatCurrency(balanceDue - Number(amount), bill.currency)} will remain outstanding.`
                      : 'Defaults to the full outstanding balance. Lower it to pay in installments.'
                  }
                >
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={balanceDue}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Payment method" required>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className={inputClass}
                  >
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
                      insufficientBalance
                        ? `Warning: this account's balance (${formatCurrency(selectedAccountBalance ?? 0, selectedAccount?.currency || bill.currency)}) won't cover this payment.`
                        : 'The cash / bank account the money left.'
                    }
                  >
                    <Combobox
                      options={accountOptions}
                      value={accountId}
                      onChange={(v) => setAccountId(v ?? '')}
                      placeholder={accountOptions.length ? 'Select cash / bank account' : 'No cash/bank accounts yet — create one first'}
                      searchPlaceholder="Search accounts…"
                      emptyText="No matching accounts"
                    />
                    {insufficientBalance && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" /> Insufficient balance on this account — you can still proceed.
                      </p>
                    )}
                  </FormField>
                )}

                {online && isPhoneMethod(method) && (
                  <FormField label="Recipient phone" required description="The supplier's payout phone number.">
                    <input
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
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
                        value={recipientShortcode}
                        onChange={(e) => setRecipientShortcode(e.target.value)}
                        placeholder="e.g. 600000"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Shortcode type">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRecipientIsTill(false)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${!recipientIsTill ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                        >
                          Paybill
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecipientIsTill(true)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${recipientIsTill ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                        >
                          Till / Buy Goods
                        </button>
                      </div>
                    </FormField>
                    <FormField label="Account reference" description="The account number at the recipient's paybill, if applicable.">
                      <input
                        value={recipientAccountNumber}
                        onChange={(e) => setRecipientAccountNumber(e.target.value)}
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                )}

                {online && method === 'paystack_bank' && (
                  <BankAccountVerify
                    tenantSlug={tenant}
                    value={{
                      bank_name: recipientBankName,
                      bank_code: recipientBankCode,
                      account_number: recipientAccountNumber,
                      account_name: recipientAccountName,
                    }}
                    onChange={(patch) => {
                      if (patch.bank_name !== undefined) setRecipientBankName(patch.bank_name);
                      if (patch.bank_code !== undefined) setRecipientBankCode(patch.bank_code);
                      if (patch.account_number !== undefined) setRecipientAccountNumber(patch.account_number);
                      if (patch.account_name !== undefined) setRecipientAccountName(patch.account_name);
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
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={online || !offlineMethodRequiresReference(method) ? 'Optional' : 'Required'}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Payment date & time" required>
                  <input
                    type="datetime-local"
                    value={paidAtLocal}
                    max={nowDatetimeLocal()}
                    onChange={(e) => setPaidAtLocal(e.target.value)}
                    className={inputClass}
                  />
                </FormField>
              </TabsContent>

              <TabsContent value="link" className="space-y-4 pt-4">
                <FormField label="Payment" required description="The payment intent that covers this bill.">
                  <Combobox
                    options={intentOptions}
                    value={paymentIntentId}
                    onChange={setPaymentIntentId}
                    loading={loadingIntents}
                    placeholder="Select a payment…"
                    searchPlaceholder="Search payments by amount, status or reference…"
                    emptyText="No payment intents found"
                  />
                </FormField>
              </TabsContent>
            </Tabs>

            {approvalRequired && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">This payment needs approval before it can be released.</p>
                  <Link href={`/${orgSlug}/approvals`} className="underline font-medium hover:no-underline">
                    Go to the Approvals inbox
                  </Link>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={close} disabled={payMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={payMutation.isPending}>
                {payMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                <CreditCard className="h-4 w-4 mr-1" /> Pay Bill
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
