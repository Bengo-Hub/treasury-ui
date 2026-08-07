'use client';

import { Button } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { Landmark, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { PaymentModal } from './PaymentModal';
import type { PaymentDetails } from './types';

/**
 * Bank transfer payment modal — mirrors CodPaymentModal's manual-confirmation shape (see
 * gateways.BankTransferGateway: no external API, the customer transfers externally and an agent
 * confirms receipt). Covers Equity Bank Uganda and any other bank a tenant configures; the actual
 * account details (name/number) are shown via the tenant's payment-account settings elsewhere,
 * not duplicated here since this modal doesn't have gateway-config context.
 */
export function BankTransferPaymentModal({
  details,
  onClose,
  onConfirm,
  embed = false,
}: {
  details: PaymentDetails;
  onClose: () => void;
  onConfirm?: () => void;
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
    if (!details.initiate_url) {
      if (embed) sendToParent({ type: 'treasury:payment_confirmed', intentId: details.intent_id || '', amount: details.amount, reference: details.reference_id, channel: 'bank_transfer' });
      onConfirm?.();
      onClose();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(details.initiate_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: 'bank_transfer',
          payment_method: 'bank_transfer',
          intent_id: details.intent_id,
          amount: details.amount,
          currency: details.currency,
          reference_id: details.reference_id,
          reference_type: details.reference_type,
          source_service: details.source_service,
          redirect_url: details.redirect_url,
          button_text: details.button_text,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.intent_id)) {
        if (embed) {
          sendToParent({ type: 'treasury:payment_confirmed', intentId: details.intent_id || '', amount: details.amount, reference: details.reference_id, channel: 'bank_transfer' });
          onConfirm?.();
          onClose();
          return;
        }
        onConfirm?.();
        onClose();
        if (data.redirect_url) window.location.href = data.redirect_url;
        return;
      }
      setError(data.message || 'Could not confirm. Please try again.');
      if (embed) sendToParent({ type: 'treasury:payment_failed', intentId: details.intent_id || '', error: data.message || 'Could not confirm' });
    } catch {
      setError('Network error. Please try again.');
      if (embed) sendToParent({ type: 'treasury:payment_failed', intentId: details.intent_id || '', error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaymentModal title="Pay via Bank Transfer" onClose={onClose} embed={embed}>
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount to transfer</span>
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
          Transfer this amount to the bank account provided by the seller (include the reference
          above), then confirm below. The seller will verify receipt.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Landmark className="mr-1 h-4 w-4" />}
            I&apos;ve Transferred the Funds
          </Button>
        </div>
      </div>
    </PaymentModal>
  );
}
