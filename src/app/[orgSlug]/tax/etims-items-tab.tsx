'use client';

import { CodeListSelect } from '@/components/tax/code-list-select';
import { Card } from '@/components/ui/base';
import { useEtimsItems, useRegisterEtimsItem } from '@/hooks/use-tax';
import { CheckCircle2, Info, Loader2, Package, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface Props { tenantSlug: string }

// Fallbacks rendered ONLY until the tenant syncs the KRA code lists (eTIMS Devices →
// Refresh Code Lists) — after that every option comes from the live synced list.
// Band letters follow the OSCU convention proven live 2026-07-13: A=Exempt, B=VAT 16%,
// C=Zero-rated, D=Non-VAT, E=VAT 8%.
const TAX_BANDS = [
  { value: 'B', label: 'B — VAT 16%' },
  { value: 'A', label: 'A — Exempt' },
  { value: 'C', label: 'C — Zero-rated' },
  { value: 'D', label: 'D — Non-VAT' },
  { value: 'E', label: 'E — VAT 8%' },
];
const ITEM_TYPES = [
  { value: '1', label: '1 — Raw material' },
  { value: '2', label: '2 — Finished product' },
  { value: '3', label: '3 — Service' },
];
const ITEM_CLASSES = [
  { value: '1000000000', label: '1000000000 — General goods (verified default)' },
];
const PKG_UNITS = [
  { value: 'NT', label: 'NT — Net (no package)' },
  { value: 'BG', label: 'BG — Bag' },
  { value: 'BX', label: 'BX — Box' },
  { value: 'BA', label: 'BA — Barrel' },
];
// KRA itemCd embeds the qty unit at a fixed 2-char position, so only 2-char codes are valid
// here (the 1-char "U" breaks the itemCd → KRA "Incorrect QtyUnitCd Prefix"). NO = Number/each.
const QTY_UNITS = [
  { value: 'NO', label: 'NO — Number / each' },
  { value: 'KG', label: 'KG — Kilo-Gramme' },
  { value: 'DZ', label: 'DZ — Dozen' },
  { value: 'PA', label: 'PA — Packet' },
  { value: 'BX', label: 'BX — Box' },
  { value: 'CA', label: 'CA — Can' },
];

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Labelled form field with an optional info hint (native title tooltip keeps it dependency-free). */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {hint && (
          <span title={hint} className="inline-flex cursor-help" aria-label={hint}>
            <Info className="h-3 w-3 text-muted-foreground/70" />
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

/**
 * EtimsItemsTab — the KRA eTIMS item master. KRA requires every item to be registered
 * (saveItemInfo) BEFORE a sale referencing it can be transmitted, so this is a go-live
 * prerequisite. Lists registered items + a form to register a new one.
 */
export function EtimsItemsTab({ tenantSlug }: Props) {
  const { data, isLoading } = useEtimsItems(tenantSlug);
  const register = useRegisterEtimsItem();
  const EMPTY = { item_cd: '', item_nm: '', item_cls_cd: '1000000000', item_ty_cd: '2', tax_ty_cd: 'B', pkg_unit_cd: 'NT', qty_unit_cd: 'NO', dft_prc: '' };
  const [form, setForm] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_nm.trim()) return;
    register.mutate(
      { tenantSlug, data: { ...form, item_nm: form.item_nm.trim(), dft_prc: form.dft_prc ? Number(form.dft_prc) : undefined } },
      { onSuccess: () => setForm(EMPTY) },
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 text-sm text-muted-foreground">
        KRA requires every item to be registered in the eTIMS item master <span className="font-medium text-foreground">before</span> a sale referencing it can be transmitted. Register your catalogue items here.
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Register form */}
        <Card className="self-start p-4 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Register item</h3></div>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Item code" hint="KRA eTIMS item code. Leave blank — it is auto-generated in the required format (country + type + package + quantity units + sequential number, e.g. KE2NTBA00000004). KRA enforces the sequence per PIN.">
              <input className={inputCls} placeholder="Auto-generated if left blank" value={form.item_cd} onChange={(e) => setForm({ ...form, item_cd: e.target.value })} />
            </Field>
            <Field label="Item name *" hint="Product or service name as it should appear on KRA tax invoices.">
              <input className={inputCls} placeholder="e.g. Espresso 250g" value={form.item_nm} onChange={(e) => setForm({ ...form, item_nm: e.target.value })} />
            </Field>
            <Field label="Classification (UNSPSC)" hint="KRA item classification from the eTIMS classification list (selectItemClass). If unsure keep the default General goods class — it is accepted for any item.">
              <CodeListSelect tenantSlug={tenantSlug} codeType="ITEM_CLS" searchable
                value={form.item_cls_cd} onChange={(v) => setForm({ ...form, item_cls_cd: v })}
                fallbackOptions={ITEM_CLASSES} placeholder="Search classifications…" />
            </Field>
            <Field label="Item type" hint="1 Raw material, 2 Finished product, 3 Service — becomes the third character of the item code.">
              <CodeListSelect tenantSlug={tenantSlug} codeType="ITEM_TY"
                value={form.item_ty_cd} onChange={(v) => setForm({ ...form, item_ty_cd: v })}
                fallbackOptions={ITEM_TYPES} />
            </Field>
            <Field label="Tax band" hint="KRA VAT band (OSCU): B 16% standard, A exempt, C zero-rated, D non-VAT, E 8%. Determines the VAT KRA expects on sales of this item.">
              <CodeListSelect tenantSlug={tenantSlug} codeType="TAX_TY"
                value={form.tax_ty_cd} onChange={(v) => setForm({ ...form, tax_ty_cd: v })}
                fallbackOptions={TAX_BANDS} />
            </Field>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Package unit" hint="KRA package unit code, e.g. NT = no package/net. Options come from the synced KRA code list.">
                <CodeListSelect tenantSlug={tenantSlug} codeType="PKG_UNIT"
                  value={form.pkg_unit_cd} onChange={(v) => setForm({ ...form, pkg_unit_cd: v })}
                  fallbackOptions={PKG_UNITS} />
              </Field>
              <Field label="Quantity unit" hint="KRA quantity unit code, e.g. U = unit/each, KG = kilogramme. Options come from the synced KRA code list.">
                <CodeListSelect tenantSlug={tenantSlug} codeType="QTY_UNIT"
                  value={form.qty_unit_cd} onChange={(v) => setForm({ ...form, qty_unit_cd: v })}
                  fallbackOptions={QTY_UNITS} />
              </Field>
            </div>
            <Field label="Default unit price (KES)" hint="Default selling price sent to KRA with the item master; individual sales can override it.">
              <input className={inputCls} type="number" step="0.01" placeholder="0.00" value={form.dft_prc} onChange={(e) => setForm({ ...form, dft_prc: e.target.value })} />
            </Field>
            <button type="submit" disabled={register.isPending || !form.item_nm.trim()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Register
            </button>
          </form>
        </Card>

        {/* Item list */}
        <Card className="self-start p-4 lg:col-span-2">
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
                  {pageItems.map((it) => (
                    <tr key={it.id} className="border-b border-border/50 hover:bg-accent/5">
                      <td className="px-2 py-2 font-mono text-xs">{it.item_cd}</td>
                      <td className="px-2 py-2">{it.item_nm}</td>
                      <td className="px-2 py-2">{it.tax_ty_cd || '—'}</td>
                      <td className="px-2 py-2">
                        {it.registered
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"><CheckCircle2 className="h-3 w-3" />Registered</span>
                          : (
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">Pending</span>
                              <button
                                type="button"
                                disabled={register.isPending}
                                onClick={() => register.mutate({ tenantSlug, data: {
                                  item_cd: it.item_cd, item_nm: it.item_nm, item_cls_cd: it.item_cls_cd || '1000000000',
                                  item_ty_cd: it.item_ty_cd || '2', tax_ty_cd: it.tax_ty_cd || 'B',
                                  pkg_unit_cd: it.pkg_unit_cd || 'NT', qty_unit_cd: it.qty_unit_cd || 'NO',
                                  dft_prc: it.dft_prc || undefined,
                                } })}
                                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs font-medium hover:bg-accent/10 disabled:opacity-50"
                                title="Retry KRA eTIMS registration for this item"
                              >
                                <RefreshCw className="h-3 w-3" /> Retry sync
                              </button>
                            </span>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length > PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, items.length)} of {items.length} items
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                      className="rounded-md border border-border px-2.5 py-1 font-medium hover:bg-accent/10 disabled:opacity-40">
                      Previous
                    </button>
                    <span className="tabular-nums">{safePage} / {pageCount}</span>
                    <button type="button" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}
                      className="rounded-md border border-border px-2.5 py-1 font-medium hover:bg-accent/10 disabled:opacity-40">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
