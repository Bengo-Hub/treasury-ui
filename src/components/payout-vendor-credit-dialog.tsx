'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { usePayoutVendorCredit } from '@/hooks/use-arpa';
import { Loader2 } from 'lucide-react';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

const PAYOUT_CHANNELS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'mpesa_b2c', label: 'M-Pesa B2C' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
];

interface PayoutVendorCreditDialogProps {
  open: boolean;
  onClose: () => void;
  tenant: string;
  /** Display name shown in the dialog header. */
  name?: string;
  /** AP ledger vendor UUID, when known. */
  vendorId?: string;
  /** Free-form identifier (vendor name) when no vendor UUID exists. */
  vendorIdentifier?: string;
  /** Available credit (the absolute value of a negative balance_owed), pre-fills the amount. */
  creditAvailable?: number;
  currency?: string;
}

/**
 * PayoutVendorCreditDialog pays out some/all of a supplier's existing stored credit (a negative
 * balance_owed — from an overpayment or a purchase-return credit note), via
 * usePayoutVendorCredit (POST /ap/vendors/{vendorID}/payout-credit). Posts DR the chosen channel
 * / CR Accounts Payable — the vendor-side mirror of ReceivePaymentModal.
 */
export function PayoutVendorCreditDialog(props: PayoutVendorCreditDialogProps) {
  const { open, onClose, tenant, name, creditAvailable } = props;
  const payout = usePayoutVendorCredit(tenant);

  const [amount, setAmount] = useState(creditAvailable ? creditAvailable.toFixed(2) : '');
  const [channel, setChannel] = useState('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const amt = amount.trim();
    if (!amt || Number.isNaN(Number(amt)) || Number(amt) <= 0) {
      setError('Enter a valid payout amount.');
      return;
    }
    setError('');

    const vendorKey = props.vendorId || props.vendorIdentifier;
    if (!vendorKey) {
      setError('No vendor identifier available.');
      return;
    }

    payout.mutate(
      {
        vendorKey,
        body: {
          amount: amt,
          payout_channel: channel,
          reference: reference.trim() || undefined,
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !payout.isPending && onClose()}>
      <DialogContent
        title="Pay Out Credit"
        description={`Pay out stored credit${name ? ` held for ${name}` : ''}.`}
        onClose={onClose}
        className="max-w-md"
      >
        <div className="space-y-4">
          {creditAvailable != null && (
            <div className="rounded-lg bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
              Credit available: <span className="font-bold text-emerald-600">{creditAvailable.toFixed(2)} {props.currency}</span>
            </div>
          )}

          <FormField label="Amount" required description="How much of the stored credit to pay out.">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </FormField>

          <FormField label="Payout channel" required>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputClass}>
              {PAYOUT_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Reference" description="e.g. M-Pesa code, cheque no.">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </FormField>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={payout.isPending}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={submit} disabled={payout.isPending}>
              {payout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Pay Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
