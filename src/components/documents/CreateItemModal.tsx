'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { createInventoryItem, type CreateInventoryItemRequest } from '@/lib/api/inventory';
import { useInventoryUnits, useInventoryItemTypes } from '@/hooks/use-inventory';
import { useTaxCodes } from '@/hooks/use-tax';
import type { LineRow } from './sections/LineItemsSection';

// Matches inventory-api's item `type` enum (internal/ent/schema/item.go) so the
// fallback (used only when the API is unreachable) stays in lock-step with it.
const FALLBACK_ITEM_TYPES = [
  { value: 'GOODS', label: 'Goods' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'RECIPE', label: 'Recipe' },
  { value: 'INGREDIENT', label: 'Ingredient' },
  { value: 'VOUCHER', label: 'Voucher' },
  { value: 'EQUIPMENT', label: 'Equipment' },
];
const FALLBACK_UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'hr', 'day', 'month'];

interface Props {
  tenant: string;
  initialName?: string;
  onCreated: (patch: Partial<LineRow>) => void;
  onClose: () => void;
}

export function CreateItemModal({ tenant, initialName = '', onCreated, onClose }: Props) {
  const { data: unitsData, isLoading: unitsLoading } = useInventoryUnits(tenant);
  const { data: typesData, isLoading: typesLoading } = useInventoryItemTypes(tenant);
  const { data: taxData, isLoading: taxLoading } = useTaxCodes(tenant);

  // Units + item types are sourced from inventory-api (via the treasury-api proxy);
  // fall back to the static lists only when the API returns nothing valid.
  const apiUnits = unitsData?.units?.map(u => u.abbreviation || u.name).filter(Boolean) ?? [];
  const units = apiUnits.length ? apiUnits : FALLBACK_UNITS;

  const apiItemTypes = typesData?.item_types ?? [];
  const itemTypes = apiItemTypes.length ? apiItemTypes : FALLBACK_ITEM_TYPES;

  // Tax codes come from treasury-api — the user picks a code rather than typing a
  // custom one, and the rate is derived from the selected code (no free-text rate).
  const taxCodes = taxData?.tax_codes ?? [];

  const [form, setForm] = useState({
    name: initialName,
    sku: '',
    item_type: '',
    unit: '',
    unit_price: '',
    cost_price: '',
    tax_code: '',
    tax_rate: '0',
    description: '',
  });

  // Set defaults once data loads
  const defaultType = form.item_type || itemTypes[0]?.value || '';
  const defaultUnit = form.unit || units[0] || '';

  // The tax rate shown is always derived from the selected tax code.
  const selectedTaxCode = taxCodes.find(tc => tc.code === form.tax_code);
  const derivedTaxRate = selectedTaxCode ? Number(selectedTaxCode.rate) || 0 : 0;

  const mutation = useMutation({
    mutationFn: (body: CreateInventoryItemRequest) => createInventoryItem(tenant, body),
    onSuccess: (item) => {
      onCreated({
        description: item.name,
        item_id: item.id,
        item_sku: item.sku,
        item_type: item.item_type,
        unit: item.unit,
        unit_price: parseFloat(item.unit_price ?? '0') || 0,
        unit_cost: item.cost_price != null
          ? (parseFloat(item.cost_price) || 0)
          : (form.cost_price ? (parseFloat(form.cost_price) || 0) : undefined),
        tax_code: item.tax_code || form.tax_code || undefined,
        // inventory persists the code, not the rate — carry the rate derived from
        // the selected treasury tax code so the line taxes correctly.
        tax_rate: parseFloat(item.tax_rate ?? '') || derivedTaxRate,
      });
      onClose();
    },
  });

  const field = (key: keyof typeof form, value: string) => setForm(p => ({ ...p, [key]: value }));

  const inputCls = 'w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const labelCls = 'text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1';

  const isLoading = unitsLoading || typesLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-black text-foreground">Create New Inventory Item</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Item Name <span className="text-destructive">*</span></label>
            <input className={inputCls} value={form.name} onChange={e => field('name', e.target.value)} placeholder="e.g. Web Design Service" />
          </div>

          {/* SKU + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>SKU / Code</label>
              <input className={inputCls} value={form.sku} onChange={e => field('sku', e.target.value)} placeholder="WDS-001" />
            </div>
            <div>
              <label className={labelCls}>Item Type</label>
              {isLoading ? (
                <div className={inputCls + ' flex items-center gap-2 text-muted-foreground'}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </div>
              ) : (
                <select className={inputCls} value={form.item_type || defaultType} onChange={e => field('item_type', e.target.value)}>
                  {itemTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Unit + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Unit</label>
              {isLoading ? (
                <div className={inputCls + ' flex items-center gap-2 text-muted-foreground'}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </div>
              ) : (
                <select className={inputCls} value={form.unit || defaultUnit} onChange={e => field('unit', e.target.value)}>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className={labelCls}>Selling Price</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.unit_price}
                onChange={e => field('unit_price', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Cost / buying price — business-only, feeds the internal margin panel. */}
          <div>
            <label className={labelCls}>Cost / Buying Price <span className="font-normal normal-case text-muted-foreground/70">(internal only)</span></label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.cost_price}
              onChange={e => field('cost_price', e.target.value)} placeholder="0.00" />
          </div>

          {/* Tax — code is chosen from the treasury tax register; the rate is derived. */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tax Code</label>
              {taxLoading ? (
                <div className={inputCls + ' flex items-center gap-2 text-muted-foreground'}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </div>
              ) : (
                <select className={inputCls} value={form.tax_code} onChange={e => field('tax_code', e.target.value)}>
                  <option value="">None / Exempt</option>
                  {taxCodes.map(tc => (
                    <option key={tc.id} value={tc.code}>
                      {tc.code} — {tc.name} ({Number(tc.rate) || 0}%)
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelCls}>Tax Rate (%)</label>
              <input type="number" readOnly value={derivedTaxRate}
                className={inputCls + ' bg-muted/40 cursor-not-allowed'}
                title="Derived from the selected tax code" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={2} className={inputCls + ' resize-none'} value={form.description}
              onChange={e => field('description', e.target.value)} placeholder="Optional item description…" />
          </div>

          {mutation.isError && (
            <p className="text-xs text-destructive font-semibold">Failed to create item. Please try again.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-accent/20">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-all">
            Cancel
          </button>
          <button type="button" disabled={!form.name.trim() || mutation.isPending}
            onClick={() => mutation.mutate({
              name: form.name.trim(),
              sku: form.sku || undefined,
              item_type: form.item_type || defaultType || undefined,
              unit: form.unit || defaultUnit || undefined,
              unit_price: form.unit_price || undefined,
              cost_price: form.cost_price || undefined,
              tax_code: form.tax_code || undefined,
              description: form.description || undefined,
            })}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {mutation.isPending ? 'Creating…' : 'Create & Add to Line'}
          </button>
        </div>
      </div>
    </div>
  );
}
