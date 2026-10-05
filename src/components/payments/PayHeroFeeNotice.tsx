'use client';

import { payheroApi } from '@/lib/api/payhero';
import { useQuery } from '@tanstack/react-query';
import type { PaymentDetails } from './types';

/**
 * Shows the PayHero fee when the platform has the customer bear it, so the amount on the page
 * matches the M-Pesa prompt. Nothing renders when the merchant bears it or no tariff is set; the
 * server prices it with the same rule as the payment itself.
 */
export function PayHeroFeeNotice({ details }: { details: PaymentDetails }) {
  const quote = useQuery({
    queryKey: ['payhero-fee', details.tenant, details.amount, details.currency, details.reference_type],
    queryFn: () => payheroApi.feeQuote(details.tenant, details.amount, details.currency || 'KES', details.reference_type),
    enabled: !!details.tenant && details.amount > 0,
    staleTime: 60_000,
    retry: false,
  });
  const q = quote.data;
  if (!q || Number(q.fee) <= 0) return null;
  const fmt = (v: string) => `${q.currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Gateway fee (the prompt asks for {fmt(q.total)})</span>
      <span className="font-semibold">{fmt(q.fee)}</span>
    </div>
  );
}
