'use client';

import { Button } from '@/components/ui/base';
import { ExternalLink, Loader2, Banknote } from 'lucide-react';
import { useState } from 'react';
import { PaymentModal } from './PaymentModal';
import { PaymentQRCode } from './PaymentQRCode';
import type { PaymentDetails } from './types';

function buildInitiatePayload(
  details: PaymentDetails,
  paymentMethod: string,
  extra: { customer_email?: string; phone_number?: string } = {}
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    payment_method: paymentMethod,
    amount: details.amount,
    currency: details.currency,
    reference_id: details.reference_id,
    reference_type: details.reference_type,
    source_service: details.source_service,
    redirect_url: details.redirect_url,
    button_text: details.button_text,
    ...extra,
  };
  if (details.intent_id) body.intent_id = details.intent_id;
  if (paymentMethod === 'paystack') body.gateway = 'paystack';
  else if (paymentMethod === 'mpesa') body.gateway = 'mpesa';
  else if (paymentMethod === 'cod') body.gateway = 'cod';
  return body;
}

export function PaystackPaymentModal({
  details,
  onClose,
  onSuccess,
}: {
  details: PaymentDetails;
  onClose: () => void;
  onSuccess?: (data: { authorization_url?: string }) => void;
}) {
  const [email, setEmail] = useState(details.customer_email ?? '');
  const [loading, setLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);

  const formatAmount = () =>
    details.amount > 0
      ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: details.currency }).format(details.amount)
      : '—';

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
        body: JSON.stringify(buildInitiatePayload(details, 'paystack', { customer_email: email || undefined })),
      });
      const data = await res.json().catch(() => ({}));
      if (data.authorization_url) {
        onSuccess?.(data);
        setAuthorizationUrl(data.authorization_url);
        setError('');
        return;
      }
      setError(data.message || 'Could not start payment. Please try again.');
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
        body: JSON.stringify(buildInitiatePayload(details, 'manual')),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success !== false)) {
        onClose();
        if (data.redirect_url) window.location.href = data.redirect_url;
        else if (details.redirect_url) window.location.href = details.redirect_url.startsWith('http') ? details.redirect_url : `${window.location.origin}${details.redirect_url}`;
        return;
      }
      setError(data.message || 'Could not confirm. Try again.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setManualLoading(false);
    }
  };

  const showQR = !!authorizationUrl;

  return (
    <PaymentModal title="Pay with Paystack" onClose={onClose}>
      <div className="space-y-4">
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
