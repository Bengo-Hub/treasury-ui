'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import {
  createInventoryItem,
  itemTypeKind, unitKind, categoryKind, matchesItemKind,
  type CreateInventoryItemRequest, type InventoryCategory,
} from '@/lib/api/inventory';
import {
  useInventoryUnits, useInventoryItemTypes, useInventoryCategories,
  useCreateInventoryUnit, useCreateInventoryCategory,
} from '@/hooks/use-inventory';
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
// Fallback units carry a `type` so the goods/service filter still works when the API is
// unreachable (mirrors inventory-api's seeded unit types).
const FALLBACK_UNITS: { name: string; abbreviation: string; type: string }[] = [
  { name: 'PIECE', abbreviation: 'pcs', type: 'count' },
  { name: 'KG', abbreviation: 'kg', type: 'weight' },
  { name: 'GRAM', abbreviation: 'g', type: 'weight' },
  { name: 'LITRE', abbreviation: 'l', type: 'volume' },
  { name: 'ML', abbreviation: 'ml', type: 'volume' },
  { name: 'METRE', abbreviation: 'm', type: 'length' },
  { name: 'HOUR', abbreviation: 'hr', type: 'time' },
  { name: 'DAY', abbreviation: 'day', type: 'time' },
  { name: 'MONTH', abbreviation: 'month', type: 'time' },
  { name: 'PERCENT', abbreviation: '%', type: 'service' },
  { name: 'PROJECT', abbreviation: 'project', type: 'service' },
  { name: 'SESSION', abbreviation: 'session', type: 'service' },
];

interface Props {
  tenant: string;
  initialName?: string;
  onCreated: (patch: Partial<LineRow>) => void;
  onClose: () => void;
}

