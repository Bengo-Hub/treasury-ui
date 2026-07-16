'use client';

/**
 * CodeListSelect — a select driven by the tenant's synced KRA eTIMS code lists
 * (GET /tax/etims/code-lists?type=). Two shapes:
 *
 * - default: a plain <select> over the full list of one code type;
 * - `searchable`: an input + dropdown that searches server-side via the `q`
 *   param — for large lists (ITEM_CLS has thousands of UNSPSC classes).
 *
 * When the synced list is EMPTY (tenant hasn't refreshed code lists yet) it
 * falls back to the caller's hardcoded `fallbackOptions` — or a free-text input
 * when none are provided — plus a subtle hint pointing at the sync action.
 */

import { useEtimsCodeLists } from '@/hooks/use-tax';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface CodeListOption {
  value: string;
  label: string;
}

const SYNC_HINT = 'Sync KRA code lists for the full list (eTIMS Devices → Refresh Code Lists).';

const controlCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function SyncHint() {
  return <p className="mt-1 text-[11px] text-muted-foreground/70">{SYNC_HINT}</p>;
}

export interface CodeListSelectProps {
  tenantSlug: string;
  /** KRA code-list type: TAX_TY, ITEM_CLS, PKG_UNIT, QTY_UNIT, ITEM_TY, PMNT_TY, RFD_RSN, OBLIGATION. */
  codeType: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Render an empty "" option (for optional fields). */
  allowEmpty?: boolean;
  /** Options rendered when the synced list is empty; omit to fall back to free text. */
  fallbackOptions?: CodeListOption[];
  /** Server-side searchable input + dropdown for large lists (ITEM_CLS). */
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
}

export function CodeListSelect(props: CodeListSelectProps) {
  if (props.searchable) return <SearchableCodeListSelect {...props} />;
  return <PlainCodeListSelect {...props} />;
}

function PlainCodeListSelect({
  tenantSlug,
  codeType,
  value,
  onChange,
  placeholder,
  allowEmpty,
  fallbackOptions,
  className,
  disabled,
}: CodeListSelectProps) {
  const { data, isLoading } = useEtimsCodeLists(tenantSlug, codeType, undefined, 500);
  const entries = data?.codes ?? [];
  const hasSyncedList = entries.length > 0;

  // Empty synced list + no hardcoded fallback → free-text input (e.g. NIL obligation code).
  if (!isLoading && !hasSyncedList && (!fallbackOptions || fallbackOptions.length === 0)) {
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(controlCls, className)}
        />
        <SyncHint />
      </div>
    );
  }

  const options: CodeListOption[] = hasSyncedList
    ? entries.map((c) => ({ value: c.code, label: c.name ? `${c.code} — ${c.name}` : c.code }))
    : (fallbackOptions ?? []);
  // Keep a controlled value visible even when it isn't in the option list.
  const hasValue = !value || options.some((o) => o.value === value);

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
        className={cn(controlCls, className)}
      >
        {allowEmpty && <option value="">{placeholder ?? '—'}</option>}
        {!hasValue && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {!isLoading && !hasSyncedList && <SyncHint />}
    </div>
  );
}

function SearchableCodeListSelect({
  tenantSlug,
  codeType,
  value,
  onChange,
  placeholder,
  allowEmpty,
  fallbackOptions,
  className,
  disabled,
}: CodeListSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const { data, isLoading, isFetching } = useEtimsCodeLists(
    tenantSlug,
    codeType,
    debouncedQuery || undefined,
    50,
  );
  const entries = data?.codes ?? [];
  // The synced list is considered empty only when an unfiltered fetch returns nothing.
  const listEmpty = !isLoading && !debouncedQuery && entries.length === 0;

  const options: CodeListOption[] = listEmpty
    ? (fallbackOptions ?? []).filter(
        (o) => !debouncedQuery || o.label.toLowerCase().includes(debouncedQuery.toLowerCase()),
      )
    : entries.map((c) => ({ value: c.code, label: c.name ? `${c.code} — ${c.name}` : c.code }));

  const displayLabel =
    value
      ? options.find((o) => o.value === value)?.label ||
        fallbackOptions?.find((o) => o.value === value)?.label ||
        selectedLabel ||
        value
      : '';

  const pick = (o: CodeListOption) => {
    onChange(o.value);
    setSelectedLabel(o.label);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(controlCls, 'flex items-center justify-between gap-2 text-left', className)}
      >
        <span className={cn('truncate', !displayLabel && 'text-muted-foreground')}>
          {displayLabel || placeholder || 'Select…'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-56 rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search codes…"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            {(isLoading || isFetching) && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {allowEmpty && (
              <li>
                <button
                  type="button"
                  onClick={() => pick({ value: '', label: '' })}
                  className="w-full px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
                >
                  — none —
                </button>
              </li>
            )}
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => pick(o)}
                  className={cn(
                    'w-full px-3 py-1.5 text-left text-sm hover:bg-accent',
                    o.value === value && 'bg-primary/10 font-medium text-primary',
                  )}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {!isLoading && options.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matching codes.</li>
            )}
          </ul>
          {listEmpty && (
            <div className="border-t border-border px-3 py-2">
              <p className="text-[11px] text-muted-foreground/70">{SYNC_HINT}</p>
            </div>
          )}
        </div>
      )}
      {listEmpty && !open && <SyncHint />}
    </div>
  );
}
