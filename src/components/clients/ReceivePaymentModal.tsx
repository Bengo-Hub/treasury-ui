'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useRecordCustomerPayment } from '@/hooks/use-invoices';
import type { CustomerBalance } from '@/lib/api/invoices';
import { formatCurrency } from '@/lib/utils/currency';
import { Loader2, X } from 'lucide-react';

interface ReceivePaymentModalProps {
  tenant: string;
  target: CustomerBalance;
  onClose: () => void;
}

/**
 * Every payment method the platform supports for settling AR — aligned with the POS tender
 * methods so a payment recorded here reads the same as one recorded at the till. The backend
 * accepts any method string and stamps last_payment_method (drives the payment-mode filter).
 * Exported for reuse by the dashboard receivables/payables lists.
 */
export const AR_PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa (STK / Paybill)' },
  { value: 'mpesa_manual', label: 'M-Pesa code (sighted)' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'paystack', label: 'Paystack' },
  { value: 'store_credit', label: 'Store credit' },
];

/**
 * Modal to receive a customer's AR repayment (POST /ar/customers/{contactID}/payment
 * via useRecordCustomerPayment). Reused by ClientsManager — the single place AR
 * repayments are captured.
 */
export function ReceivePaymentModal({ tenant, target, onClose }: ReceivePaymentModalProps) {
  const recordPay = useRecordCustomerPayment(tenant);
  const [amount, setAmount] = useState(target.balance_due);
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    const contactId = target.crm_contact_id || target.customer_identifier || target.id;
    recordPay.mutate(
      { contactId, amount: amt, paymentMethod: method, reference: reference || undefined },
      {
        onSuccess: () => onClose(),
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Payment failed.'),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !recordPay.isPending && onClose()}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <h3 className="text-base font-bold">Receive payment</h3>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={recordPay.isPending}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-accent/20 px-3 py-2 text-sm">
              <p className="font-semibold">{target.customer_name || target.customer_identifier || 'Customer'}</p>
              <p className="text-xs text-muted-foreground">
                Balance due: {formatCurrency(parseFloat(target.balance_due) || 0, target.currency)}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Amount ({target.currency})</label>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
              >
                {AR_PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Reference (optional)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="M-Pesa code, cheque no., etc."
                className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={recordPay.isPending}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={submit} disabled={recordPay.isPending}>
                {recordPay.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
