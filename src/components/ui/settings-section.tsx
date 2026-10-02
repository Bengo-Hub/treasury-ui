'use client';

import { Card, CardContent } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * SettingsSection is the card every settings and configuration panel is built from: an icon
 * tile, a title, an optional one-line description, an optional action on the right, then the body.
 */
export function SettingsSection({
  icon,
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      <CardContent className={cn('p-5', bodyClassName)}>{children}</CardContent>
    </Card>
  );
}
