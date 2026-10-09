'use client';

import { payheroApi } from '@/lib/api/payhero';
import { useQuery } from '@tanstack/react-query';
import { PAYHERO_UNAVAILABLE_MESSAGE, payingIntentId, type PaymentDetails } from './types';

/**
 * Shows the PayHero fee when the customer bears it, so the amount on the page matches the M-Pesa
 * prompt, and warns before the prompt when PayHero would refuse it (the business's service wallet
 * cannot pay the channel fee). Nothing renders when the business bears the fee (its own platform
 * and personal invoices never surcharge the payer) or no tariff is set; the server prices it with
 * the same rules as the payment itself, for this intent.
 */
export function PayHeroFeeNotice({ details }: { details: PaymentDetails }) {
  const intentId = payingIntentId(details);
  const quote = useQuery({
    queryKey: ['payhero-fee', details.tenant, details.amount, details.currency, details.reference_type, intentId],
    queryFn: () => payheroApi.feeQuote(details.tenant, details.amount, details.currency || 'KES', details.reference_type, intentId),
    enabled: !!details.tenant && details.amount > 0,
    staleTime: 60_000,
    retry: false,
  });
  const q = quote.data;
  if (!q) return null;
  if (q.available === false) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {PAYHERO_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  if (Number(q.fee) <= 0) return null;
  const fmt = (v: string) => `${q.currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Gateway fee (the prompt asks for {fmt(q.total)})</span>
      <span className="font-semibold">{fmt(q.fee)}</span>
    </div>
  );
}
