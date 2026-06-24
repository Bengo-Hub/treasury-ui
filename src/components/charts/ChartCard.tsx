'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/base';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** A single recharts chart element (AreaChart/BarChart/…); wrapped in a ResponsiveContainer. */
  children: ReactNode;
  height?: number;
  className?: string;
  /** Optional content shown above the chart (e.g. a KPI strip on a report). */
  header?: ReactNode;
  empty?: boolean;
  emptyText?: string;
}

/**
 * ChartCard — the single reusable titled chart container for the dashboard and reports. Owns the
 * card chrome + ResponsiveContainer so every chart looks consistent and consumers only supply the
 * recharts element.
 */
export function ChartCard({ title, subtitle, action, children, height = 280, className, header, empty, emptyText = 'No data for this period' }: ChartCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {header && <div className="mt-3">{header}</div>}
      {empty ? (
        <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>{emptyText}</div>
      ) : (
        <div className="mt-3" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children as any}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
