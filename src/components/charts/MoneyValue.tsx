'use client';

import { Info } from 'lucide-react';
import { formatCompactCurrency, formatCurrency } from '@/lib/utils/currency';

/**
 * MoneyValue — the single reusable way to render a monetary figure in constrained space (dashboard
 * & report KPI tiles). It shows the amount COMPACTLY (KES 1.5M / 6B / 14.4K) so a tile never
 * truncates a long number, and — only when the amount was abbreviated — an info icon whose hover
 * tooltip reveals the exact figure. Amounts under 1,000 render in full with no icon.
 *
 * Centralises the compact-vs-full logic so every surface behaves identically (memory: reusable
 * centralized logic — never re-format money per page).
 */
export function MoneyValue({
  amount,
  currency = 'KES',
  className,
}: {
  amount: number | null | undefined;
  currency?: string;
  className?: string;
}) {
  const n = Number(amount) || 0;
  const compact = formatCompactCurrency(n, currency);
  const full = formatCurrency(n, currency);
  const abbreviated = compact !== full;
  return (
    <span className={className} title={abbreviated ? full : undefined}>
      {compact}
      {abbreviated && (
        <Info
          className="ml-1 inline-block h-3.5 w-3.5 shrink-0 align-baseline text-muted-foreground/70 cursor-help"
          aria-label={`Exact amount: ${full}`}
        />
      )}
    </span>
  );
}
