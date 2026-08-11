'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Package, Plus, Search, X } from 'lucide-react';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib';
import { useInventoryItems } from '@/hooks/use-inventory';
import type { InventoryItem } from '@/lib/api/inventory';
import { useTaxCodes } from '@/hooks/use-tax';
import type { TaxCode } from '@/lib/api/tax';
import { MarginPanel } from '../MarginPanel';

type SearchState = 'EMPTY' | 'SEARCHING' | 'RESULTS_FOUND' | 'LINKED';

export interface LineRow {
  _key: string;
  description: string;
  item_id?: string;
  item_sku?: string;
  item_type?: string;
  image_url?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  /** Buying / cost price per unit (business-only — drives the internal margin panel). */
  unit_cost?: number;
  tax_code?: string;
  tax_rate: number;
  discount_amount: number;
  /** Progress/milestone billing: bill this % of the line (qty×rate). undefined/100 = full line.
   *  Especially useful for SERVICE items (e.g. "40% of the contract amount"). Sent to the
   *  backend as completion_percent (transient) which folds it into the billed line total. */
  completion_percent?: number;
}

// effectiveCompletion clamps a line's completion % to a billing multiplier in (0,1].
// undefined / >=100 / <=0 all mean "bill the full line" (multiplier 1).
export function lineCompletionFactor(completion?: number): number {
  if (completion == null) return 1;
  if (completion <= 0 || completion >= 100) return 1;
  return completion / 100;
}

// lineNet returns the billable net for a line (qty × rate × completion − discount).
export function lineNet(l: LineRow): number {
  return l.quantity * l.unit_price * lineCompletionFactor(l.completion_percent) - (l.discount_amount || 0);
}

export function newLineRow(): LineRow {
  return {
    _key: Math.random().toString(36).slice(2),
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
    discount_amount: 0,
  };
}

interface ComboboxProps {
  tenant: string;
  line: LineRow;
  onUpdate: (patch: Partial<LineRow>) => void;
  onRequestCreate: (query: string) => void;
}

