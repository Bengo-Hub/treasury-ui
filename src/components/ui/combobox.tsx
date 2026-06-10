'use client';

import { cn } from '@/lib/utils';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional secondary text shown muted (e.g. a slug or code). */
  hint?: string;
}

/**
 * Combobox is a searchable single-select dropdown. Use it instead of a raw text input
 * whenever the user is choosing one item from a known list (tenants, customers, accounts,
 * transactions, …) rather than typing an opaque id/UUID by hand.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  loading = false,
  disabled = false,
  clearable = true,
  className,
}: {
  options: ComboboxOption[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      // focus the search box when the menu opens
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint ?? '').toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-left min-h-[38px] disabled:opacity-50',
          open && 'ring-1 ring-ring',
        )}
      >
        {selected ? (
          <span className="flex-1 min-w-0 truncate">
            {selected.label}
            {selected.hint && <span className="text-muted-foreground font-mono ml-2 text-xs">{selected.hint}</span>}
          </span>
        ) : (
          <span className="text-muted-foreground flex-1">{placeholder}</span>
        )}
        <span className="flex items-center gap-1 shrink-0">
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors',
                      isSelected && 'bg-accent/30',
                    )}
                  >
                    <Check className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'opacity-100 text-primary' : 'opacity-0')} />
                    <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                    {opt.hint && <span className="text-muted-foreground font-mono text-xs shrink-0">{opt.hint}</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
