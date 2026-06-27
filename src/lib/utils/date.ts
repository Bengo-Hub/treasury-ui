/**
 * Centralized date formatting helpers (en-KE, "31 May 2026" style). Use these everywhere a
 * raw ISO timestamp would otherwise render — they degrade gracefully on empty/invalid input
 * (returning the original string) so they're safe to drop in anywhere. Lives next to
 * `formatCurrency` (currency.ts) as the single source of truth for date display.
 */

/** Coerce a Date | ISO string | epoch ms into a Date, or null if it can't be parsed. */
function toDate(d: Date | string | number | null | undefined): Date | null {
  if (d == null || d === '') return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "31 May 2026" — day, full month, year. Returns the raw input if it can't be parsed. */
export function formatDate(d: Date | string | number | null | undefined): string {
  const date = toDate(d);
  if (!date) return typeof d === 'string' ? d : '';
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** "31 May 2026 – 27 Jun 2026". Falls back to whichever bound is valid if the other isn't. */
export function formatDateRange(
  from: Date | string | number | null | undefined,
  to: Date | string | number | null | undefined,
): string {
  const a = formatDate(from);
  const b = formatDate(to);
  if (a && b) return `${a} – ${b}`;
  return a || b || '';
}

/** "31 May 2026, 14:05" — date + 24h time. Returns the raw input if it can't be parsed. */
export function formatDateTime(d: Date | string | number | null | undefined): string {
  const date = toDate(d);
  if (!date) return typeof d === 'string' ? d : '';
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
