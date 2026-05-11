'use client';

import { Button } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { Loader2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { PaymentModal } from './PaymentModal';
import type { PaymentDetails } from './types';

export function WalletPaymentModal({
  details,
  onClose,
  embed = false,
}: {
  details: PaymentDetails;
  onClose: () => void;
  embed?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatAmount = () =>
    details.amount > 0
      ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: details.currency }).format(details.amount)
      : '—';

  const handleConfirm = async () => {
    setError('');
    setLoading(true);

    if (embed) {
      // Notify parent to handle wallet debit — parent has the auth token
      sendToParent({
        type: 'treasury:wallet_payment_request',
        intentId: details.intent_id || '',
        amount: details.amount,
        reference: details.reference_id,
        channel: 'wallet',
      });
      // Wait for parent to respond via treasury:payment_confirmed or treasury:payment_failed
      setLoading(false);
      onClose();
      return;
    }

    // Standalone (non-embed) — call initiate endpoint directly
    if (!details.initiate_url) {
      setError('Cannot process wallet payment: missing initiate URL');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(details.initiate_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: 'wallet',
          payment_method: 'wallet',
          intent_id: details.intent_id,
          amount: details.amount,
          currency: details.currency,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.intent_id)) {
        onClose();
        if (data.redirect_url) window.location.href = data.redirect_url;
        return;
      }
      setError(data.message || 'Could not process wallet payment. Please try again.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaymentModal title="Pay with Wallet" onClose={onClose} embed={embed}>
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount to deduct from wallet</span>
            <span className="font-semibold">{formatAmount()}</span>
          </div>
          {(details.invoice_number || details.reference_id) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{details.invoice_number || details.reference_id}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          The amount will be instantly deducted from your wallet balance.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wallet className="mr-1 h-4 w-4" />}
            Confirm Wallet Payment
          </Button>
        </div>
      </div>
    </PaymentModal>
  );
}
