'use client';

import { CodeListSelect } from '@/components/tax/code-list-select';
import { Card } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import { useEtimsItems, useRegisterEtimsItem, useTaxProfile } from '@/hooks/use-tax';
import { useInventoryItems } from '@/hooks/use-inventory';
import { AlertTriangle, CheckCircle2, Info, Loader2, Package, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props { tenantSlug: string }

// Map a catalog tax code to the KRA OSCU tax band for eTIMS registration.
// VAT-16→B (standard), VAT-0→C (zero-rated), VAT-EXEMPT→A (exempt), VAT-8→E, else B.
function taxCodeToBand(taxCode?: string): string {
  const c = (taxCode ?? '').toUpperCase();
  if (c.includes('EXEMPT') || c.includes('EXM')) return 'A';
  if (c.includes('16')) return 'B';
  if (c.includes('8')) return 'E';
  if (c.includes('0') || c.includes('ZERO')) return 'C';
  return 'B';
}

const VAT_BANDS = new Set(['B', 'E']);

// itemTyCd from the inventory catalog type — MUST mirror the treasury classifier so the UI
// registers the same stock-bearing decision the backend would (RECIPE/menu items + vouchers are
// services, ingredients are raw materials). Passing inventory_type lets the backend re-derive it.
function typeToItemTy(t?: string): string {
  switch ((t ?? '').toUpperCase()) {
    case 'INGREDIENT': return '1';
    case 'SERVICE': case 'RECIPE': case 'VOUCHER': return '3';
    default: return '2'; // GOODS, EQUIPMENT
  }
}

// A pre-registration tax-code flag: the item's current band conflicts with what the tenant's
// obligation (and item type) require, which would later break POS/invoice sales.
interface TaxFlag { key: string; sku?: string; name: string; type?: string; current: string; expected: string; reason: string }

type SyncStatus = 'registered' | 'queued' | 'unsynced';

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
  const { data: etimsData, isLoading: etimsLoading } = useEtimsItems(tenantSlug);
  const { data: catalogData, isLoading: catalogLoading } = useInventoryItems(tenantSlug, { limit: 1000 });
  const { data: profile } = useTaxProfile(tenantSlug);
  const register = useRegisterEtimsItem();
  const vatRegistered = profile?.vat_registered ?? true; // optimistic until profile loads
  const EMPTY = { item_cd: '', item_nm: '', item_cls_cd: '1000000000', item_ty_cd: '2', tax_ty_cd: 'B', pkg_unit_cd: 'NT', qty_unit_cd: 'NO', dft_prc: '' };
  const [form, setForm] = useState(EMPTY);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_nm.trim()) return;
    register.mutate(
      { tenantSlug, data: { ...form, item_nm: form.item_nm.trim(), dft_prc: form.dft_prc ? Number(form.dft_prc) : undefined } },
      { onSuccess: () => setForm(EMPTY) },
    );
  };

  // Join the inventory catalogue to the eTIMS item master (by SKU, else by name) so the
  // table shows EVERY catalog item and its KRA sync status — the register surface for the
  // whole catalogue, not just already-registered items.
  const etimsItems = etimsData?.items ?? [];
  const catalog = catalogData?.items ?? [];
  const etimsBySku = useMemo(() => {
    const m = new Map<string, (typeof etimsItems)[number]>();
    for (const e of etimsItems) if (e.sku) m.set(e.sku, e);
    return m;
  }, [etimsItems]);
  const etimsByName = useMemo(() => {
    const m = new Map<string, (typeof etimsItems)[number]>();
    for (const e of etimsItems) m.set((e.item_nm ?? '').toLowerCase(), e);
    return m;
  }, [etimsItems]);

  type Row = {
    key: string; sku?: string; name: string; type?: string; band: string; catalogBand: string;
    status: SyncStatus; itemCd?: string; price?: number; category: string;
  };
  const rows: Row[] = useMemo(() => catalog.map((c) => {
    const e = (c.sku && etimsBySku.get(c.sku)) || etimsByName.get(c.name.toLowerCase());
    const status: SyncStatus = e ? (e.registered ? 'registered' : 'queued') : 'unsynced';
    const catalogBand = taxCodeToBand(c.tax_code);
    return {
      key: c.id, sku: c.sku, name: c.name, type: c.item_type,
      band: e?.tax_ty_cd || catalogBand, catalogBand,
      status, itemCd: e?.item_cd,
      price: c.unit_price ? Number(c.unit_price) : undefined,
      category: c.category_name || 'Uncategorised',
    };
  }), [catalog, etimsBySku, etimsByName]);

  // Obligation-aware pre-flight: the band a tenant SHOULD register/sell an item under.
  //  - not VAT-registered ⇒ Non-VAT (D) for everything (no VAT may be charged).
  //  - VAT-registered ⇒ the item's catalog band (trust the catalog tax code).
  const expectedBand = (r: Row): string => (vatRegistered ? r.catalogBand : 'D');
  // Flag rows whose CURRENT band (registered or catalog-derived) conflicts with the expected
  // band — these would later fail a sale ("Invalid tax type") or wrongly (not) charge VAT.
  const flags: TaxFlag[] = useMemo(() => rows.flatMap((r) => {
    const exp = expectedBand(r);
    if (r.band === exp) return [];
    const reason = !vatRegistered
      ? `Tenant is not VAT-registered — item carries ${VAT_BANDS.has(r.band) ? 'a VAT' : `band ${r.band}`}; expected Non-VAT (D).`
      : `Registered/catalog band ${r.band} differs from the catalog tax code's band ${exp}.`;
    return [{ key: r.key, sku: r.sku, name: r.name, type: r.type, current: r.band, expected: exp, reason }];
  }), [rows, vatRegistered]);
  const flagBySku = useMemo(() => {
    const m = new Map<string, TaxFlag>();
    for (const f of flags) if (f.sku) m.set(f.sku, f);
    return m;
  }, [flags]);

  const [filter, setFilter] = useState<'all' | SyncStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [bulkBusy, setBulkBusy] = useState(false);

  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);
  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.type).filter(Boolean))).sort() as string[], [rows]);

  const counts = useMemo(() => ({
    all: rows.length,
    registered: rows.filter((r) => r.status === 'registered').length,
    queued: rows.filter((r) => r.status === 'queued').length,
    unsynced: rows.filter((r) => r.status === 'unsynced').length,
  }), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) =>
      (filter === 'all' || r.status === filter) &&
      (categoryFilter === 'all' || r.category === categoryFilter) &&
      (typeFilter === 'all' || r.type === typeFilter) &&
      (!term || r.name.toLowerCase().includes(term) || (r.sku ?? '').toLowerCase().includes(term)),
    );
  }, [rows, filter, categoryFilter, typeFilter, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const [showPreflight, setShowPreflight] = useState(false);

  // Register with the CATALOG TYPE + the OBLIGATION-ADJUSTED band, so the backend classifier
  // derives the right itemTyCd (RECIPE/menu→3, ingredient→1) and no VAT band leaks onto a
  // non-VAT tenant's item.
  const syncRow = (r: Row) => register.mutate({ tenantSlug, data: {
    item_nm: r.name, sku: r.sku, inventory_type: r.type, item_cls_cd: '1000000000',
    item_ty_cd: typeToItemTy(r.type), tax_ty_cd: expectedBand(r), pkg_unit_cd: 'NT', qty_unit_cd: 'NO', dft_prc: r.price,
  } });

  // Bulk "sync all" — register every currently-unsynced catalog item sequentially (KRA
  // enforces a per-TIN itemCd sequence, so serial registration avoids sequence collisions).
  const runSyncAll = async () => {
    const targets = rows.filter((r) => r.status !== 'registered');
    if (targets.length === 0) return;
    setBulkBusy(true);
    for (const r of targets) {
      try {
        await register.mutateAsync({ tenantSlug, data: {
          item_nm: r.name, sku: r.sku, inventory_type: r.type, item_cls_cd: '1000000000',
          item_ty_cd: typeToItemTy(r.type), tax_ty_cd: expectedBand(r), pkg_unit_cd: 'NT', qty_unit_cd: 'NO', dft_prc: r.price,
        } });
      } catch { /* keep going — per-row failures surface on the row's status */ }
    }
    setBulkBusy(false);
  };
  // Gate Sync-all behind the obligation pre-flight: if any item's code conflicts with the
  // tenant's obligation, warn first (listing current→expected) so codes can be fixed.
  const syncAllUnsynced = () => {
    if (flags.length > 0) { setShowPreflight(true); return; }
    void runSyncAll();
  };

  const isLoading = etimsLoading || catalogLoading;

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

        {/* Catalogue → eTIMS sync table */}
        <Card className="self-start p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Catalogue items ({counts.all})</h3>
            </div>
            <button
              type="button"
              disabled={bulkBusy || counts.registered === counts.all || counts.all === 0}
              onClick={syncAllUnsynced}
              title="Register every not-yet-registered catalogue item with KRA eTIMS"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync all ({counts.queued + counts.unsynced})
            </button>
          </div>

          {/* Filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(['all', 'unsynced', 'queued', 'registered'] as const).map((f) => (
                <button key={f} type="button" onClick={() => { setFilter(f); setPage(1); }}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`}>
                  {f === 'all' ? 'All' : f === 'unsynced' ? 'Unsynced' : f === 'queued' ? 'Queued' : 'Synced'} ({counts[f]})
                </button>
              ))}
            </div>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs">
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs">
              <option value="all">All types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="relative min-w-40 flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name or SKU…"
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded bg-muted" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No catalogue items match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 font-medium">Item</th>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">Band</th>
                    <th className="px-2 py-2 font-medium">eTIMS code</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.key} className="border-b border-border/50 hover:bg-accent/5">
                      <td className="px-2 py-2">
                        <div className="font-medium">{r.name}</div>
                        {r.sku && <div className="font-mono text-[11px] text-muted-foreground">{r.sku}</div>}
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{r.category}</td>
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center gap-1">
                          {r.band}
                          {r.sku && flagBySku.has(r.sku) && (
                            <span title={flagBySku.get(r.sku)!.reason}>
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{r.itemCd || '—'}</td>
                      <td className="px-2 py-2">
                        {r.status === 'registered'
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"><CheckCircle2 className="h-3 w-3" />Synced</span>
                          : r.status === 'queued'
                          ? <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">Queued</span>
                          : <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Unsynced</span>}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {r.status !== 'registered' && (
                          <button type="button" disabled={register.isPending || bulkBusy} onClick={() => syncRow(r)}
                            className="inline-flex items-center gap-1 rounded-md border border-primary/40 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                            title="Register this catalogue item with KRA eTIMS">
                            <RefreshCw className="h-3 w-3" /> {r.status === 'queued' ? 'Retry' : 'Sync'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                <Pagination page={safePage} totalPages={pageCount} onPageChange={setPage} />
              </div>
            </div>
          )}
        </Card>
      </div>

      {showPreflight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPreflight(false)}>
          <div className="w-full max-w-2xl rounded-xl bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-semibold">Tax-code check before sync</h3>
                  <p className="text-xs text-muted-foreground">
                    {flags.length} item{flags.length === 1 ? '' : 's'} carry a tax code that conflicts with this
                    tenant&apos;s obligations{vatRegistered ? '' : ' (not VAT-registered)'}. Syncing will register them
                    with the <span className="font-medium text-foreground">expected</span> band; fix the catalog codes
                    for lasting consistency.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPreflight(false)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-4">
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="pb-2">Item</th><th className="pb-2">Type</th><th className="pb-2">Current</th><th className="pb-2">Expected</th><th className="pb-2">Why</th></tr>
                </thead>
                <tbody>
                  {flags.map((f) => (
                    <tr key={f.key} className="border-t">
                      <td className="py-2 font-medium">{f.name}{f.sku ? <span className="ml-1 font-mono text-[10px] text-muted-foreground">{f.sku}</span> : null}</td>
                      <td className="py-2">{f.type ?? '—'}</td>
                      <td className="py-2"><span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-destructive">{f.current}</span></td>
                      <td className="py-2"><span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-emerald-600">{f.expected}</span></td>
                      <td className="py-2 text-muted-foreground">{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2 border-t p-4">
              <button onClick={() => setShowPreflight(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">Cancel</button>
              <button
                onClick={() => { setShowPreflight(false); void runSyncAll(); }}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                Sync all with corrected bands
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
