'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { toLocalDateString } from '@/lib/utils/date';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';

export type RangeKey = 'day' | 'week' | 'month' | '30d' | '90d' | '12m' | 'custom';

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'This month' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12m', label: '12 months' },
  { key: 'custom', label: 'Custom' },
];

export interface DateBounds { from: string; to: string }

// rangeFor returns local from/to dates for a preset (single source of truth for the dashboard
// range). Dates are formatted via the centralized toLocalDateString (local, not UTC) so no window
// start/end is shifted a day by timezone. 'custom' returns the given bounds (today when blank).
export function rangeFor(key: RangeKey, custom?: DateBounds): DateBounds {
  const now = new Date();
  const to = toLocalDateString(now);
  let from = new Date(now);
  switch (key) {
    case 'custom': return { from: custom?.from || to, to: custom?.to || to };
    case 'day': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break; // today
    case 'week': { // current calendar week to date (Monday start), matching POS "This Week"
      const dow = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
      break;
    }
    case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case '30d': from.setDate(from.getDate() - 30); break;
    case '90d': from.setDate(from.getDate() - 90); break;
    case '12m': from.setFullYear(from.getFullYear() - 1); break;
  }
  return { from: toLocalDateString(from), to };
}

export interface RangeState extends DateBounds {
  key: RangeKey;
  setKey: (k: RangeKey) => void;
  custom: DateBounds;
  setCustom: (r: DateBounds) => void;
}

/** useRange holds a RangePicker selection: the preset, the custom bounds, and the resolved dates. */
export function useRange(initial: RangeKey = '30d'): RangeState {
  const [key, setKeyState] = useState<RangeKey>(initial);
  const [custom, setCustom] = useState<DateBounds>(() => rangeFor(initial === 'custom' ? '30d' : initial));
  const { from, to } = useMemo(() => rangeFor(key, custom), [key, custom]);
  // Switching to Custom starts from the window currently shown, so the inputs are never blank.
  const setKey = (k: RangeKey) => {
    if (k === 'custom' && key !== 'custom') setCustom({ from, to });
    setKeyState(k);
  };
  return { key, setKey, custom, setCustom, from, to };
}

/** RangePicker: compact preset selector plus a Custom from/to range (same pattern as the POS dashboard). */
export function RangePicker({ range }: { range: RangeState }) {
  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => range.setKey(p.key)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
              range.key === p.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {range.key === 'custom' && (
        <DateRangeFilter
          from={range.custom.from}
          to={range.custom.to}
          onFromChange={(v) => range.setCustom({ ...range.custom, from: v })}
          onToChange={(v) => range.setCustom({ ...range.custom, to: v })}
        />
      )}
    </div>
  );
}
