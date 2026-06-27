'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { formatCurrency } from '@/lib/utils/currency';
import { ExternalLink, Wallet } from 'lucide-react';

/** Shared shape across the two PlatformBalance type defs (gateways + platform-payouts). */
interface BalanceLike {
  currency?: string;
  balance?: number | string;
  available?: number | string;
  pending_balance?: number | string;
  pending?: number | string;
  /** Per-tenant payable the platform collected on behalf of tenants. */
  owed_to_tenants?: number | string;
}

function num(v: number | string | undefined): number {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n as number) ? (n as number) : 0;
}

/**
 * PaystackBalanceCard — the platform's real payable position. Shows three figures:
 *  - **Available** for payouts (settled balance),
 *  - **Pending** (in-settlement, Paystack T+1),
 *  - **Owed to tenants** (per-tenant payable collected on behalf — shown when the API provides it).
 *
 * Reused by the Equity and Platform Treasury (payouts) pages so the position is presented
 * uniformly. Codes defensively: falls back to `balance`/`pending_balance` when the split
 * fields aren't present yet.
 */
export function PaystackBalanceCard({
  balance,
  loading,
  className,
}: {
  balance: BalanceLike | undefined;
  loading?: boolean;
  className?: string;
}) {
  const currency = balance?.currency ?? 'KES';
  const available = num(balance?.available ?? balance?.balance);
  const pending = num(balance?.pending ?? balance?.pending_balance);
  // Only render the third figure when the backend actually returns it.
  const hasOwed = balance?.owed_to_tenants !== undefined && balance?.owed_to_tenants !== null;
  const owed = num(balance?.owed_to_tenants);
  const unavailable = !loading && !balance;

  return (
    <Card className={className}>
      <CardHeader className="bg-transparent border-none">
        <h3 className="font-bold flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Paystack Balance
        </h3>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Available — the headline figure */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
          <p className="text-xs opacity-70 mb-1">Available for Payouts</p>
          {loading ? (
            <div className="h-9 w-40 bg-primary-foreground/10 animate-pulse rounded-md" />
          ) : unavailable ? (
            <p className="text-sm opacity-70">Unable to fetch balance</p>
          ) : (
            <p className="text-3xl font-black">{formatCurrency(available, currency)}</p>
          )}
        </div>

        {/* Pending + Owed — supporting figures as capsule rows */}
        {!loading && !unavailable && (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-border bg-accent/5 px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">Pending (in settlement)</span>
              <span className="text-sm font-bold text-amber-600">{formatCurrency(pending, currency)}</span>
            </div>
            {hasOwed && (
              <div className="flex items-center justify-between rounded-xl border border-border bg-accent/5 px-4 py-2.5">
                <span className="text-xs font-medium text-muted-foreground">Owed to tenants</span>
                <span className="text-sm font-bold text-destructive">{formatCurrency(owed, currency)}</span>
              </div>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full text-xs text-muted-foreground h-8"
          onClick={() => window.open('https://dashboard.paystack.com', '_blank')}
        >
          View on Paystack <ExternalLink className="h-3 w-3 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
