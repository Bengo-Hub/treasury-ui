'use client';

import { useOrgBranding } from '@/hooks/use-org-branding';
import { useCRMContacts } from '@/hooks/use-crm-contacts';
import { useCreateInvoice, useInvoice, useUpdateInvoice } from '@/hooks/use-invoices';
import type { CreateInvoiceRequest, UpdateInvoiceRequest } from '@/lib/api/invoices';
import { crmContactDisplayName, type CRMContact } from '@/lib/api/crm';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, Search, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LineItemsSection, newLineRow, type LineRow } from '@/components/documents/sections/LineItemsSection';
import { TotalsSection, type AdditionalCharge } from '@/components/documents/sections/TotalsSection';
import { CurrencySection } from '@/components/documents/sections/CurrencySection';
import { TermsNotesSection } from '@/components/documents/sections/TermsNotesSection';
import { CreateItemModal } from '@/components/documents/CreateItemModal';

interface Props {
  effectiveTenant: string;
  onClose: () => void;
  editId?: string;
}

export function CreateInvoiceView({ effectiveTenant, onClose, editId }: Props) {
  const isEdit = !!editId;

  const createMutation = useCreateInvoice(effectiveTenant);
  const updateMutation = useUpdateInvoice(effectiveTenant, editId ?? '');
  const { data: brand, isLoading: brandLoading } = useOrgBranding(effectiveTenant);
  const { data: existing, isLoading: existingLoading } = useInvoice(effectiveTenant, editId ?? '', isEdit);

  const [initialized, setInitialized] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const clientRef = useRef<HTMLInputElement>(null);
  const { data: crmContacts = [] } = useCRMContacts(effectiveTenant, clientSearch);

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    currency: 'KES',
    terms: 'Thanks for doing business with us.',
    notes: '',
  });
  const [lines, setLines] = useState<LineRow[]>([newLineRow()]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountMode, setGlobalDiscountMode] = useState<'flat' | 'percent'>('flat');
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [createItemTarget, setCreateItemTarget] = useState<number | null>(null);

  useEffect(() => {
    if (isEdit && existing && !initialized) {
      if (existing.customer_id) setCustomerId(existing.customer_id);
      if (existing.customer_name) setClientSearch(existing.customer_name);
      setForm({
        customer_name: existing.customer_name ?? '',
        customer_email: existing.customer_email ?? '',
        invoice_date: existing.invoice_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        due_date: existing.due_date?.slice(0, 10) ?? '',
        currency: existing.currency ?? 'KES',
        terms: existing.terms ?? '',
        notes: existing.notes ?? '',
      });
      setLines(existing.lines?.map(l => ({
        _key: Math.random().toString(36).slice(2),
        description: l.description,
        item_id: l.item_id,
        item_sku: l.item_sku,
        item_type: l.item_type,
        image_url: l.image_url,
        unit: l.unit,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        tax_code: l.tax_code,
        tax_rate: Number(l.tax_rate),
        discount_amount: Number(l.discount_amount) || 0,
      })) ?? [newLineRow()]);
      setInitialized(true);
    }
  }, [isEdit, existing, initialized]);

  const computedLines = lines.map(l => {
    const net = l.quantity * l.unit_price;
    const disc = l.discount_amount || 0;
    return { net, disc, tax: (net - disc) * (l.tax_rate / 100) };
  });
  const subtotal = computedLines.reduce((s, c) => s + c.net, 0);
  const totalDiscount = computedLines.reduce((s, c) => s + c.disc, 0);
  const totalTax = computedLines.reduce((s, c) => s + c.tax, 0);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const selectContact = useCallback((c: CRMContact) => {
    setCustomerId(c.id);
    const name = crmContactDisplayName(c);
    setClientSearch(name);
    setForm(p => ({ ...p, customer_name: name, customer_email: c.email ?? '' }));
    setShowSuggestions(false);
  }, []);

  const handleSave = useCallback(() => {
    const filtered = lines.filter(l => l.description.trim());
    const linePayload = filtered.map(l => ({
      description: l.description,
      item_id: l.item_id,
      item_sku: l.item_sku,
      item_type: l.item_type,
      image_url: l.image_url,
      unit: l.unit,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_code: l.tax_code,
      tax_rate: l.tax_rate,
      discount_amount: l.discount_amount || undefined,
    }));

    const base = {
      customer_id: customerId ?? undefined,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      currency: form.currency,
      terms: form.terms,
      notes: form.notes,
      lines: linePayload,
    };

    if (isEdit && editId) {
      updateMutation.mutate({ ...base, invoice_date: form.invoice_date, due_date: form.due_date } as UpdateInvoiceRequest, { onSuccess: onClose });
    } else {
      createMutation.mutate({ ...base, invoice_date: form.invoice_date, due_date: form.due_date } as CreateInvoiceRequest, { onSuccess: onClose });
    }
  }, [form, lines, customerId, isEdit, editId, createMutation, updateMutation, onClose]);

  if (isEdit && existingLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const orgName = brand?.orgName ?? brand?.name ?? effectiveTenant;
  const logoUrl = brand?.logoUrl ?? null;
  const inputCls = 'w-full rounded-lg py-2 px-3 text-xs font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight">{isEdit ? 'Edit Invoice' : 'Create New Invoice'}</h1>
            <p className="text-[11px] font-medium text-muted-foreground">Step 1 of 2 — Invoice Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={isPending}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-border bg-muted text-muted-foreground hover:bg-accent transition-all">
            Save As Draft
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isPending ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-8">

          {/* Dates + Logo */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-4 w-full max-w-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">Invoice Date<span className="text-destructive">*</span></label>
                  <input type="date" className={inputCls} value={form.invoice_date}
                    onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">Due Date<span className="text-destructive">*</span></label>
                  <input type="date" className={inputCls} value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center w-64 h-36 shrink-0 bg-accent/20 overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={orgName} className="max-h-24 max-w-full object-contain" />
              ) : brandLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-sm font-black text-foreground tracking-tight">{orgName || 'Company Logo'}</div>
              )}
            </div>
          </div>

          {/* From / For */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-accent/30 border border-border space-y-3">
              <span className="text-xs font-bold border-b-2 border-foreground pb-0.5 block w-fit text-foreground">Invoice From</span>
              {brandLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>
              ) : (
                <div className="text-xs space-y-1.5 text-muted-foreground">
                  <div className="font-black text-foreground text-sm">{orgName}</div>
                  <div className="flex justify-between font-medium pt-1 border-t border-border">
                    <span>Slug</span>
                    <span className="text-foreground font-mono">{effectiveTenant}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Edit at <span className="font-bold">Settings → Branding</span></p>
                </div>
              )}
            </div>
            <div className="p-5 rounded-xl bg-accent/30 border border-border space-y-3">
              <span className="text-xs font-bold border-b-2 border-foreground pb-0.5 block w-fit text-foreground">Invoice For</span>
              <div className="space-y-3">
                <div className="relative">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Customer Name</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input ref={clientRef} placeholder="Search CRM contacts…"
                      value={clientSearch || form.customer_name}
                      onChange={e => { const v = e.target.value; setClientSearch(v); setCustomerId(null); setForm(p => ({ ...p, customer_name: v })); setShowSuggestions(v.length >= 2); }}
                      onFocus={() => { if ((clientSearch || form.customer_name).length >= 2) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      className="w-full rounded-lg py-2 pl-8 pr-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  {showSuggestions && crmContacts.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {crmContacts.map(c => (
                        <button key={c.id} type="button" onMouseDown={() => selectContact(c)}
                          className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-foreground">{crmContactDisplayName(c)}</span>
                          {c.email && <span className="text-[10px] text-muted-foreground font-mono">{c.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {customerId && <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Linked to CRM contact</p>}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Customer Email</label>
                  <input type="email" placeholder="customer@email.com" value={form.customer_email}
                    onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))}
                    className="mt-1 w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <button className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-all">
                  <UserPlus className="h-3.5 w-3.5" /> Add New Client
                </button>
              </div>
            </div>
          </div>

          {/* Currency */}
          <CurrencySection
            tenant={effectiveTenant}
            currency={form.currency}
            onCurrencyChange={v => setForm(p => ({ ...p, currency: v }))}
          />

          {/* Line items */}
          <LineItemsSection
            tenant={effectiveTenant}
            lines={lines}
            onChange={setLines}
            currency={form.currency}
            onRequestCreateItem={(q, idx) => setCreateItemTarget(idx)}
          />

          {/* Totals + Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <TermsNotesSection
              terms={form.terms}
              onTermsChange={v => setForm(p => ({ ...p, terms: v }))}
              notes={form.notes}
              onNotesChange={v => setForm(p => ({ ...p, notes: v }))}
            />
            <TotalsSection
              subtotal={subtotal}
              totalTax={totalTax}
              totalDiscount={totalDiscount}
              currency={form.currency}
              globalDiscount={globalDiscount}
              onGlobalDiscountChange={setGlobalDiscount}
              globalDiscountMode={globalDiscountMode}
              onGlobalDiscountModeChange={setGlobalDiscountMode}
              additionalCharges={additionalCharges}
              onAdditionalChargesChange={setAdditionalCharges}
            />
          </div>

          {/* Footer actions */}
          <div className={cn('flex flex-wrap items-center justify-start gap-3 pt-4 border-t border-border')}>
            <button onClick={handleSave} disabled={isPending}
              className="px-5 py-2 text-xs font-bold text-primary-foreground rounded-lg bg-primary hover:bg-primary/90 transition-all disabled:opacity-50">
              Save & Continue
            </button>
            {!isEdit && (
              <button onClick={handleSave} disabled={isPending}
                className="px-5 py-2 text-xs font-bold rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-all">
                Save & Create New
              </button>
            )}
            <button onClick={handleSave} disabled={isPending}
              className="px-5 py-2 text-xs font-bold rounded-lg border border-border bg-muted text-muted-foreground hover:bg-accent transition-all">
              Save As Draft
            </button>
          </div>
        </div>
      </div>

      {createItemTarget !== null && (
        <CreateItemModal
          tenant={effectiveTenant}
          initialName={lines[createItemTarget]?.description ?? ''}
          onCreated={patch => {
            setLines(prev => prev.map((l, i) => i === createItemTarget ? { ...l, ...patch } : l));
            setCreateItemTarget(null);
          }}
          onClose={() => setCreateItemTarget(null)}
        />
      )}
    </div>
  );
}
