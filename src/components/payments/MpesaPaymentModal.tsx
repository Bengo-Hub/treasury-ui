'use client';

import { Button } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { Banknote, Loader2, Phone } from 'lucide-react';
import { useState } from 'react';
import { PaymentModal } from './PaymentModal';
import type { PaymentDetails } from './types';

function mpesaPayload(details: PaymentDetails, phoneNumber: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    payment_method: 'mpesa',
    gateway: 'mpesa',
    amount: details.amount,
    currency: details.currency,
    reference_id: details.reference_id,
    reference_type: details.reference_type,
    source_service: details.source_service,
    phone_number: phoneNumber,
    redirect_url: details.redirect_url,
    button_text: details.button_text,
  };
  if (details.intent_id) body.intent_id = details.intent_id;
  return body;
}

function manualPayload(details: PaymentDetails): Record<string, unknown> {
  const body: Record<string, unknown> = { payment_method: 'manual' };
  if (details.intent_id) body.intent_id = details.intent_id;
  return body;
}

export function MpesaPaymentModal({
  details,
  onClose,
  onSuccess,
  embed = false,
}: {
  details: PaymentDetails;
  onClose: () => void;
  onSuccess?: (data: { checkout_request_id?: string }) => void;
  embed?: boolean;
}) {
  const [phone, setPhone] = useState(details.phone_number ?? '');
  const [loading, setLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState('');

  const formatAmount = () =>
    details.amount > 0
      ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: details.currency }).format(details.amount)
      : '—';

  const normalizePhone = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.startsWith('254')) return d;
    if (d.startsWith('0')) return '254' + d.slice(1);
    if (d.length <= 9) return '254' + d;
    return d;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = normalizePhone(phone);
    if (normalized.length < 12) {
      setError('Enter a valid M-Pesa phone number (e.g. 0712345678).');
      return;
    }
    if (!details.initiate_url) {
      setError('Payment link not configured (missing initiate_url).');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(details.initiate_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mpesaPayload(details, normalized)),
      });
      const data = await res.json().catch(() => ({}));
      if (data.checkout_request_id || data.status === 'processing') {
        if (embed) {
          sendToParent({ type: 'treasury:payment_initiated', intentId: details.intent_id || '', method: 'mpesa' });
          onSuccess?.(data);
          setError('');
          setLoading(false);
          onClose();
          return;
        }
        onSuccess?.(data);
        setError('');
        setLoading(false);
        onClose();
        if (data.redirect_url) window.location.href = data.redirect_url;
        return;
      }
      setError(data.message || 'Could not send M-Pesa prompt. Please try again.');
      if (embed) sendToParent({ type: 'treasury:payment_failed', intentId: details.intent_id || '', error: data.message || 'Could not send M-Pesa prompt' });
    } catch {
      setError('Network error. Please try again.');
      if (embed) sendToParent({ type: 'treasury:payment_failed', intentId: details.intent_id || '', error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePaidAtTill = async () => {
    if (!details.initiate_url) return;
    setManualLoading(true);
    setError('');
    try {
      const res = await fetch(details.initiate_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualPayload(details)),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        if (embed) {
          sendToParent({ type: 'treasury:payment_confirmed', intentId: details.intent_id || '', amount: details.amount, reference: details.reference_id, channel: 'manual' });
          onClose();
          return;
        }
        onClose();
        if (data.redirect_url) window.location.href = data.redirect_url;
        else if (details.redirect_url) window.location.href = details.redirect_url.startsWith('http') ? details.redirect_url : `${window.location.origin}${details.redirect_url}`;
        return;
      }
      setError(data.message || 'Could not confirm. Try again.');
      if (embed) sendToParent({ type: 'treasury:payment_failed', intentId: details.intent_id || '', error: data.message || 'Could not confirm' });
    } catch {
      setError('Network error. Please try again.');
      if (embed) sendToParent({ type: 'treasury:payment_failed', intentId: details.intent_id || '', error: 'Network error' });
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <PaymentModal title="Pay with M-Pesa" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">{formatAmount()}</span>
          </div>
          {(details.invoice_number || details.reference_id) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{details.invoice_number || details.reference_id}</span>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">M-Pesa phone number</label>
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          You will receive an M-Pesa prompt on your phone. Or pay at an M-Pesa till and confirm below.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Sending…' : `Pay ${formatAmount()} with M-Pesa`}
            </Button>
          </div>
          {details.initiate_url && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={handlePaidAtTill} disabled={manualLoading}>
              {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              I paid at till / agent
            </Button>
          )}
        </div>
      </form>
    </PaymentModal>
  );
}
