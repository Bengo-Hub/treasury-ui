'use client';

import { cn } from '@/lib/utils';

interface ReportFooterProps {
  className?: string;
  /** Optional override for the confidentiality / disclaimer line. */
  disclaimer?: string;
}

/**
 * ReportFooter — the standard footer rendered at the bottom of every
 * ReportDocument: a generated timestamp and a confidentiality/disclaimer line.
 * Single source of truth so footers never drift between report types.
 */
export function ReportFooter({ className, disclaimer }: ReportFooterProps) {
  const generated = new Date().toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return (
    <footer className={cn('mt-6 border-t border-border pt-3 text-[11px] text-muted-foreground', className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span>Generated {generated}</span>
        <span className="italic">
          {disclaimer ??
            'Confidential — system-generated financial report. Figures are subject to final audit.'}
        </span>
      </div>
    </footer>
  );
}
