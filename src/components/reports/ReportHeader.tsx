'use client';

import { useBranding } from '@/providers/branding-provider';
import { cn } from '@/lib/utils';

interface ReportHeaderProps {
  title: string;
  periodLabel: string;
  className?: string;
}

/**
 * ReportHeader — the branded masthead for every financial ReportDocument.
 * Renders the tenant logo + organisation name (from `useBranding`), the report
 * title and period line, and a brand-coloured rule. Print-friendly: forces a
 * light, high-contrast treatment so it reads cleanly on paper / PDF.
 */
export function ReportHeader({ title, periodLabel, className }: ReportHeaderProps) {
  const { tenant } = useBranding();
  const orgName = tenant?.orgName || tenant?.name || 'Codevertex';
  const logo = tenant?.logoUrl || null;
  const primary = tenant?.primaryColor || '#ea8022';

  return (
    <header className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={orgName}
              className="h-12 w-12 rounded-lg object-contain border border-border bg-white p-1"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
              style={{ backgroundColor: primary }}
              aria-hidden
            >
              {orgName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-tight text-foreground">{orgName}</p>
            <p className="text-xs text-muted-foreground">Financial Statement</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-xs font-medium text-muted-foreground">{periodLabel}</p>
        </div>
      </div>
      <div className="h-1 w-full rounded-full" style={{ backgroundColor: primary }} />
    </header>
  );
}
