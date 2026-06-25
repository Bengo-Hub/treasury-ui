import type { ReactNode } from 'react';
import type { ReportTableColumn, ReportTableRow, ReportTableSection } from '@/components/reports/ReportTable';

/**
 * exportReportCsv — the SINGLE CSV exporter for every financial report. It
 * serialises the EXACT same `columns` + `sections` (+ optional `grandTotal`)
 * structure that {@link ReportTable} renders, so the on-screen table and the
 * downloaded CSV come from one data shape — there is no duplicate row-shaping.
 *
 * Output layout:
 *   - Title line, then the period line (both single-cell)
 *   - A blank separator row
 *   - The column header row
 *   - Per section: an optional section-title row, its rows, then any subtotal
 *     rows (subtotals are just rows flagged `subtotal` in the table data)
 *   - An optional grand-total row
 *
 * RFC-4180-ish escaping: any field containing a comma, double-quote or newline
 * is wrapped in double quotes with internal quotes doubled. Download is via a
 * Blob + object URL — no new dependency.
 */

export interface ReportCsvData {
  filename: string;
  /** SAME columns array passed to ReportTable. */
  columns: ReportTableColumn[];
  /** SAME sections array passed to ReportTable. */
  sections: ReportTableSection[];
  /** SAME optional grand-total row passed to ReportTable. */
  grandTotal?: ReportTableRow;
  /** Report title (appears on the first line). */
  title?: string;
  /** Period / "as at" line (appears on the second line). */
  periodLabel?: string;
}

/** Flatten a ReactNode cell down to plain text for the CSV. */
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  // React element — pull text out of its children if present.
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    if (props && 'children' in props) return nodeToText(props.children);
  }
  return '';
}

/** Escape a single CSV field per RFC-4180. */
function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a CSV row from positional string cells, padded to `width` columns. */
function csvRow(cells: string[], width: number): string {
  const padded = cells.slice(0, width);
  while (padded.length < width) padded.push('');
  return padded.map(escapeCsv).join(',');
}

/** Serialise report data to a CSV string. */
export function reportToCsv({
  columns,
  sections,
  grandTotal,
  title,
  periodLabel,
}: Omit<ReportCsvData, 'filename'>): string {
  const width = columns.length || 1;
  const lines: string[] = [];

  if (title) lines.push(csvRow([title], width));
  if (periodLabel) lines.push(csvRow([periodLabel], width));
  if (title || periodLabel) lines.push('');

  lines.push(csvRow(columns.map((c) => c.header), width));

  for (const section of sections) {
    if (section.title) lines.push(csvRow([section.title], width));
    for (const row of section.rows) {
      lines.push(csvRow(row.cells.map(nodeToText), width));
    }
  }

  if (grandTotal) {
    lines.push(csvRow(grandTotal.cells.map(nodeToText), width));
  }

  return lines.join('\r\n');
}

/**
 * Serialise the report and trigger a browser download. Reuses the same
 * `columns`/`sections` already given to ReportTable (no duplicate shaping).
 */
export function exportReportCsv(data: ReportCsvData): void {
  if (typeof window === 'undefined') return;
  const csv = reportToCsv(data);
  // Prepend a UTF-8 BOM so Excel reads non-ASCII (currency symbols) correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.filename.endsWith('.csv') ? data.filename : `${data.filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
