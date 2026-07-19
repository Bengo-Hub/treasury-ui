'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { usePayoutCustomerCredit } from '@/hooks/use-invoices';
import type { CustomerBalance } from '@/lib/api/invoices';
import { formatCurrency } from '@/lib/utils/currency';
import { Loader2, X } from 'lucide-react';

interface PayoutCreditModalProps {
  tenant: string;
  target: CustomerBalance;
  onClose: () => void;
}

/** Real cash-out channels only — this pays real money out, unlike store_credit which stays a
 * book entry. Deliberately a smaller list than AR_PAYMENT_METHODS for that reason. */
const PAYOUT_CHANNELS: { value: string; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
];

/**
 * Modal to pay out some/all of a customer's EXISTING stored credit (POST
 * /ar/customers/{contactID}/payout-credit via usePayoutCustomerCredit) — independent of any
 * return/sale, e.g. from the "I owe" filter. Reused by ClientsManager.
 */
export function PayoutCreditModal({ tenant, target, onClose }: PayoutCreditModalProps) {
  const payout = usePayoutCustomerCredit(tenant);
  const available = Math.abs(parseFloat(target.balance_due) || 0);
  const [amount, setAmount] = useState(String(available));
  const [channel, setChannel] = useState('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (amt > available + 0.0001) {
      setError(`Amount exceeds available credit (${formatCurrency(available, target.currency)}).`);
      return;
    }
    const contactId = target.crm_contact_id || target.customer_identifier || target.id;
    payout.mutate(
      { contactId, amount: amt, payoutChannel: channel, reference: reference || undefined },
      {
        onSuccess: () => onClose(),
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Payout failed.'),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !payout.isPending && onClose()}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <h3 className="text-base font-bold">Pay out credit</h3>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={payout.isPending}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-accent/20 px-3 py-2 text-sm">
              <p className="font-semibold">{target.customer_name || target.customer_identifier || 'Customer'}</p>
              <p className="text-xs text-muted-foreground">
                Available credit: {formatCurrency(available, target.currency)}
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
              <label className="text-xs font-semibold text-muted-foreground">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
              >
                {PAYOUT_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
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
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={payout.isPending}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={submit} disabled={payout.isPending}>
                {payout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
