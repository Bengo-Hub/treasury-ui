'use client';

// The one shared "from/to" date-range control for treasury-ui. Pairs with
// `useDateRangeFilter` (src/hooks/use-date-range-filter.ts) so a page drops in one component
// instead of hand-rolling two `<input type="date">` elements — see platform/payouts and
// platform/audit, which each used to duplicate this markup with their own state.

import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DATE_RANGE_PRESET_LABELS, type DateRangePresetKey } from '@/hooks/use-date-range-filter';

export interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  /** Segmented preset buttons rendered before the date inputs. Omit (with onPresetSelect) to
   *  render just the two raw inputs. */
  presets?: DateRangePresetKey[];
  activePreset?: DateRangePresetKey | null;
  onPresetSelect?: (preset: DateRangePresetKey) => void;
  className?: string;
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  presets,
  activePreset,
  onPresetSelect,
  className,
}: DateRangeFilterProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {presets && presets.length > 0 && onPresetSelect && (
        <div className="flex items-center gap-1 flex-wrap">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPresetSelect(p)}
              aria-pressed={activePreset === p}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                activePreset === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent/30 text-muted-foreground hover:text-foreground',
              )}
            >
              {DATE_RANGE_PRESET_LABELS[p]}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="bg-accent/30 border-none rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
          aria-label="From date"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="bg-accent/30 border-none rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
          aria-label="To date"
        />
      </div>
    </div>
  );
}
