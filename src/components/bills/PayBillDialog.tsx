'use client';

import { Button } from '@/components/ui/base';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePayBill } from '@/hooks/use-bills';
import { type Bill, type PayBillRequest } from '@/lib/api/bills';
import { listPaymentIntents } from '@/lib/api/payments';
import { formatCurrency } from '@/lib/utils/currency';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BillPaymentFields } from './BillPaymentFields';
import { useBillPaymentForm } from './use-bill-payment-form';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

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
 * Approvals inbox (the mutation's own toast, mirroring use-tax.ts, fires alongside it). The
 * method/account/recipient/reference/date fields are shared with SettleVendorDialog
 * (BillPaymentFields + useBillPaymentForm).
 */
export function PayBillDialog({ tenant, orgSlug, bill, onClose }: PayBillDialogProps) {
  const payMutation = usePayBill(tenant);

  const [mode, setMode] = useState<'settle' | 'link'>('settle');
  const [amount, setAmount] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [error, setError] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const form = useBillPaymentForm(tenant, Number(amount || 0));

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
    setAmount('');
    setPaymentIntentId('');
    setError('');
    setApprovalRequired(false);
    form.reset();
  };

  const close = () => {
    reset();
    onClose();
  };

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
      const { channel, error: channelError } = form.build();
      if (!channel) {
        setError(channelError ?? 'Complete the payment details.');
        return;
      }
      body = { ...channel, amount: amt };
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

                <BillPaymentFields form={form} tenant={tenant} currency={bill.currency || 'KES'} />
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
