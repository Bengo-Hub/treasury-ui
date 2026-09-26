'use client';

import { cn } from '@/lib/utils';

export interface ListTotal {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}

const TONE: Record<NonNullable<ListTotal['tone']>, string> = {
  default: 'text-foreground',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  destructive: 'text-destructive',
};

/**
 * Totals summary shown under a list table. Reusable across list pages: pass server-side totals
 * for the whole filtered result (not the current page), plus an optional caption naming the scope.
 */
export function ListTotalsBar({ totals, caption, className }: { totals: ListTotal[]; caption?: string; className?: string }) {
  if (totals.length === 0) return null;
  return (
    <div className={cn('mt-3 rounded-lg border border-border bg-accent/10 px-4 py-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        {caption && <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{caption}</p>}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {totals.map((t) => (
            <div key={t.label} className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t.label}</p>
              <p className={cn('text-sm font-black tabular-nums', TONE[t.tone ?? 'default'])}>{t.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