export function CreateItemModal({ tenant, initialName = '', onCreated, onClose }: Props) {
  const { data: unitsData, isLoading: unitsLoading } = useInventoryUnits(tenant);
  const { data: typesData, isLoading: typesLoading } = useInventoryItemTypes(tenant);
  const { data: catsData, isLoading: catsLoading } = useInventoryCategories(tenant);
  const { data: taxData, isLoading: taxLoading } = useTaxCodes(tenant);
  const createUnit = useCreateInventoryUnit(tenant);
  const createCategory = useCreateInventoryCategory(tenant);

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
    category_id: '',
  });
  // Inline "+" create state for a missing unit / category.
  const [addUnit, setAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [addCat, setAddCat] = useState(false);
  const [newCat, setNewCat] = useState('');

  // Set defaults once data loads
  const defaultType = form.item_type || itemTypes[0]?.value || '';

  // Goods vs service filtering: the selected item type decides which units + categories are
  // offered (service items use hr/day/%/project…; goods use kg/pcs/l…). Anything classified
  // "both" (incl. user-created) is always shown. See lib/api/inventory classification helpers.
  const kind = itemTypeKind(defaultType);
  const apiUnits = unitsData?.units ?? [];
  const sourceUnits = apiUnits.length ? apiUnits : FALLBACK_UNITS;
  const filteredUnits = sourceUnits.filter(u => matchesItemKind(unitKind(u), kind));
  const units = (filteredUnits.length ? filteredUnits : sourceUnits)
    .map(u => u.abbreviation || u.name).filter(Boolean);

  const allCats = catsData?.categories ?? [];
  const filteredCats = allCats.filter(c => matchesItemKind(categoryKind(c), kind));

  const defaultUnit = form.unit || units[0] || '';

  // When the item type flips between goods/service, drop a now-incompatible unit/category so
  // the pickers reset instead of keeping a stale selection.
  useEffect(() => {
    if (form.unit && !units.includes(form.unit)) {
      setForm(p => ({ ...p, unit: '' }));
    }
    if (form.category_id && !filteredCats.some(c => c.id === form.category_id)) {
      setForm(p => ({ ...p, category_id: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // The tax rate shown is always derived from the selected tax code.
  const selectedTaxCode = taxCodes.find(tc => tc.code === form.tax_code);
  const derivedTaxRate = selectedTaxCode ? Number(selectedTaxCode.rate) || 0 : 0;

  const mutation = useMutation({
    mutationFn: (body: CreateInventoryItemRequest) => createInventoryItem(tenant, body),
    onSuccess: (item) => {
      const detail = (item.description ?? form.description).trim();
      onCreated({
        // Title + optional detail (split on newline) so the document renders the detail small
        // and wrapped beneath the item title — matches the picked-item behaviour.
        description: detail ? `${item.name}\n${detail}` : item.name,
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

  // Create a missing unit in inventory-api, tagged with a type that matches the current item
  // kind (service items → "service" type unit) so it classifies correctly next time.
  const handleCreateUnit = () => {
    const name = newUnit.trim();
    if (!name) return;
    createUnit.mutate(
      { name: name.toUpperCase(), abbreviation: name.toLowerCase(), type: kind === 'service' ? 'service' : 'count' },
      {
        onSuccess: (u) => {
          setForm(p => ({ ...p, unit: u.abbreviation || u.name }));
          setNewUnit(''); setAddUnit(false);
          toast.success(`Unit "${u.name}" created`);
        },
        onError: () => toast.error('Could not create unit (it may already exist)'),
      },
    );
  };

  // Create a missing category in inventory-api. A service-kind category gets a code that the
  // classifier recognises as service so it filters correctly (CONx…); goods get GENx.
  const handleCreateCategory = () => {
    const name = newCat.trim();
    if (!name) return;
    const code = (kind === 'service' ? 'CON' : 'GEN') + name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    createCategory.mutate(
      { name, code: code.slice(0, 10) },
      {
        onSuccess: (c) => {
          setForm(p => ({ ...p, category_id: c.id }));
          setNewCat(''); setAddCat(false);
          toast.success(`Category "${c.name}" created`);
        },
        onError: () => toast.error('Could not create category (it may already exist)'),
      },
    );
  };

  const inputCls = 'w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const labelCls = 'text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1';

  const isLoading = unitsLoading || typesLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-black text-foreground">Create New Inventory Item</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
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

          {/* Unit + Price. Units are filtered to the item kind (service vs goods); "+" creates a
              missing one in inventory. */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Unit <span className="font-normal normal-case text-muted-foreground/70">({kind === 'service' ? 'service' : 'goods'})</span>
              </label>
              {isLoading ? (
                <div className={inputCls + ' flex items-center gap-2 text-muted-foreground'}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </div>
              ) : addUnit ? (
                <div className="flex items-center gap-1.5">
                  <input autoFocus className={inputCls} value={newUnit} placeholder="e.g. project"
                    onChange={e => setNewUnit(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateUnit(); } }} />
                  <button type="button" onClick={handleCreateUnit} disabled={!newUnit.trim() || createUnit.isPending}
                    className="shrink-0 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50" title="Create unit">
                    {createUnit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => { setAddUnit(false); setNewUnit(''); }}
                    className="shrink-0 p-2 rounded-lg border border-border text-muted-foreground hover:bg-accent" title="Cancel">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <select className={inputCls} value={form.unit || defaultUnit} onChange={e => field('unit', e.target.value)}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button type="button" onClick={() => setAddUnit(true)}
                    className="shrink-0 p-2 rounded-lg border border-border text-primary hover:bg-accent" title="Add a new unit">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Selling Price</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.unit_price}
                onChange={e => field('unit_price', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Category — filtered to the item kind; "+" creates a missing one in inventory. */}
          <div>
            <label className={labelCls}>
              Category <span className="font-normal normal-case text-muted-foreground/70">({kind === 'service' ? 'service' : 'goods'})</span>
            </label>
            {catsLoading ? (
              <div className={inputCls + ' flex items-center gap-2 text-muted-foreground'}>
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : addCat ? (
              <div className="flex items-center gap-1.5">
                <input autoFocus className={inputCls} value={newCat} placeholder="e.g. Consultancy"
                  onChange={e => setNewCat(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }} />
                <button type="button" onClick={handleCreateCategory} disabled={!newCat.trim() || createCategory.isPending}
                  className="shrink-0 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50" title="Create category">
                  {createCategory.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </button>
                <button type="button" onClick={() => { setAddCat(false); setNewCat(''); }}
                  className="shrink-0 p-2 rounded-lg border border-border text-muted-foreground hover:bg-accent" title="Cancel">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <select className={inputCls} value={form.category_id} onChange={e => field('category_id', e.target.value)}>
                  <option value="">Uncategorised</option>
                  {filteredCats.map((c: InventoryCategory) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setAddCat(true)}
                  className="shrink-0 p-2 rounded-lg border border-border text-primary hover:bg-accent" title="Add a new category">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-accent/20 shrink-0">
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
              category_id: form.category_id || undefined,
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
