'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ReportTableColumn {
  /** Column header label. */
  header: string;
  /** Right-align (amounts). Defaults to false (left). */
  align?: 'left' | 'right';
  /** Optional fixed width class, e.g. "w-20". */
  className?: string;
}

export interface ReportTableRow {
  /** Cells, positionally matched to `columns`. ReactNode so amounts can be styled. */
  cells: ReactNode[];
  /** Render as a section subtotal row (tinted, bold). */
  subtotal?: boolean;
  /** Render as the grand-total row (stronger tint, larger). */
  grandTotal?: boolean;
  /** Optional row key. */
  key?: string;
}

export interface ReportTableSection {
  /** Section heading (e.g. "Revenue", "Current Assets"). */
  title?: string;
  rows: ReportTableRow[];
}

interface ReportTableProps {
  columns: ReportTableColumn[];
  sections: ReportTableSection[];
  /** Optional grand-total row appended after all sections. */
  grandTotal?: ReportTableRow;
  className?: string;
}

/**
 * ReportTable — the SINGLE table implementation used by every financial report
 * body (P&L, balance sheet, cash flow, tax). Branded primary-tinted header row,
 * zebra body rows, right-aligned amount columns, and section-subtotal /
 * grand-total emphasis rows. Building all reports on this keeps the document
 * design consistent and avoids per-report bespoke tables (DRY).
 */
export function ReportTable({ columns, sections, grandTotal, className }: ReportTableProps) {
  const cellAlign = (i: number) => (columns[i]?.align === 'right' ? 'text-right tabular-nums' : 'text-left');

  const renderRow = (row: ReportTableRow, zebra: boolean) => {
    const tone = row.grandTotal
      ? 'bg-primary/10 font-bold border-t-2 border-primary/30 text-[15px]'
      : row.subtotal
        ? 'bg-accent/10 font-semibold'
        : zebra
          ? 'bg-muted/30'
          : '';
    return (
      <tr key={row.key} className={cn('border-b border-border/60', tone)}>
        {row.cells.map((c, i) => (
          <td key={i} className={cn('px-4 py-2 text-sm', cellAlign(i), columns[i]?.className)}>
            {c}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-primary/10">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  'px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-primary',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, si) => (
            <ReportTableSectionBody key={si} section={section} columns={columns} renderRow={renderRow} />
          ))}
          {grandTotal && renderRow({ ...grandTotal, grandTotal: true }, false)}
        </tbody>
      </table>
    </div>
  );
}

function ReportTableSectionBody({
  section,
  columns,
  renderRow,
}: {
  section: ReportTableSection;
  columns: ReportTableColumn[];
  renderRow: (row: ReportTableRow, zebra: boolean) => ReactNode;
}) {
  return (
    <>
      {section.title && (
        <tr className="bg-accent/5">
          <td
            colSpan={columns.length}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            {section.title}
          </td>
        </tr>
      )}
      {section.rows.map((row, ri) => renderRow(row, ri % 2 === 1 && !row.subtotal && !row.grandTotal))}
    </>
  );
}
