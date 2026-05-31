'use client';

import { Button } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { ExternalLink, Loader2, Banknote } from 'lucide-react';
import { useState } from 'react';
import { PaymentModal } from './PaymentModal';
import { PaymentQRCode } from './PaymentQRCode';
import type { PaymentDetails } from './types';

const TREASURY_UI_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_UI_URL) ||
  'https://books.codevertexitsolutions.com';

// Paystack Kenya fee: 1.5% of transaction amount, capped at KES 2,000.
// International cards carry an additional KES 100 flat fee (not applied here — local only).
function calcPaystackFee(amount: number): number {
  const fee = amount * 0.015;
  return Math.ceil(Math.min(fee, 2000));
}

// In embed mode the iframe must redirect through the treasury-ui success page so it can
// fire treasury:payment_confirmed via postMessage to the outer TreasuryPaymentModal.
// Without embed=true in the return_url, the success page sends no postMessage and the
// onPaymentConfirmed callback never fires.
function buildEmbedReturnUrl(intentId: string, amount: number): string {
  return `${TREASURY_UI_URL}/pay/success?embed=true&intent_id=${encodeURIComponent(intentId)}&amount=${amount}&channel=paystack`;
}

function buildInitiatePayload(
  details: PaymentDetails,
  paymentMethod: string,
  transactionFee: number,
  embed: boolean,
  extra: { customer_email?: string; phone_number?: string } = {}
): Record<string, unknown> {
  // embed mode: override return_url to the treasury-ui success page with embed=true
  // so the success page can send treasury:payment_confirmed postMessage to the parent modal.
  const returnUrl = embed && details.intent_id
    ? buildEmbedReturnUrl(details.intent_id, details.amount)
    : details.redirect_url;

  const body: Record<string, unknown> = {
    payment_method: paymentMethod,
    amount: details.amount,
    currency: details.currency,
    reference_id: details.reference_id,
    reference_type: details.reference_type,
    source_service: details.source_service,
    return_url: returnUrl,
    button_text: details.button_text,
    ...extra,
  };
  if (details.intent_id) body.intent_id = details.intent_id;
  if (paymentMethod === 'paystack') {
    body.gateway = 'paystack';
    if (transactionFee > 0) body.transaction_fee = transactionFee;
  } else if (paymentMethod === 'mpesa') {
    body.gateway = 'mpesa';
  } else if (paymentMethod === 'cod') {
    body.gateway = 'cod';
  }
  return body;
}

export function PaystackPaymentModal({
  details,
  onClose,
  onSuccess,
  embed = false,
}: {
  details: PaymentDetails;
  onClose: () => void;
  onSuccess?: (data: { authorization_url?: string }) => void;
  embed?: boolean;
}) {
  const [email, setEmail] = useState(details.customer_email ?? '');
  const [loading, setLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);

  const transactionFee = details.amount > 0 ? calcPaystackFee(details.amount) : 0;
  const grandTotal = Math.ceil(details.amount + transactionFee);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: details.currency || 'KES' }).format(n);

  const formatAmount = () => (details.amount > 0 ? fmt(grandTotal) : '—');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!details.initiate_url) {
      setError('Payment link not configured (missing initiate_url).');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(details.initiate_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildInitiatePayload(details, 'paystack', transactionFee, embed, { customer_email: email || undefined })),
      });
      const data = await res.json().catch(() => ({}));
      if (data.authorization_url) {
        if (embed) sendToParent({ type: 'treasury:payment_initiated', intentId: details.intent_id || '', method: 'paystack' });
        onSuccess?.(data);
        setAuthorizationUrl(data.authorization_url);
        setError('');
        return;
      }
      setError(data.message || 'Could not start payment. Please try again.');
      if (embed) sendToParent({ type: 'treasury:payment_failed', intentId: details.intent_id || '', error: data.message || 'Could not start payment' });
    } catch {
      setError('Network error. Please try again.');
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
        body: JSON.stringify(buildInitiatePayload(details, 'manual', 0, false)),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success !== false)) {
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

  const showQR = !!authorizationUrl;

  return (
    <PaymentModal title="Pay with Paystack" onClose={onClose} embed={embed}>
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order total</span>
            <span>{fmt(details.amount)}</span>
          </div>
          {transactionFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paystack fee (1.5%)</span>
              <span>{fmt(transactionFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-border pt-2 mt-1">
            <span className="font-semibold">Total payable</span>
            <span className="font-bold text-primary">{fmt(grandTotal)}</span>
          </div>
          {(details.invoice_number || details.reference_id) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{details.invoice_number || details.reference_id}</span>
            </div>
          )}
        </div>

        {!showQR ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              You will be redirected to Paystack or can scan the QR after clicking Pay.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  {loading ? 'Starting…' : `Pay ${formatAmount()}`}
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
        ) : (
          <div className="space-y-4">
            <PaymentQRCode value={authorizationUrl} size={200} />
            <p className="text-xs text-muted-foreground text-center">Scan to pay on your phone, or open in browser below.</p>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={() => window.location.href = authorizationUrl} className="w-full">
                <ExternalLink className="h-4 w-4" />
                Open Paystack in browser
              </Button>
              <Button type="button" variant="outline" onClick={handlePaidAtTill} disabled={manualLoading} className="w-full">
                {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                I already paid at till / agent
              </Button>
            </div>
          </div>
        )}
      </div>
    </PaymentModal>
  );
}
