'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/base';
import { StatCard, type StatTone } from '@/components/charts/StatCard';
import { cn } from '@/lib/utils';
import { ReportHeader } from './ReportHeader';
import { ReportFooter } from './ReportFooter';
import { PrintButton } from './PrintButton';

export interface ReportKpi {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
}

interface ReportDocumentProps {
  title: string;
  periodLabel: string;
  /** Optional KPI strip rendered through the shared StatCard. */
  kpis?: ReportKpi[];
  /** Report body — tables/sections built with ReportTable. */
  children: ReactNode;
  /** Optional disclaimer override for the footer. */
  disclaimer?: string;
  className?: string;
}

/**
 * ReportDocument — the SINGLE template every financial report renders through.
 * Composes the branded ReportHeader, an optional KPI strip (shared StatCard),
 * the report body (`children`, built from ReportTable), and the ReportFooter.
 * A "Download / Print PDF" button (PrintButton) prints just this document via
 * the `.report-document` print scope. Every report reuses this — no per-report
 * header/period/branding/footer code.
 */
export function ReportDocument({
  title,
  periodLabel,
  kpis,
  children,
  disclaimer,
  className,
}: ReportDocumentProps) {
  return (
    <Card className={cn('report-document p-6 sm:p-8 print:shadow-none print:border-0', className)}>
      <div className="mb-4 flex justify-end print-hidden">
        <PrintButton />
      </div>

      <ReportHeader title={title} periodLabel={periodLabel} />

      {kpis && kpis.length > 0 && (
        <div
          className={cn(
            'mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3',
            kpis.length >= 4 && 'lg:grid-cols-4',
            kpis.length >= 5 && 'lg:grid-cols-5',
          )}
        >
          {kpis.map((k, i) => (
            <StatCard key={i} label={k.label} value={k.value} hint={k.hint} tone={k.tone} />
          ))}
        </div>
      )}

      <div className="mt-6 space-y-6">{children}</div>

      <ReportFooter disclaimer={disclaimer} />
    </Card>
  );
}
