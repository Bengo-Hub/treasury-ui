'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { usePendingClosePeriods } from '@/hooks/use-ledger';
import { money } from '@/components/charts/chart-theme';
import { cn } from '@/lib/utils';

/**
 * Period close reminder: shown once an accounting period has ended but is still open. Names the
 * oldest such period (periods close in order) with its revenue, expenses and net profit, and links
 * to Accounting Periods to review and close it. Renders nothing when there is nothing to close or
 * the tenant's plan has no ledger access.
 */
export function PeriodCloseReminder({ tenant, orgSlug }: { tenant: string; orgSlug: string }) {
  const { data } = usePendingClosePeriods(tenant);
  const oldest = data?.periods?.[0];
  if (!data?.count || !oldest) return null;

  const net = Number(oldest.net_profit ?? 0);
  const more = data.count - 1;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {oldest.name} has ended and is ready to close
            {more > 0 && (
              <span className="font-normal text-muted-foreground">
                {' '}
                ({more} more period{more === 1 ? '' : 's'} waiting)
              </span>
            )}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Revenue <span className="font-semibold text-foreground">{money(oldest.revenue)}</span>
            </span>
            <span>
              Expenses <span className="font-semibold text-foreground">{money(oldest.expenses)}</span>
            </span>
            <span>
              Net profit{' '}
              <span className={cn('font-semibold', net < 0 ? 'text-destructive' : 'text-emerald-600')}>
                {money(oldest.net_profit)}
              </span>
            </span>
          </p>
        </div>
      </div>
      <Link
        href={`/${orgSlug}/ledger/periods`}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
      >
        Review and close
      </Link>
    </div>
  );
}
