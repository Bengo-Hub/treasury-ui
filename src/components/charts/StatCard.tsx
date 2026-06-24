'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/base';
import { cn } from '@/lib/utils';

export type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'destructive';

const TONE: Record<StatTone, { value: string; icon: string }> = {
  default: { value: 'text-foreground', icon: 'bg-muted text-muted-foreground' },
  primary: { value: 'text-primary', icon: 'bg-primary/10 text-primary' },
  success: { value: 'text-green-600', icon: 'bg-green-500/10 text-green-600' },
  warning: { value: 'text-yellow-600', icon: 'bg-yellow-500/10 text-yellow-600' },
  destructive: { value: 'text-destructive', icon: 'bg-destructive/10 text-destructive' },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional smaller line under the value (e.g. "Cost of Goods: KES 20,500"). */
  hint?: ReactNode;
  /** Optional delta string (e.g. "+12% from last month"). */
  delta?: ReactNode;
  deltaUp?: boolean;
  icon?: ReactNode;
  tone?: StatTone;
  loading?: boolean;
  className?: string;
}

/**
 * StatCard — the single reusable KPI tile used across the dashboard and reports. Keeps KPI
 * presentation consistent so we never re-style metric cards per page.
 */
export function StatCard({ label, value, hint, delta, deltaUp, icon, tone = 'default', loading, className }: StatCardProps) {
  const t = TONE[tone];
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <div className="mt-2 h-7 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className={cn('mt-1 text-2xl font-semibold tabular-nums truncate', t.value)}>{value}</p>
            )}
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
            {delta && (
              <p className={cn('mt-1 text-xs', deltaUp ? 'text-green-600' : 'text-muted-foreground')}>{delta}</p>
            )}
          </div>
          {icon && <div className={cn('shrink-0 rounded-lg p-2', t.icon)}>{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
