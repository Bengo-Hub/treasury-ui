'use client';

import { Button } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { CheckCircle2, Loader2, Phone, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PaymentModal } from './PaymentModal';
import type { PaymentDetails } from './types';

function momoPayload(details: PaymentDetails, phoneNumber: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    payment_method: 'mtn_momo',
    gateway: 'mtn_momo',
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

/** Derive the intent status URL from the initiate URL (…/intents/{id}/initiate → …/intents/{id}). */
function statusUrlFrom(initiateUrl?: string): string {
  if (!initiateUrl) return '';
  return initiateUrl.replace(/\/initiate(\?.*)?$/, '');
}

type Outcome = null | 'success' | 'failed';

/**
 * MTN Mobile Money payment modal — mirrors MpesaPaymentModal's push-then-poll shape (MTN's
 * "request to pay" is the same push-prompt UX as M-Pesa STK), minus the till/paybill "check now"
 * affordance, which has no MTN equivalent.
 */
export function MTNMoMoPaymentModal({
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
  const [error, setError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [outcomeMsg, setOutcomeMsg] = useState('');

  const statusUrl = statusUrlFrom(details.initiate_url);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settledRef = useRef(false);

  const formatAmount = () =>
    details.amount > 0
      ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: details.currency }).format(details.amount)
      : '—';

  // Uganda MSISDNs (256XXXXXXXXX); left permissive for other MTN markets.
  const normalizePhone = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.startsWith('256')) return d;
    if (d.startsWith('0')) return '256' + d.slice(1);
    if (d.length <= 9) return '256' + d;
    return d;
  };

  const markSuccess = useCallback((receipt?: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setOutcome('success');
    if (embed) {
      sendToParent({ type: 'treasury:payment_confirmed', intentId: details.intent_id || '', amount: details.amount, reference: receipt || details.reference_id, channel: 'mtn_momo' });
    }
    onSuccess?.({});
  }, [embed, details.intent_id, details.amount, details.reference_id, onSuccess]);

  const markFailed = useCallback((message: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setOutcome('failed');
    setOutcomeMsg(message);
    if (embed) {
      sendToParent({ type: 'treasury:payment_failed', intentId: details.intent_id || '', error: message });
    }
  }, [embed, details.intent_id]);

  const pollStatus = useCallback(async (): Promise<'pending' | 'success' | 'failed'> => {
    if (!statusUrl) return 'pending';
    try {
      const res = await fetch(statusUrl, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'succeeded') { markSuccess(data.provider_reference); return 'success'; }
      if (data.status === 'failed' || data.status === 'cancelled') {
        markFailed(data.message || 'The MTN Mobile Money payment was not completed. Please try again.');
        return 'failed';
      }
    } catch {
      // transient — keep polling
    }
    return 'pending';
  }, [statusUrl, markSuccess, markFailed]);

  useEffect(() => {
    if (!requestSent || outcome !== null) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(() => { void pollStatus(); }, 3000);
    void pollStatus();
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [requestSent, outcome, pollStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = normalizePhone(phone);
    if (normalized.length < 12) {
      setError('Enter a valid MTN Mobile Money number (e.g. 0771234567).');
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
        body: JSON.stringify(momoPayload(details, normalized)),
      });
      const data = await res.json().catch(() => ({}));
      if (data.checkout_request_id || data.status === 'processing' || data.status === 'pending') {
        if (embed) sendToParent({ type: 'treasury:payment_initiated', intentId: details.intent_id || '', method: 'mtn_momo' });
        onSuccess?.(data);
        setError('');
        settledRef.current = false;
        setOutcome(null);
        setRequestSent(true);
        return;
      }
      setError(data.message || data.error || 'Could not send MTN Mobile Money prompt. Please try again.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (outcome === 'success') {
    return (
      <PaymentModal title="Payment received" onClose={onClose} embed={embed}>
        <div className="space-y-4 text-center py-4">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Payment successful</p>
            <p className="text-xs text-muted-foreground">Your MTN Mobile Money payment of {formatAmount()} has been received.</p>
          </div>
          <Button type="button" onClick={onClose} className="w-full">Done</Button>
        </div>
      </PaymentModal>
    );
  }

  if (outcome === 'failed') {
    return (
      <PaymentModal title="Payment not completed" onClose={onClose} embed={embed}>
        <div className="space-y-4 text-center py-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Payment not completed</p>
            <p className="text-xs text-muted-foreground">{outcomeMsg || 'The MTN Mobile Money payment was not completed.'}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => { settledRef.current = false; setOutcome(null); setOutcomeMsg(''); setRequestSent(false); setError(''); }}
              className="w-full"
            >
              Try again
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </PaymentModal>
    );
  }

  if (requestSent) {
    return (
      <PaymentModal title="Pay with MTN Mobile Money" onClose={onClose} embed={embed}>
        <div className="space-y-4 text-center py-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Check your phone</p>
            <p className="text-xs text-muted-foreground">
              We sent an MTN Mobile Money prompt to {normalizePhone(phone)}. Approve it on your
              phone — this page updates automatically once it&apos;s confirmed.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" variant="outline" onClick={() => { setRequestSent(false); setError(''); }} disabled={loading}>
            Resend / change number
          </Button>
        </div>
      </PaymentModal>
    );
  }

  return (
    <PaymentModal title="Pay with MTN Mobile Money" onClose={onClose} embed={embed}>
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
          <label className="block text-sm font-medium text-foreground mb-1">MTN Mobile Money number</label>
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0771234567"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">You will receive an MTN Mobile Money prompt on your phone.</p>
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Sending…' : `Pay ${formatAmount()} with MTN`}
          </Button>
        </div>
      </form>
    </PaymentModal>
  );
}
