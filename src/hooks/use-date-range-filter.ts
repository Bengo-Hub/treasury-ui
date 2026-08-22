'use client';

// Centralized date-range filter — the shared "from/to" period-picker logic reused across
// platform pages that need it (Ecosystem Analytics today; Platform Treasury/Audit Log carried
// their own ad-hoc `useState` pairs before this existed — see those files' history). Mirrors how
// `useTenantFilterStore` (src/store/tenant-filter.ts) is the one place tenant-scoping logic lives:
// a page calls this hook instead of hand-rolling `useState('')` + its own default-range math.
//
// This is a plain hook (component-local state), NOT a global store like the tenant filter — each
// page's date range is independent by design (Payouts defaults to last 90 days, Equity to last
// 30, Analytics to all-time), so sharing one global value across pages would fight their
// different defaults. What's centralized is the boilerplate: default-range math, named presets,
// and the "empty string = no filter" convention every one of these pages already used.

import { useCallback, useMemo, useRef, useState } from 'react';

export type DateRangePresetKey = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'allTime';

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePresetKey, string> = {
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  last90: 'Last 90 Days',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  thisYear: 'This Year',
  allTime: 'All Time',
};

/**
 * Local (NOT UTC) calendar date as YYYY-MM-DD. Using `toISOString().slice(0, 10)` (as the old
 * per-page `defaultDateRange()` helpers did) converts to UTC first, which silently shifts the
 * calendar day back one for positive-offset zones like Africa/Nairobi (UTC+3) right at local
 * midnight. Duplicated here (rather than importing lib/utils/date.ts) so this hook has zero
 * dependencies and stays trivially copyable/portable.
 */
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Computes the {from, to} bounds for a named preset, evaluated against "today" at call time.
 * `allTime` returns empty strings — the convention every one of these pages already used for
 * "no filter" (an empty `from`/`to` is omitted from the API query params, see use-platform-analytics.ts).
 */
export function computeDateRangePreset(preset: DateRangePresetKey): { from: string; to: string } {
  const today = new Date();
  const to = toISODate(today);
  switch (preset) {
    case 'last7': {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      return { from: toISODate(from), to };
    }
    case 'last30': {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      return { from: toISODate(from), to };
    }
    case 'last90': {
      const from = new Date(today);
      from.setDate(from.getDate() - 90);
      return { from: toISODate(from), to };
    }
    case 'thisMonth':
      return { from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), to };
    case 'lastMonth': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toISODate(from), to: toISODate(end) };
    }
    case 'thisYear':
      return { from: toISODate(new Date(today.getFullYear(), 0, 1)), to };
    case 'allTime':
      return { from: '', to: '' };
  }
}

const ALL_PRESET_KEYS: DateRangePresetKey[] = ['last7', 'last30', 'last90', 'thisMonth', 'lastMonth', 'thisYear', 'allTime'];

export interface UseDateRangeFilterOptions {
  /**
   * Seed the initial range from this preset. Ignored when `initialFrom`/`initialTo` are given.
   * Default 'allTime' — matches every page's original behavior before it had a real date filter
   * (an unfiltered, all-time load) so wiring this hook into a page never changes its first paint.
   */
  defaultPreset?: DateRangePresetKey;
  /** Explicit initial bounds (YYYY-MM-DD) — wins over `defaultPreset` when given. */
  initialFrom?: string;
  initialTo?: string;
}

export interface DateRangeFilterState {
  /** YYYY-MM-DD, or '' meaning "no lower bound". */
  from: string;
  /** YYYY-MM-DD, or '' meaning "no upper bound". */
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  setRange: (from: string, to: string) => void;
  /** Apply a named preset immediately. */
  applyPreset: (preset: DateRangePresetKey) => void;
  /** The preset key matching the CURRENT from/to, if any — lets a segmented control show which
   *  preset button (if any) is active, without the page tracking that separately. */
  activePreset: DateRangePresetKey | null;
  /** Reset back to the range this hook instance started with. */
  reset: () => void;
  /** True once the user has actually narrowed the range away from the initial seed. */
  isFiltered: boolean;
  /** Ready to spread/pass into an API-hook call: blank strings become `undefined` (this
   *  codebase's convention for "omit this query param" — see use-platform-analytics.ts). */
  params: { from?: string; to?: string };
}

/**
 * useDateRangeFilter — the shared from/to date-range filter. Returns plain strings (not Date
 * objects) so it drops straight into the `<input type="date">` + query-param plumbing every
 * consumer already uses.
 *
 * Usage: `const { from, to, setFrom, setTo } = useDateRangeFilter();` — or pair it with the
 * `<DateRangeFilter>` component (src/components/filters/DateRangeFilter.tsx) for the input UI too.
 */
export function useDateRangeFilter(options: UseDateRangeFilterOptions = {}): DateRangeFilterState {
  const { defaultPreset, initialFrom, initialTo } = options;

  // Computed once at mount — intentionally NOT re-derived on every render (a page passing a new
  // inline `{ defaultPreset: 'last30' }` object each render must not silently reset the user's
  // selection back to the preset).
  const initial = useMemo(() => {
    if (initialFrom !== undefined || initialTo !== undefined) {
      return { from: initialFrom ?? '', to: initialTo ?? '' };
    }
    return computeDateRangePreset(defaultPreset ?? 'allTime');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const initialRef = useRef(initial);

  const setRange = useCallback((f: string, t: string) => {
    setFrom(f);
    setTo(t);
  }, []);

  const applyPreset = useCallback((preset: DateRangePresetKey) => {
    const r = computeDateRangePreset(preset);
    setFrom(r.from);
    setTo(r.to);
  }, []);

  const reset = useCallback(() => {
    setFrom(initialRef.current.from);
    setTo(initialRef.current.to);
  }, []);

  const activePreset = useMemo<DateRangePresetKey | null>(() => {
    for (const key of ALL_PRESET_KEYS) {
      const r = computeDateRangePreset(key);
      if (r.from === from && r.to === to) return key;
    }
    return null;
  }, [from, to]);

  return {
    from,
    to,
    setFrom,
    setTo,
    setRange,
    applyPreset,
    activePreset,
    reset,
    isFiltered: !!(from || to),
    params: { from: from || undefined, to: to || undefined },
  };
}
