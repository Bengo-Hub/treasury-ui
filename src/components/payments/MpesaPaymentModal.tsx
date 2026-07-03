'use client';

import { Button } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { Banknote, CheckCircle2, Loader2, Phone, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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

/** Derive the intent status URL from the initiate URL (…/intents/{id}/initiate → …/intents/{id}). */
function statusUrlFrom(initiateUrl?: string): string {
  if (!initiateUrl) return '';
  return initiateUrl.replace(/\/initiate(\?.*)?$/, '');
}

type Outcome = null | 'success' | 'failed';

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
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  // After the STK push is sent we show a "check your phone" state and actively POLL the treasury
  // status endpoint so the modal reflects the real outcome (paid / cancelled / failed) instead of
  // spinning forever. The old build relied on an embedder poll that never existed.
  const [stkSent, setStkSent] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [outcomeMsg, setOutcomeMsg] = useState('');

  const statusUrl = statusUrlFrom(details.initiate_url);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settledRef = useRef(false);

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

  const markSuccess = useCallback((receipt?: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setOutcome('success');
    if (embed) {
      sendToParent({ type: 'treasury:payment_confirmed', intentId: details.intent_id || '', amount: details.amount, reference: receipt || details.reference_id, channel: 'mpesa' });
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

  // Poll the intent status once; returns the terminal state (or 'pending').
  const pollStatus = useCallback(async (): Promise<'pending' | 'success' | 'failed'> => {
    if (!statusUrl) return 'pending';
    try {
      const res = await fetch(statusUrl, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'succeeded') { markSuccess(data.mpesa_receipt); return 'success'; }
      if (data.status === 'failed' || data.status === 'cancelled') {
        markFailed(data.message || 'The M-Pesa payment was not completed. Please try again.');
        return 'failed';
      }
    } catch {
      // transient — keep polling
    }
    return 'pending';
  }, [statusUrl, markSuccess, markFailed]);

  // Start/stop polling while waiting for the STK outcome.
  useEffect(() => {
    if (!stkSent || outcome !== null) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    // Poll every 3s.
    pollRef.current = setInterval(() => { void pollStatus(); }, 3000);
    void pollStatus();
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [stkSent, outcome, pollStatus]);

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
        if (embed) sendToParent({ type: 'treasury:payment_initiated', intentId: details.intent_id || '', method: 'mpesa' });
        onSuccess?.(data);
        setError('');
        settledRef.current = false;
        setOutcome(null);
        // Show the "check your phone" state; the poll effect flips it to the real outcome.
        setStkSent(true);
        return;
      }
      setError(data.message || data.error || 'Could not send M-Pesa prompt. Please try again.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // "I already paid at till / paybill" — query treasury for a matching C2B payment and settle it.
  // Never closes the modal automatically; the user can keep checking.
  const handleCheckTill = async () => {
    if (!statusUrl) return;
    setChecking(true);
    setError('');
    try {
      const res = await fetch(`${statusUrl}/check-till`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent_id: details.intent_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'succeeded' || data.matched === true) {
        markSuccess(data.mpesa_receipt);
        return;
      }
      setError(data.message || 'No matching M-Pesa payment found yet. If you have paid, wait a moment and check again.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  // Terminal success card.
  if (outcome === 'success') {
    return (
      <PaymentModal title="Payment received" onClose={onClose} embed={embed}>
        <div className="space-y-4 text-center py-4">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Payment successful</p>
            <p className="text-xs text-muted-foreground">Your M-Pesa payment of {formatAmount()} has been received.</p>
          </div>
          <Button type="button" onClick={onClose} className="w-full">Done</Button>
        </div>
      </PaymentModal>
    );
  }

  // Terminal failed / cancelled card — shows the exact reason and lets the user retry.
  if (outcome === 'failed') {
    return (
      <PaymentModal title="Payment not completed" onClose={onClose} embed={embed}>
        <div className="space-y-4 text-center py-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Payment not completed</p>
            <p className="text-xs text-muted-foreground">{outcomeMsg || 'The M-Pesa payment was not completed.'}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => { settledRef.current = false; setOutcome(null); setOutcomeMsg(''); setStkSent(false); setError(''); }}
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

  if (stkSent) {
    return (
      <PaymentModal title="Pay with M-Pesa" onClose={onClose} embed={embed}>
        <div className="space-y-4 text-center py-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Check your phone</p>
            <p className="text-xs text-muted-foreground">
              We sent an M-Pesa prompt to {normalizePhone(phone)}. Enter your PIN to
              complete the payment — this page updates automatically once it&apos;s confirmed.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setStkSent(false); setError(''); }} disabled={loading}>
              Resend / change number
            </Button>
            {statusUrl && (
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={handleCheckTill} disabled={checking}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                I already paid at till / paybill — check now
              </Button>
            )}
          </div>
        </div>
      </PaymentModal>
    );
  }

  return (
    <PaymentModal title="Pay with M-Pesa" onClose={onClose} embed={embed}>
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
          {statusUrl && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={handleCheckTill} disabled={checking}>
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              I paid at till / paybill — check now
            </Button>
          )}
        </div>
      </form>
    </PaymentModal>
  );
}
