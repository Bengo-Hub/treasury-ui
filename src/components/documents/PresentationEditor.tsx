'use client';

/**
 * PresentationEditor: number style, decimals and the optional line columns (show, hide and
 * reorder) of a document. Used for the tenant defaults (Settings > Document Presentation) and for
 * a single document's own layout on the create form. See lib/documents/presentation.ts.
 */

import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import {
  ALL_COLUMNS,
  COLUMN_LABELS,
  DECIMAL_OPTIONS,
  NUMBER_STYLES,
  effectiveColumns,
  formatSample,
  type LineColumn,
  type NumberStyle,
  type Presentation,
} from '@/lib/documents/presentation';

const selectClass = 'w-full rounded border px-2 py-1.5 text-sm bg-background';

export function PresentationEditor({
  value,
  onChange,
  disabled,
}: {
  value: Presentation;
  onChange: (v: Presentation) => void;
  disabled?: boolean;
}) {
  const columns = effectiveColumns(value);
  const hidden = ALL_COLUMNS.filter((c) => !columns.includes(c));

  const setColumns = (next: LineColumn[]) => onChange({ ...value, columns: next });
  const move = (i: number, by: number) => {
    const next = [...columns];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setColumns(next);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <label className="space-y-1">
          <span className="text-xs font-medium text-foreground">Number format</span>
          <select
            className={selectClass}
            value={value.number_style ?? 'comma'}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, number_style: e.target.value as NumberStyle })}
          >
            {NUMBER_STYLES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-foreground">Decimals</span>
          <select
            className={selectClass}
            value={value.decimals ?? 2}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, decimals: Number(e.target.value) })}
          >
            {DECIMAL_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground">Line columns</p>
        <p className="text-[11px] text-muted-foreground">
          Description is always first and Amount always last. Pick the columns in between and their order.
        </p>
        <ol className="space-y-1">
          {columns.map((c, i) => (
            <li key={c} className="flex items-center gap-2 rounded border bg-background px-2 py-1 text-sm">
              <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
              <span className="flex-1">{COLUMN_LABELS[c]}</span>
              <button type="button" aria-label={`Move ${COLUMN_LABELS[c]} up`} disabled={disabled || i === 0}
                onClick={() => move(i, -1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label={`Move ${COLUMN_LABELS[c]} down`} disabled={disabled || i === columns.length - 1}
                onClick={() => move(i, 1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label={`Hide ${COLUMN_LABELS[c]}`} disabled={disabled}
                onClick={() => setColumns(columns.filter((x) => x !== c))} className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {columns.length === 0 && (
            <li className="text-xs text-muted-foreground">Only Description and Amount will print.</li>
          )}
        </ol>
        {hidden.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hidden.map((c) => (
              <button key={c} type="button" disabled={disabled} onClick={() => setColumns([...columns, c])}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-50">
                <Plus className="h-3 w-3" /> {COLUMN_LABELS[c]}
              </button>
            ))}
          </div>
        )}
      </div>

      <PresentationPreview value={value} />
    </div>
  );
}

/** A one-row sample of the line table in the chosen layout. */
export function PresentationPreview({ value }: { value: Presentation }) {
  const columns = effectiveColumns(value);
  const sample: Record<LineColumn, string> = {
    sku: 'ITM-0042',
    unit: 'pcs',
    // As the PDF prints them: quantity trimmed, discount in the style, tax as a whole percent.
    qty: '3',
    rate: formatSample(value, 411622.63),
    discount: formatSample(value, 300),
    tax: '16%',
  };
  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-2 py-1 text-left font-medium">Description</th>
            {columns.map((c) => (
              <th key={c} className="px-2 py-1 text-right font-medium">{COLUMN_LABELS[c]}</th>
            ))}
            <th className="px-2 py-1 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1">Sample item</td>
            {columns.map((c) => (
              <td key={c} className="px-2 py-1 text-right font-mono">{sample[c]}</td>
            ))}
            <td className="px-2 py-1 text-right font-mono">{formatSample(value)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
