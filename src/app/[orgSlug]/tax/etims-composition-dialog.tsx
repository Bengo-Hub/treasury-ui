'use client';

import { useRegisterEtimsItemComposition } from '@/hooks/use-tax-etims-branch';
import type { EtimsComposition, EtimsItem } from '@/lib/api/tax';
import { Layers, Loader2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface Props {
  tenantSlug: string;
  /** The registered finished good the composition is declared on. */
  parent: { itemCd: string; name: string; composition: EtimsComposition[] };
  /** Every eTIMS item of the tenant; the components are picked from those KRA holds stock for. */
  etimsItems: EtimsItem[];
  onClose: () => void;
}

/**
 * Declares a finished good's raw-material components with KRA (saveItemComposition). KRA only accepts
 * a component that already has a stock master, so only registered items with eTIMS stock are offered.
 * Components KRA accepted are listed on the item row and here; KRA has no read API, so the list is
 * what treasury recorded when each save succeeded.
 */
export function EtimsCompositionDialog({ tenantSlug, parent, etimsItems, onClose }: Props) {
  const save = useRegisterEtimsItemComposition();
  const [componentCd, setComponentCd] = useState('');
  const [qty, setQty] = useState('');

  const candidates = useMemo(
    () => etimsItems
      .filter((e) => e.registered && (e.cum_stock_in ?? 0) > 0 && e.item_cd !== parent.itemCd)
      .sort((a, b) => a.item_nm.localeCompare(b.item_nm)),
    [etimsItems, parent.itemCd],
  );
  const quantity = Number(qty);
  const valid = !!componentCd && quantity > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    save.mutate(
      { tenantSlug, body: { item_cd: parent.itemCd, cpst_item_cd: componentCd, cpst_qty: quantity } },
      { onSuccess: () => { setComponentCd(''); setQty(''); } },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-background shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Item composition">
        <div className="flex items-start justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">Composition: {parent.name}</h3>
              <p className="font-mono text-[11px] text-muted-foreground">{parent.itemCd}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-4">
          {parent.composition.length > 0 ? (
            <ul className="divide-y divide-border/60 rounded-lg border border-border text-sm">
              {parent.composition.map((c) => (
                <li key={c.item_cd} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate">{c.name || c.item_cd}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">x {c.qty}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No components saved with KRA yet.</p>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="cpst-item">Raw-material component</label>
              <select id="cpst-item" className={inputCls} value={componentCd} onChange={(e) => setComponentCd(e.target.value)}>
                <option value="">Select a component</option>
                {candidates.map((c) => (
                  <option key={c.item_cd} value={c.item_cd}>
                    {c.item_nm}{c.sku ? ` (${c.sku})` : ''} · KRA stock {c.cum_stock_in}
                  </option>
                ))}
              </select>
              {candidates.length === 0 && (
                <p className="text-xs text-amber-600">
                  No registered item has stock at KRA yet. Stock the raw material in first (the Stock column&apos;s Reconcile sends it).
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="cpst-qty">Quantity used per finished unit</label>
              <input id="cpst-qty" type="number" min="0" step="any" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">Close</button>
              <button type="submit" disabled={!valid || save.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save with KRA
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
