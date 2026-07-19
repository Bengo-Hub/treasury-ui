'use client';

import { Button } from '@/components/ui/base';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccounts } from '@/hooks/use-accounts';
import { usePayBill } from '@/hooks/use-bills';
import { ONLINE_PAYMENT_METHODS, type Bill, type PayBillRequest } from '@/lib/api/bills';
import { listPaymentIntents } from '@/lib/api/payments';
import { formatCurrency } from '@/lib/utils/currency';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

const OFFLINE_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];

const ONLINE_METHODS = [
  { value: 'mpesa_b2b', label: 'M-Pesa B2B' },
  { value: 'mpesa_b2c', label: 'M-Pesa B2C' },
  { value: 'paystack_bank', label: 'Paystack (bank)' },
  { value: 'paystack_mobile', label: 'Paystack (mobile)' },
];

const isOnlineMethod = (m: string): boolean => (ONLINE_PAYMENT_METHODS as readonly string[]).includes(m);
const isPhoneMethod = (m: string): boolean => m === 'mpesa_b2b' || m === 'mpesa_b2c' || m === 'paystack_mobile';

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
  const [reference, setReference] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientBankCode, setRecipientBankCode] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [recipientAccountName, setRecipientAccountName] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
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

  const reset = () => {
    setMode('settle');
    setMethod('cash');
    setAccountId('');
    setReference('');
    setRecipientPhone('');
    setRecipientBankCode('');
    setRecipientAccountNumber('');
    setRecipientAccountName('');
    setPaymentIntentId('');
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
    } else if (online) {
      if (isPhoneMethod(method) && !recipientPhone.trim()) {
        setError('Recipient phone is required for this method.');
        return;
      }
      if (method === 'paystack_bank' && (!recipientBankCode.trim() || !recipientAccountNumber.trim())) {
        setError('Recipient bank code and account number are required for this method.');
        return;
      }
      body = {
        payment_method: method,
        reference: reference.trim() || undefined,
        recipient_phone: recipientPhone.trim() || undefined,
        recipient_bank_code: recipientBankCode.trim() || undefined,
        recipient_account_number: recipientAccountNumber.trim() || undefined,
        recipient_account_name: recipientAccountName.trim() || undefined,
      };
    } else {
      if (!reference.trim()) {
        setError('A reference is required for offline payment methods.');
        return;
      }
      body = {
        payment_method: method,
        paid_from_account_id: accountId || undefined,
        reference: reference.trim(),
      };
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
          description={`${bill.bill_number} · ${formatCurrency(Number(bill.total_amount), bill.currency)}`}
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
                  <FormField label="Paid from account" description="The cash / bank account the money left.">
                    <Combobox
                      options={accountOptions}
                      value={accountId}
                      onChange={(v) => setAccountId(v ?? '')}
                      placeholder={accountOptions.length ? 'Select cash / bank account' : 'No cash/bank accounts — tenant default will be used'}
                      searchPlaceholder="Search accounts…"
                      emptyText="No matching accounts"
                      clearable
                    />
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

                {online && method === 'paystack_bank' && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Bank code" required>
                      <input
                        value={recipientBankCode}
                        onChange={(e) => setRecipientBankCode(e.target.value)}
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Account number" required>
                      <input
                        value={recipientAccountNumber}
                        onChange={(e) => setRecipientAccountNumber(e.target.value)}
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Account name" className="col-span-2">
                      <input
                        value={recipientAccountName}
                        onChange={(e) => setRecipientAccountName(e.target.value)}
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                )}

                <FormField
                  label="Reference"
                  required={!online}
                  description={online ? 'Optional — defaults to a generated dispatcher reference.' : 'e.g. M-Pesa code, cheque no., receipt no.'}
                >
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={online ? 'Optional' : 'Required'}
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
