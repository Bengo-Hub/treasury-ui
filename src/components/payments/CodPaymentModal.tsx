'use client';

import { Button } from '@/components/ui/base';
import { Banknote } from 'lucide-react';
import { useState } from 'react';
import { PaymentModal } from './PaymentModal';
import type { PaymentDetails } from './types';

export function CodPaymentModal({
  details,
  onClose,
  onConfirm,
}: {
  details: PaymentDetails;
  onClose: () => void;
  onConfirm?: () => void;
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
          gateway: 'cod',
          payment_method: 'cash',
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
        onConfirm?.();
        onClose();
        if (data.redirect_url) window.location.href = data.redirect_url;
        return;
      }
      setError(data.message || 'Could not confirm. Please try again.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaymentModal title="Cash on Delivery" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount to pay on delivery</span>
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
          Confirm that you will pay this amount when your order is delivered. No online payment is required now.
        </p>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            <Banknote className="h-4 w-4" />
            Confirm Cash on Delivery
          </Button>
        </div>
      </div>
    </PaymentModal>
  );
}
