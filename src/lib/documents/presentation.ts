/**
 * How amounts and line columns print on a document (PDF, CSV and XLSX). Mirrors treasury-api's
 * internal/modules/docs/presentation.go: the tenant default per document type lives in the
 * settings key `documents.presentation`, and a document's `metadata.presentation` overrides it.
 * Nothing set prints the standard layout (qty, rate, tax; comma grouping, 2 decimals).
 */

export const PRESENTATION_SETTING_KEY = 'documents.presentation';
export const PRESENTATION_META_KEY = 'presentation';

export type NumberStyle = 'comma' | 'dot' | 'space' | 'indian';
export type LineColumn = 'sku' | 'unit' | 'qty' | 'rate' | 'discount' | 'tax';

export interface Presentation {
  number_style?: NumberStyle;
  decimals?: number;
  /** Optional columns shown, in order. Absent means the standard set; empty means none. */
  columns?: LineColumn[];
}

/** Tenant defaults, keyed by document type (invoice, quotation, ...). */
export type PresentationDefaults = Partial<Record<string, Presentation>>;

export const NUMBER_STYLES: { value: NumberStyle; label: string }[] = [
  { value: 'comma', label: '1,234,567.89' },
  { value: 'dot', label: '1.234.567,89' },
  { value: 'space', label: '1 234 567.89' },
  { value: 'indian', label: '12,34,567.89' },
];

export const DECIMAL_OPTIONS = [0, 1, 2, 3, 4];

export const ALL_COLUMNS: LineColumn[] = ['sku', 'unit', 'qty', 'rate', 'discount', 'tax'];
export const DEFAULT_COLUMNS: LineColumn[] = ['qty', 'rate', 'tax'];

export const COLUMN_LABELS: Record<LineColumn, string> = {
  sku: 'SKU',
  unit: 'Unit',
  qty: 'Quantity',
  rate: 'Rate',
  discount: 'Discount',
  tax: 'Tax %',
};

/** The columns a presentation shows, in order, as the server resolves them. */
export function effectiveColumns(p: Presentation | undefined): LineColumn[] {
  if (!p?.columns) return DEFAULT_COLUMNS;
  return p.columns.filter((c, i, all) => ALL_COLUMNS.includes(c) && all.indexOf(c) === i);
}

/** A sample amount in the chosen style, for previews. Same grouping rules as the server. */
export function formatSample(p: Presentation | undefined, value = 1234567.891): string {
  const decimals = p?.decimals !== undefined && p.decimals >= 0 && p.decimals <= 4 ? p.decimals : 2;
  const style = p?.number_style ?? 'comma';
  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart, frac] = fixed.split('.');
  const group = style === 'dot' ? '.' : style === 'space' ? ' ' : ',';
  const point = style === 'dot' ? ',' : '.';
  let grouped: string;
  if (style === 'indian' && intPart.length > 3) {
    const head = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, group);
    grouped = `${head}${group}${intPart.slice(-3)}`;
  } else {
    grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  }
  const negative = value < 0 && Number(fixed) !== 0;
  return `${negative ? '-' : ''}${grouped}${frac ? point + frac : ''}`;
}

/** Parses the stored tenant setting (a JSON map by document type). Bad values give no defaults. */
export function parsePresentationDefaults(raw: unknown): PresentationDefaults {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as PresentationDefaults;
  if (typeof raw === 'string' && raw) {
    try {
      const v = JSON.parse(raw);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v as PresentationDefaults;
    } catch {
      /* fall through */
    }
  }
  return {};
}

/** Reads a document's own presentation override, if it has one. */
export function presentationFromMetadata(meta: Record<string, unknown> | undefined): Presentation | null {
  const v = meta?.[PRESENTATION_META_KEY];
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Presentation) : null;
}

/** Writes (or clears, for null) a document's presentation override on its metadata. */
export function applyPresentationToMetadata(meta: Record<string, unknown>, value: Presentation | null): void {
  if (value) meta[PRESENTATION_META_KEY] = value;
  else delete meta[PRESENTATION_META_KEY];
}
