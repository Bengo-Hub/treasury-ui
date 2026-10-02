'use client';

import { Button } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { CheckCircle2, Copy, ExternalLink, Loader2, Phone, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PaymentModal } from './PaymentModal';
import type { PaymentDetails } from './types';

/** PayHero rails the payer finishes outside a phone prompt. */
export type PayHeroCheckoutMethod = 'payhero_card' | 'payhero_bank' | 'payhero_offline';

const TITLES: Record<PayHeroCheckoutMethod, string> = {
  payhero_card: 'Pay by card',
  payhero_bank: 'Pay by bank deposit',
  payhero_offline: 'Pay with M-Pesa Paybill',
};

type Outcome = null | 'success' | 'failed';

function statusUrlFrom(initiateUrl?: string): string {
  if (!initiateUrl) return '';
  return initiateUrl.replace(/\/initiate(\?.*)?$/, '');
}

/**
 * Card hosted checkout, bank deposit and offline paybill on PayHero. Treasury starts the payment
 * (initiate), then the payer completes it on PayHero's checkout page, at their bank, or through
 * the M-Pesa Paybill menu with the account number shown; this modal polls the intent until it
 * settles (treasury confirms every PayHero result with PayHero before marking it paid).
 */
export function PayHeroCheckoutModal({
  method,
  details,
  onClose,
  embed = false,
}: {
  method: PayHeroCheckoutMethod;
  details: PaymentDetails;
  onClose: () => void;
  embed?: boolean;
}) {
  const needsPhone = method === 'payhero_offline';
  const [phone, setPhone] = useState(details.phone_number ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [instructions, setInstructions] = useState<Record<string, any> | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [outcomeMsg, setOutcomeMsg] = useState('');
  const settledRef = useRef(false);
  const statusUrl = statusUrlFrom(details.initiate_url);

  const formatAmount = () =>
    details.amount > 0 ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: details.currency }).format(details.amount) : '';

  const start = useCallback(async () => {
    setError('');
    if (!details.initiate_url) {
      setError('Payment link not configured (missing initiate_url).');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (needsPhone && digits.length < 9) {
      setError('Enter the M-Pesa number you will pay from.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(details.initiate_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: method,
          intent_id: details.intent_id,
          customer_email: details.customer_email,
          phone_number: needsPhone ? digits : undefined,
          // Where PayHero's card checkout sends the payer back to (stored on the intent).
          return_url: details.redirect_url,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === 'failed') {
        setError(data.message || data.error || 'Could not start the payment. Please try another method.');
        return;
      }
      if (embed) sendToParent({ type: 'treasury:payment_initiated', intentId: details.intent_id || '', method });
      if (method === 'payhero_card' && data.authorization_url) {
        setCheckoutUrl(data.authorization_url);
        if (!embed) {
          window.location.href = data.authorization_url;
          return;
        }
        window.open(data.authorization_url, '_blank', 'noopener');
      }
      const key = method === 'payhero_offline' ? 'offline' : 'bank';
      if (data.instructions?.[key]) setInstructions(data.instructions[key]);
      setStarted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [details, embed, method, needsPhone, phone]);

  // Card and bank start straight away; the paybill first asks for the phone.
  useEffect(() => {
    if (!needsPhone) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback((ok: boolean, msg?: string, receipt?: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setOutcome(ok ? 'success' : 'failed');
    setOutcomeMsg(msg ?? '');
    if (!embed) return;
    if (ok) {
      sendToParent({ type: 'treasury:payment_confirmed', intentId: details.intent_id || '', amount: details.amount, reference: receipt || details.reference_id, channel: method });
    } else {
      sendToParent({ type: 'treasury:payment_failed', intentId: details.intent_id || '', error: msg || 'Payment not completed' });
    }
  }, [details.amount, details.intent_id, details.reference_id, embed, method]);

  useEffect(() => {
    if (!started || outcome !== null || !statusUrl) return;
    const poll = async () => {
      try {
        const res = await fetch(statusUrl);
        const data = await res.json().catch(() => ({}));
        if (data.status === 'succeeded') finish(true, undefined, data.provider_reference);
        else if (data.status === 'failed' || data.status === 'cancelled') finish(false, data.message || 'The payment was not completed.');
      } catch {
        // transient: keep polling
      }
    };
    void poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [started, outcome, statusUrl, finish]);

  const copy = (v: string) => { void navigator.clipboard?.writeText(v); };

  if (outcome) {
    return (
      <PaymentModal title={outcome === 'success' ? 'Payment received' : 'Payment not completed'} onClose={onClose} embed={embed}>
        <div className="space-y-4 text-center py-4">
          {outcome === 'success' ? <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" /> : <XCircle className="h-12 w-12 text-destructive mx-auto" />}
          <p className="text-sm text-muted-foreground">
            {outcome === 'success' ? `Your payment of ${formatAmount()} has been received.` : outcomeMsg}
          </p>
          <Button type="button" onClick={onClose} className="w-full">{outcome === 'success' ? 'Done' : 'Close'}</Button>
        </div>
      </PaymentModal>
    );
  }

  return (
    <PaymentModal title={TITLES[method]} onClose={onClose} embed={embed}>
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 flex justify-between text-sm">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold">{formatAmount()}</span>
        </div>

        {needsPhone && !started && (
          <form onSubmit={(e) => { e.preventDefault(); void start(); }} className="space-y-3">
            <label className="block text-sm font-medium text-foreground">M-Pesa number you will pay from</label>
            <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" className="flex-1 bg-transparent text-sm outline-none" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get paybill details'}
            </Button>
          </form>
        )}

        {!needsPhone && !started && loading && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}

        {started && method === 'payhero_offline' && instructions && (
          <div className="space-y-2 text-sm">
            <p>On your phone open M-Pesa, Lipa na M-Pesa, Pay Bill, and enter:</p>
            {[['Business number', instructions.paybill], ['Account number', instructions.account_number]].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-semibold flex items-center gap-2">
                  {value}
                  <button type="button" onClick={() => copy(String(value))} aria-label={`Copy ${label}`}><Copy className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Amount: {formatAmount()}. This page updates once the payment arrives.</p>
          </div>
        )}

        {started && method === 'payhero_bank' && (
          <div className="space-y-2 text-sm">
            {instructions?.manual_payment && <p>{String(instructions.manual_payment)}</p>}
            {instructions?.bank_info && (
              <div className="rounded-lg border p-3 space-y-1">
                {Object.entries(instructions.bank_info as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{k.replace(/_/g, ' ')}</span>
                    <span className="font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Deposit exactly {formatAmount()}. This page updates once the bank confirms it.</p>
          </div>
        )}

        {started && method === 'payhero_card' && (
          <div className="space-y-2 text-sm text-center">
            <p>Complete the card payment on the secure checkout page.</p>
            {checkoutUrl && (
              <Button type="button" variant="outline" onClick={() => window.open(checkoutUrl, '_blank', 'noopener')}>
                <ExternalLink className="h-4 w-4 mr-1" /> Open checkout page
              </Button>
            )}
            <p className="text-xs text-muted-foreground">This page updates once the payment is confirmed.</p>
          </div>
        )}

        {started && <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>Cancel</Button>
      </div>
    </PaymentModal>
  );
}