function ItemCombobox({ tenant, line, onUpdate, onRequestCreate }: ComboboxProps) {
  const [state, setState] = useState<SearchState>(line.item_id ? 'LINKED' : 'EMPTY');
  const [query, setQuery] = useState('');
  const [enabled, setEnabled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isFetching } = useInventoryItems(tenant, { q: query, limit: 10 }, enabled && query.length >= 2);

  useEffect(() => {
    if (isFetching) setState('SEARCHING');
    else if (enabled && data) setState(data.items.length > 0 ? 'RESULTS_FOUND' : 'EMPTY');
  }, [isFetching, data, enabled]);

  const handleInput = (v: string) => {
    setQuery(v);
    onUpdate({ description: v, item_id: undefined });
    setState('SEARCHING');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setEnabled(true), 300);
  };

  const selectItem = (item: InventoryItem) => {
    onUpdate({
      // Title on the first line, the item's own description (if any) beneath it — the document
      // renderer splits on the first newline to style the detail small & wrapped under the title.
      description: item.description?.trim() ? `${item.name}\n${item.description.trim()}` : item.name,
      item_id: item.id,
      item_sku: item.sku,
      item_type: item.item_type,
      image_url: item.image_url,
      unit: item.unit,
      unit_price: parseFloat(item.unit_price ?? '0') || 0,
      unit_cost: item.cost_price != null ? (parseFloat(item.cost_price) || 0) : undefined,
      tax_code: item.tax_code,
      tax_rate: parseFloat(item.tax_rate ?? '0') || 0,
    });
    setQuery('');
    setEnabled(false);
    setState('LINKED');
  };

  const unlink = () => {
    onUpdate({ item_id: undefined, description: '' });
    setQuery('');
    setState('EMPTY');
  };

  if (state === 'LINKED') {
    // description may carry a "title\ndetail" block — show the title in the chip and the detail
    // as a small muted note beneath, mirroring how the document renders it.
    const [title, ...rest] = line.description.split('\n');
    const detail = rest.join(' ').trim();
    return (
      <div className="rounded-lg border border-border bg-accent/30 px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-xs font-semibold text-foreground flex-1 truncate">{title}</span>
          {line.item_sku && <span className="text-[10px] font-mono text-muted-foreground">{line.item_sku}</span>}
          <button type="button" onClick={unlink} className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
        {detail && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 pl-5">{detail}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        {state === 'SEARCHING' && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        <input
          value={query || line.description}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if ((query || line.description).length >= 2) setEnabled(true); }}
          onBlur={() => setTimeout(() => setEnabled(false), 200)}
          placeholder="Search or type item…"
          className="w-full rounded-lg py-2 pl-8 pr-8 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      {enabled && (state === 'RESULTS_FOUND' || state === 'SEARCHING') && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {data?.items.map(item => (
            <button key={item.id} type="button" onMouseDown={() => selectItem(item)}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors">
              <div className="flex items-center gap-2">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
                ) : (
                  <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <div className="text-xs font-bold text-foreground">{item.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{item.sku} {item.unit && `· ${item.unit}`}</div>
                </div>
                {item.unit_price && (
                  <span className="ml-auto text-xs font-mono font-bold text-foreground">{item.unit_price}</span>
                )}
              </div>
            </button>
          ))}
          {(query || line.description) && (
            <button type="button" onMouseDown={() => onRequestCreate(query || line.description)}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-t border-border">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Plus className="h-3.5 w-3.5" />
                Create &ldquo;{query || line.description}&rdquo; as new item
              </div>
            </button>
          )}
        </div>
      )}
      {enabled && state === 'EMPTY' && (query || line.description).length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl">
          <button type="button" onMouseDown={() => onRequestCreate(query || line.description)}
            className="w-full text-left px-3 py-2 hover:bg-accent transition-colors">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Plus className="h-3.5 w-3.5" />
              Create &ldquo;{query || line.description}&rdquo; as new item
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

interface TaxCodeCellProps {
  line: LineRow;
  options: ComboboxOption[];
  codesByCode: Map<string, TaxCode>;
  onUpdate: (patch: Partial<LineRow>) => void;
  className?: string;
}

// TaxCodeCell replaces the old free-typed "Tax%" number input with a searchable combobox of the
// tenant's actual tax codes — the applicable code is selected, not typed, so a line's tax rate can
// never drift from a registered code (and, for eTIMS-activated tenants, the KRA band the item is
// registered under). ItemCombobox's selectItem already stamps line.tax_code from the chosen
// catalog item's own default; this just makes that pre-selection visible/editable instead of the
// number input silently ignoring it. A legacy line that only ever carried a bare tax_rate (no
// tax_code — an older draft, or a line typed before this fix shipped) is matched to the tax code
// with the same rate for display, so it doesn't render as unset.
function TaxCodeCell({ line, options, codesByCode, onUpdate, className }: TaxCodeCellProps) {
  const displayValue = useMemo(() => {
    if (line.tax_code) return line.tax_code;
    const byRate = [...codesByCode.values()].find(tc => Number(tc.rate) === line.tax_rate);
    return byRate?.code ?? '';
  }, [line.tax_code, line.tax_rate, codesByCode]);

  return (
    <SearchableCombobox
      options={options}
      value={displayValue}
      onChange={(code, opt) => {
        const tc = code ? codesByCode.get(code) : undefined;
        onUpdate({ tax_code: code || undefined, tax_rate: tc ? Number(tc.rate) : 0 });
        void opt;
      }}
      placeholder="Tax code…"
      searchPlaceholder="Search tax codes…"
      emptyText="No tax codes configured"
      clearable={false}
      className={className}
    />
  );
}

interface LineItemsSectionProps {
  tenant: string;
  lines: LineRow[];
  onChange: (lines: LineRow[]) => void;
  currency?: string;
  onRequestCreateItem?: (query: string, lineIndex: number) => void;
}

export function LineItemsSection({ tenant, lines, onChange, currency = 'KES', onRequestCreateItem }: LineItemsSectionProps) {
  const updateLine = useCallback((idx: number, patch: Partial<LineRow>) => {
    onChange(lines.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }, [lines, onChange]);

  const { data: taxCodesData } = useTaxCodes(tenant);
  const activeTaxCodes = useMemo(
    () => (taxCodesData?.tax_codes ?? []).filter(tc => tc.is_active),
    [taxCodesData],
  );
  const taxCodesByCode = useMemo(
    () => new Map(activeTaxCodes.map(tc => [tc.code, tc])),
    [activeTaxCodes],
  );
  const taxCodeOptions: ComboboxOption[] = useMemo(
    () => activeTaxCodes.map(tc => ({
      value: tc.code,
      label: `${tc.name} (${Number(tc.rate)}%)`,
      hint: tc.kra_code || undefined,
    })),
    [activeTaxCodes],
  );

  const removeLine = (idx: number) => {
    if (lines.length > 1) onChange(lines.filter((_, i) => i !== idx));
  };

  const computed = lines.map(l => {
    // Billable net folds in progress/milestone completion (qty × rate × completion%).
    const gross = l.quantity * l.unit_price * lineCompletionFactor(l.completion_percent);
    const discount = l.discount_amount || 0;
    const taxable = gross - discount;
    const tax = taxable * (l.tax_rate / 100);
    return { net: gross, discount, tax, total: taxable + tax };
  });

  const subtotal = computed.reduce((s, c) => s + c.net, 0);
  const totalDiscount = computed.reduce((s, c) => s + c.discount, 0);
  const totalTax = computed.reduce((s, c) => s + c.tax, 0);
  const grandTotal = computed.reduce((s, c) => s + c.total, 0);

  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="space-y-4">
    <div className="space-y-0 rounded-xl overflow-hidden border border-border">
      {/* Desktop/tablet: the original grid, ≥ md. Below md a per-line card layout (below) takes
          over — a 12-column grid with 8 narrow columns is unusable at phone width (sub-30px tap
          targets), not just visually cramped, so this isn't a cosmetic hide/show: the two modes
          render genuinely different DOM for the same data. */}
      <div className="hidden md:block">
        <div className="px-4 py-2.5 grid grid-cols-12 gap-2 text-xs font-bold bg-primary text-primary-foreground">
          <div className="col-span-3">Item</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-1 text-center">Rate</div>
          {/* Tax% hosts a searchable combobox (e.g. "VAT (Standard 16%)") — a single 1/12 column
              clips its label to a couple of characters, so it gets a second column here, taken
              from Item (which already truncates its own name/SKU chip gracefully). */}
          <div className="col-span-2 text-center">Tax%</div>
          <div className="col-span-1 text-center">Disc</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-1 text-right">Tax</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        <div className="divide-y divide-border bg-background">
          {lines.map((line, idx) => (
            <div key={line._key} className="grid grid-cols-12 gap-2 px-4 py-3.5 items-start">
              <div className="col-span-3 space-y-1">
                <div className="text-[10px] font-bold text-muted-foreground">{idx + 1}.</div>
                <ItemCombobox
                  tenant={tenant}
                  line={line}
                  onUpdate={patch => updateLine(idx, patch)}
                  onRequestCreate={q => onRequestCreateItem?.(q, idx)}
                />
                {/* Separated from the item picker above so the business-only Cost/%Complete
                    metadata reads as its own row instead of blending into the item chip. */}
                <div className="flex items-center gap-2 flex-wrap pt-1 mt-0.5 border-t border-border/60">
                  {line.unit && <div className="text-[10px] text-muted-foreground">Unit: {line.unit}</div>}
                  {/* Business-only buying price (cost) — drives the internal margin panel, never on the PDF. */}
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="font-bold">Cost</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={line.unit_cost ?? ''}
                      placeholder="—"
                      onChange={e => {
                        const v = e.target.value;
                        updateLine(idx, { unit_cost: v === '' ? undefined : (parseFloat(v) || 0) });
                      }}
                      className="w-20 rounded-md py-1 px-1.5 text-[10px] text-right font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      title="Buying price per unit (internal only)"
                    />
                  </label>
                  {/* Progress/milestone billing — bill a % of qty×rate. Highlighted when < 100. */}
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Bill only this % of the line (progress / milestone billing). Blank or 100 = full line.">
                    <span className="font-bold">% Complete</span>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={line.completion_percent ?? ''}
                      placeholder="100"
                      onChange={e => {
                        const v = e.target.value;
                        updateLine(idx, { completion_percent: v === '' ? undefined : (parseFloat(v) || 0) });
                      }}
                      className={`w-16 rounded-md py-1 px-1.5 text-[10px] text-right font-mono border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
                        line.completion_percent != null && line.completion_percent < 100
                          ? 'border-primary/60 text-primary font-bold'
                          : 'border-input'
                      }`}
                    />
                  </label>
                  {line.completion_percent != null && line.completion_percent < 100 && (
                    <span className="text-[10px] text-primary font-semibold">
                      Billing {line.completion_percent}% of {currency} {fmt(line.quantity * line.unit_price)}
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-1 pt-5">
                <input type="number" min="0.01" step="0.01" value={line.quantity}
                  onChange={e => updateLine(idx, { quantity: parseFloat(e.target.value) || 1 })}
                  className="w-full rounded-lg py-1.5 px-1 text-xs text-center font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="col-span-1 pt-5">
                <input type="number" min="0" step="0.01" value={line.unit_price || ''}
                  onChange={e => updateLine(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg py-1.5 px-1 text-xs text-center font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="col-span-2 pt-5">
                <TaxCodeCell
                  line={line}
                  options={taxCodeOptions}
                  codesByCode={taxCodesByCode}
                  onUpdate={patch => updateLine(idx, patch)}
                />
              </div>
              <div className="col-span-1 pt-5">
                <input type="number" min="0" step="0.01" value={line.discount_amount || ''}
                  onChange={e => updateLine(idx, { discount_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg py-1.5 px-1 text-xs text-center font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="col-span-1 pt-6 text-right font-mono text-xs text-muted-foreground">{fmt(computed[idx].net)}</div>
              <div className="col-span-1 pt-6 text-right font-mono text-xs text-muted-foreground">{fmt(computed[idx].tax)}</div>
              <div className="col-span-2 pt-6 text-right font-mono font-black text-xs text-foreground flex items-center justify-end gap-1">
                <span>{currency} {fmt(computed[idx].total)}</span>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)} className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phone: one card per line, full-width stacked fields with ≥44px touch targets. */}
      <div className="md:hidden divide-y divide-border bg-background">
        {lines.map((line, idx) => (
          <div key={line._key} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Item {idx + 1}</span>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="flex items-center justify-center h-9 w-9 -mr-2 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove line"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <ItemCombobox
              tenant={tenant}
              line={line}
              onUpdate={patch => updateLine(idx, patch)}
              onRequestCreate={q => onRequestCreateItem?.(q, idx)}
            />

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground">Qty</span>
                <input type="number" min="0.01" step="0.01" value={line.quantity}
                  onChange={e => updateLine(idx, { quantity: parseFloat(e.target.value) || 1 })}
                  className="w-full min-h-11 rounded-lg px-3 text-sm font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground">Rate</span>
                <input type="number" min="0" step="0.01" value={line.unit_price || ''}
                  onChange={e => updateLine(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                  className="w-full min-h-11 rounded-lg px-3 text-sm font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </label>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground">Tax code</span>
                <TaxCodeCell
                  line={line}
                  options={taxCodeOptions}
                  codesByCode={taxCodesByCode}
                  onUpdate={patch => updateLine(idx, patch)}
                />
              </div>
              <label className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground">Discount</span>
                <input type="number" min="0" step="0.01" value={line.discount_amount || ''}
                  onChange={e => updateLine(idx, { discount_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full min-h-11 rounded-lg px-3 text-sm font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </label>
            </div>

            {line.unit && <div className="text-[11px] text-muted-foreground">Unit: {line.unit}</div>}

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-xs text-muted-foreground">
                Amount {fmt(computed[idx].net)} + Tax {fmt(computed[idx].tax)}
              </span>
              <span className="text-sm font-black font-mono text-foreground">{currency} {fmt(computed[idx].total)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-accent/30">
        <button type="button" onClick={() => onChange([...lines, newLineRow()])}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-all">
          <Plus className="h-3.5 w-3.5" /> Add Line
        </button>
        <div className="text-xs space-y-0.5 text-right">
          {totalDiscount > 0 && <div className="text-muted-foreground">Discount: <span className="font-mono font-bold text-foreground">-{currency} {fmt(totalDiscount)}</span></div>}
          <div className="text-muted-foreground">Subtotal: <span className="font-mono font-bold text-foreground">{currency} {fmt(subtotal)}</span></div>
          <div className="text-muted-foreground">Tax: <span className="font-mono font-bold text-foreground">{currency} {fmt(totalTax)}</span></div>
          <div className="text-sm font-black text-foreground border-t border-border pt-1 mt-1">
            Total: <span className="font-mono">{currency} {fmt(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Business-only margin analysis — never rendered on the customer PDF. */}
    <MarginPanel
      lines={lines.map(l => ({ description: l.description, quantity: l.quantity, unit_price: l.unit_price, unit_cost: l.unit_cost }))}
      currency={currency}
    />
    </div>
  );
}
