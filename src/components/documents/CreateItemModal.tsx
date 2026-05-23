'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { LineRow } from './sections/LineItemsSection';

interface CreateItemRequest {
  name: string;
  sku?: string;
  item_type?: string;
  unit?: string;
  unit_price?: string;
  tax_code?: string;
  tax_rate?: string;
  description?: string;
}

interface CreatedItem {
  id: string;
  name: string;
  sku?: string;
  item_type?: string;
  unit?: string;
  unit_price?: string;
  tax_code?: string;
  tax_rate?: string;
}

const ITEM_TYPES = ['product', 'service', 'digital', 'subscription', 'bundle'];
const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'hr', 'day', 'month'];

interface Props {
  tenant: string;
  initialName?: string;
  onCreated: (patch: Partial<LineRow>) => void;
  onClose: () => void;
}

export function CreateItemModal({ tenant, initialName = '', onCreated, onClose }: Props) {
  const [form, setForm] = useState({
    name: initialName,
    sku: '',
    item_type: 'product',
    unit: 'pcs',
    unit_price: '',
    tax_code: '',
    tax_rate: '0',
    description: '',
  });

  const mutation = useMutation({
    mutationFn: (body: CreateItemRequest) =>
      apiClient.post<CreatedItem>(`/api/v1/${tenant}/inventory/items`, body),
    onSuccess: (item) => {
      onCreated({
        description: item.name,
        item_id: item.id,
        item_sku: item.sku,
        item_type: item.item_type,
        unit: item.unit,
        unit_price: parseFloat(item.unit_price ?? '0') || 0,
        tax_code: item.tax_code,
        tax_rate: parseFloat(item.tax_rate ?? '0') || 0,
      });
      onClose();
    },
  });

  const field = (key: keyof typeof form, value: string) => setForm(p => ({ ...p, [key]: value }));

  const inputCls = 'w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const labelCls = 'text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1';

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
              <select className={inputCls} value={form.item_type} onChange={e => field('item_type', e.target.value)}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Unit + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Unit</label>
              <select className={inputCls} value={form.unit} onChange={e => field('unit', e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Base Price</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.unit_price}
                onChange={e => field('unit_price', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tax Code</label>
              <input className={inputCls} value={form.tax_code} onChange={e => field('tax_code', e.target.value)} placeholder="VAT" />
            </div>
            <div>
              <label className={labelCls}>Tax Rate (%)</label>
              <input type="number" min="0" max="100" step="0.1" className={inputCls} value={form.tax_rate}
                onChange={e => field('tax_rate', e.target.value)} placeholder="16" />
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
              item_type: form.item_type,
              unit: form.unit,
              unit_price: form.unit_price || undefined,
              tax_code: form.tax_code || undefined,
              tax_rate: form.tax_rate || undefined,
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
