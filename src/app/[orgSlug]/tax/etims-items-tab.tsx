'use client';

import { Card } from '@/components/ui/base';
import { useEtimsItems, useRegisterEtimsItem } from '@/hooks/use-tax';
import { CheckCircle2, Loader2, Package, Plus } from 'lucide-react';
import { useState } from 'react';

interface Props { tenantSlug: string }

const TAX_BANDS = [
  { v: 'A', label: 'A — VAT 16%' },
  { v: 'B', label: 'B — VAT 0%' },
  { v: 'C', label: 'C — Exempt' },
  { v: 'D', label: 'D — Non-VAT' },
  { v: 'E', label: 'E — VAT 8%' },
];
const ITEM_TYPES = [
  { v: '1', label: 'Raw material' },
  { v: '2', label: 'Finished goods' },
  { v: '3', label: 'Service' },
];

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * EtimsItemsTab — the KRA eTIMS item master. KRA requires every item to be registered
 * (saveItemInfo) BEFORE a sale referencing it can be transmitted, so this is a go-live
 * prerequisite. Lists registered items + a form to register a new one.
 */
export function EtimsItemsTab({ tenantSlug }: Props) {
  const { data, isLoading } = useEtimsItems(tenantSlug);
  const register = useRegisterEtimsItem();
  const [form, setForm] = useState({ item_cd: '', item_nm: '', item_cls_cd: '', item_ty_cd: '2', tax_ty_cd: 'A', pkg_unit_cd: 'NT', qty_unit_cd: 'U', dft_prc: '' });
  const items = data?.items ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_cd || !form.item_nm) return;
    register.mutate(
      { tenantSlug, data: { ...form, dft_prc: form.dft_prc ? Number(form.dft_prc) : undefined } },
      { onSuccess: () => setForm({ item_cd: '', item_nm: '', item_cls_cd: '', item_ty_cd: '2', tax_ty_cd: 'A', pkg_unit_cd: 'NT', qty_unit_cd: 'U', dft_prc: '' }) },
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 text-sm text-muted-foreground">
        KRA requires every item to be registered in the eTIMS item master <span className="font-medium text-foreground">before</span> a sale referencing it can be transmitted. Register your catalogue items here.
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Register form */}
        <Card className="p-4 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Register item</h3></div>
          <form onSubmit={submit} className="space-y-3">
            <input className={inputCls} placeholder="Item code *" value={form.item_cd} onChange={(e) => setForm({ ...form, item_cd: e.target.value })} />
            <input className={inputCls} placeholder="Item name *" value={form.item_nm} onChange={(e) => setForm({ ...form, item_nm: e.target.value })} />
            <input className={inputCls} placeholder="Classification code (UNSPSC)" value={form.item_cls_cd} onChange={(e) => setForm({ ...form, item_cls_cd: e.target.value })} />
            <select className={inputCls} value={form.item_ty_cd} onChange={(e) => setForm({ ...form, item_ty_cd: e.target.value })}>
              {ITEM_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
            <select className={inputCls} value={form.tax_ty_cd} onChange={(e) => setForm({ ...form, tax_ty_cd: e.target.value })}>
              {TAX_BANDS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Pkg unit" value={form.pkg_unit_cd} onChange={(e) => setForm({ ...form, pkg_unit_cd: e.target.value })} />
              <input className={inputCls} placeholder="Qty unit" value={form.qty_unit_cd} onChange={(e) => setForm({ ...form, qty_unit_cd: e.target.value })} />
            </div>
            <input className={inputCls} type="number" step="0.01" placeholder="Default price" value={form.dft_prc} onChange={(e) => setForm({ ...form, dft_prc: e.target.value })} />
            <button type="submit" disabled={register.isPending || !form.item_cd || !form.item_nm}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Register
            </button>
          </form>
        </Card>

        {/* Item list */}
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Registered items ({items.length})</h3></div>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded bg-muted" />)}</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 font-medium">Code</th>
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Band</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-b border-border/50 hover:bg-accent/5">
                      <td className="px-2 py-2 font-mono text-xs">{it.item_cd}</td>
                      <td className="px-2 py-2">{it.item_nm}</td>
                      <td className="px-2 py-2">{it.tax_ty_cd || '—'}</td>
                      <td className="px-2 py-2">
                        {it.registered
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"><CheckCircle2 className="h-3 w-3" />Registered</span>
                          : <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
