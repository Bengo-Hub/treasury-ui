'use client';

import { cn } from '@/lib/utils';

export type RangeKey = 'day' | 'week' | 'month' | '30d' | '90d' | '12m';

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'This month' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12m', label: '12 months' },
];

// rangeFor returns ISO from/to dates for a preset (single source of truth for the dashboard range).
export function rangeFor(key: RangeKey): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let from = new Date(now);
  switch (key) {
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
  return { from: from.toISOString().slice(0, 10), to };
}

/** RangePicker — compact preset selector for the dashboard period. */
export function RangePicker({ value, onChange }: { value: RangeKey; onChange: (k: RangeKey) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            value === p.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
