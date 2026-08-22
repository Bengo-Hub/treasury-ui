'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { usePlatformEquityObligations } from '@/hooks/use-platform-analytics';
import { formatCurrency } from '@/lib/utils/currency';
import { HandCoins, Info } from 'lucide-react';

interface Props {
  from?: string;
  to?: string;
}

/**
 * EquityObligationsPanel answers the platform owner's real question: "how much is available to
 * declare as dividends right now, and how much is already spoken for?"
 *
 * It never fabricates a dividend-availability figure. `available_for_dividend` only renders when
 * the backend actually resolved exactly one umbrella dividend holder for the period; otherwise
 * this shows an explicit "not currently resolvable" state rather than a misleading "0.00" that
 * would look like a real (empty) answer. Likewise `accrued_non_dividend_obligations` only renders
 * when the API includes it (the equity handler being wired) — its absence is treated as "unknown",
 * never silently coerced to zero.
 */
export function EquityObligationsPanel({ from, to }: Props) {
  const { data, isLoading, isError } = usePlatformEquityObligations(from, to);
  const currency = data?.currency || 'KES';

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Dividend Availability</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          How much is available to declare as dividends right now, and how much is already spoken for.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="animate-pulse h-5 bg-muted rounded w-full" />
            <div className="animate-pulse h-5 bg-muted rounded w-3/4" />
            <div className="animate-pulse h-6 bg-muted rounded w-1/2" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load equity obligations. Check your connection and try again.
          </div>
        ) : (
          <div className="space-y-3">
            {data?.accrued_non_dividend_obligations !== undefined && (
              <ObligationRow
                label="Accrued non-dividend obligations"
                hint="Owed to royalty / revenue-share holders but not yet paid out — comes out of net profit before any dividend can be considered."
                value={formatCurrency(parseFloat(data.accrued_non_dividend_obligations), currency)}
              />
            )}
            <ObligationRow
              label="Paid to non-dividend holders"
              hint="Already disbursed this period to royalty / revenue-share holders — already spoken for, not available for dividends."
              value={formatCurrency(parseFloat(data?.paid_to_non_dividend_holders ?? '0'), currency)}
            />
            <div className="border-t border-border pt-3">
              {data?.available_for_dividend !== undefined ? (
                <ObligationRow
                  label={`Available for dividend${data.dividend_umbrella_holder_name ? ` — ${data.dividend_umbrella_holder_name}` : ''}`}
                  hint="Net profit remaining after non-dividend obligations, resolved for the single umbrella dividend holder found this period."
                  value={formatCurrency(parseFloat(data.available_for_dividend), currency)}
                  emphasis
                />
              ) : (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Available for dividend — not currently resolvable. This only appears when exactly one umbrella
                    dividend holder is configured for the period; it is never shown as a fabricated zero.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ObligationRow({ label, value, hint, emphasis }: { label: string; value: string; hint?: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4" title={hint}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={emphasis ? 'text-lg font-bold' : 'text-sm font-semibold'}>{value}</span>
    </div>
  );
}
