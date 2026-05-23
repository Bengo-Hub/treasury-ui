'use client';

import { useOrgBranding } from '@/hooks/use-org-branding';
import { useCRMContacts } from '@/hooks/use-crm-contacts';
import {
  useCreateInvoice,
  useInvoice,
  useUpdateInvoice,
} from '@/hooks/use-invoices';
import type { CreateInvoiceRequest, UpdateInvoiceRequest, LineRequest } from '@/lib/api/invoices';
import { crmContactDisplayName, type CRMContact } from '@/lib/api/crm';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Columns,
  Loader2,
  Percent,
  Plus,
  Scale,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ExtendedLine extends LineRequest {
  tax_rate: number;
}

const emptyLine = (): ExtendedLine => ({ description: '', quantity: 1, unit_price: 0, tax_rate: 0 });

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
  const { data: existing, isLoading: existingLoading } = useInvoice(
    effectiveTenant, editId ?? '', isEdit,
  );

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
    notes: '',
    terms: 'Thanks for doing business with us.',
    lines: [emptyLine()] as ExtendedLine[],
  });

  useEffect(() => {
    if (isEdit && existing && !initialized) {
      if (existing.customer_id) setCustomerId(existing.customer_id);
      if (existing.customer_name) setClientSearch(existing.customer_name);
      setForm({
        customer_name:  existing.customer_name ?? '',
        customer_email: existing.customer_email ?? '',
        invoice_date:   existing.invoice_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        due_date:       existing.due_date?.slice(0, 10) ?? '',
        currency:       existing.currency ?? 'KES',
        notes:          existing.notes ?? '',
        terms:          existing.terms ?? '',
        lines: existing.lines?.map(l => ({
          description: l.description,
          quantity:    Number(l.quantity),
          unit_price:  Number(l.unit_price),
          tax_rate:    Number(l.tax_rate),
        })) ?? [emptyLine()],
      });
      setInitialized(true);
    }
  }, [isEdit, existing, initialized]);

  const calcs = useMemo(() => {
    let subtotal = 0, totalTax = 0;
    const lines = form.lines.map(l => {
      const net = Number(l.quantity || 0) * Number(l.unit_price || 0);
      const tax = net * (Number(l.tax_rate || 0) / 100);
      subtotal += net; totalTax += tax;
      return { ...l, amount: net, taxAmount: tax, total: net + tax };
    });
    return { lines, subtotal, totalTax, grandTotal: subtotal + totalTax };
  }, [form.lines]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const selectContact = useCallback((c: CRMContact) => {
    setCustomerId(c.id);
    const name = crmContactDisplayName(c);
    setClientSearch(name);
    setForm(p => ({ ...p, customer_name: name, customer_email: c.email ?? '' }));
    setShowSuggestions(false);
  }, []);

  const addLine    = () => setForm(p => ({ ...p, lines: [...p.lines, emptyLine()] }));
  const removeLine = (i: number) => setForm(p => ({
    ...p, lines: p.lines.length > 1 ? p.lines.filter((_, j) => j !== i) : p.lines,
  }));
  const updateLine = (i: number, field: keyof ExtendedLine, value: unknown) =>
    setForm(p => ({ ...p, lines: p.lines.map((l, j) => j === i ? { ...l, [field]: value } : l) }));

  const handleSave = useCallback(() => {
    const filtered = form.lines.filter(l => String(l.description).trim());
    const linePayload = filtered.map(({ description, quantity, unit_price, tax_rate }) =>
      ({ description, quantity, unit_price, tax_rate }));

    if (isEdit && editId) {
      const body: UpdateInvoiceRequest = {
        customer_id:    customerId ?? undefined,
        customer_name:  form.customer_name,
        customer_email: form.customer_email,
        invoice_date:   form.invoice_date,
        due_date:       form.due_date,
        currency:       form.currency,
        notes:          form.notes,
        terms:          form.terms,
        lines:          linePayload,
      };
      updateMutation.mutate(body, { onSuccess: onClose });
    } else {
      const body: CreateInvoiceRequest = {
        customer_id:    customerId ?? undefined,
        customer_name:  form.customer_name,
        customer_email: form.customer_email,
        invoice_date:   form.invoice_date,
        due_date:       form.due_date,
        currency:       form.currency,
        notes:          form.notes,
        terms:          form.terms,
        lines:          linePayload,
      };
      createMutation.mutate(body, { onSuccess: onClose });
    }
  }, [form, customerId, isEdit, editId, createMutation, updateMutation, onClose]);

  if (isEdit && existingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const orgName = brand?.orgName ?? brand?.name ?? effectiveTenant;
  const logoUrl = brand?.logoUrl ?? null;

  const inputCls = 'w-full rounded-lg py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring border border-input text-foreground bg-background';

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 border-b border-border px-6 py-4 flex items-center justify-between shadow-sm bg-card">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight">
              {isEdit ? 'Edit Invoice' : 'Create New Invoice'}
            </h1>
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

          {/* Header — number + dates + logo */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-4 w-full max-w-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">
                    Invoice Date<span className="text-destructive">*</span>
                  </label>
                  <input type="date" className={inputCls}
                    value={form.invoice_date}
                    onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">
                    Due Date<span className="text-destructive">*</span>
                  </label>
                  <input type="date" className={inputCls}
                    value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="border-2 border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center text-center w-64 h-36 shrink-0 bg-accent/20 overflow-hidden">
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
            {/* FROM */}
            <div className="p-5 rounded-xl bg-accent/30 border border-border space-y-3">
              <span className="text-xs font-bold border-b-2 border-foreground pb-0.5 block w-fit text-foreground">Invoice From</span>
              {brandLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : (
                <div className="text-xs space-y-1.5 text-muted-foreground leading-relaxed">
                  <div className="font-black text-foreground text-sm">{orgName}</div>
                  <div className="flex justify-between font-medium pt-1 border-t border-border">
                    <span>Slug</span>
                    <span className="text-foreground font-mono">{effectiveTenant}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">Edit at <span className="font-bold">Settings → Branding</span></p>
                </div>
              )}
            </div>

            {/* FOR — CRM combobox */}
            <div className="p-5 rounded-xl bg-accent/30 border border-border flex flex-col space-y-3">
              <span className="text-xs font-bold border-b-2 border-foreground pb-0.5 block w-fit text-foreground">Invoice For</span>
              <div className="space-y-3 my-auto py-2">
                <div className="relative">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Customer Name</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      ref={clientRef}
                      placeholder="Search CRM contacts…"
                      value={clientSearch || form.customer_name}
                      onChange={e => {
                        const v = e.target.value;
                        setClientSearch(v);
                        setCustomerId(null);
                        setForm(p => ({ ...p, customer_name: v }));
                        setShowSuggestions(v.length >= 2);
                      }}
                      onFocus={() => { if ((clientSearch || form.customer_name).length >= 2) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      className="w-full rounded-lg py-2 pl-8 pr-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
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
                  {customerId && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Linked to CRM contact</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Customer Email</label>
                  <input type="email" placeholder="customer@email.com" value={form.customer_email}
                    onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))}
                    className="mt-1 w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <button className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg transition-all hover:bg-primary/90">
                  <UserPlus className="h-3.5 w-3.5" /> Add New Client
                </button>
              </div>
            </div>
          </div>

          {/* Currency toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-muted text-muted-foreground hover:bg-accent transition-all">
              <Percent className="h-3 w-3" /> Configure TAX
            </button>
            <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              className="rounded-lg py-1.5 px-3 text-xs font-bold border-0 bg-muted text-foreground focus:outline-none transition-all">
              <option value="KES">Kenyan Shilling (KES)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
              <option value="UGX">Ugandan Shilling (UGX)</option>
              <option value="TZS">Tanzanian Shilling (TZS)</option>
            </select>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-muted text-muted-foreground hover:bg-accent transition-all">
              <Scale className="h-3 w-3" /> Number & Currency Format
            </button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-muted text-muted-foreground hover:bg-accent transition-all">
              <Columns className="h-3 w-3" /> Edit Columns/Formulas
            </button>
          </div>

          {/* Line items */}
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center text-xs font-bold bg-primary text-primary-foreground">
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-center">TAX Rate</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-center">Rate</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1 text-right">TAX</div>
              <div className="col-span-1 text-right">Total</div>
            </div>
            <div className="p-4 space-y-4 divide-y divide-border bg-background">
              {calcs.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-start pt-3 first:pt-0">
                  <div className="col-span-5 space-y-2">
                    <span className="text-xs font-black text-foreground">{idx + 1}.</span>
                    <input placeholder="Item Name / Description" value={line.description}
                      onChange={e => updateLine(idx, 'description', e.target.value)}
                      className="w-full rounded-lg py-2 px-3 text-xs font-semibold border border-input text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div className="col-span-2 pt-6">
                    <div className="relative">
                      <input type="number" value={line.tax_rate || ''}
                        onChange={e => updateLine(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg py-2 pl-3 pr-6 text-xs text-center font-mono font-bold border border-input text-foreground bg-background focus:outline-none" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="col-span-1 pt-6">
                    <input type="number" min="1" value={line.quantity}
                      onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg py-2 px-1 text-xs text-center font-mono font-bold border border-input text-foreground bg-background focus:outline-none" />
                  </div>
                  <div className="col-span-1 pt-6">
                    <input type="number" value={line.unit_price || ''}
                      onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg py-2 px-1 text-xs text-center font-mono font-bold border border-input text-foreground bg-background focus:outline-none" />
                  </div>
                  <div className="col-span-1 pt-8 text-right font-mono text-xs text-muted-foreground">{line.amount.toFixed(2)}</div>
                  <div className="col-span-1 pt-8 text-right font-mono text-xs text-muted-foreground">{line.taxAmount.toFixed(2)}</div>
                  <div className="col-span-1 pt-8 text-right font-mono font-black text-xs text-foreground flex items-center justify-end gap-1">
                    <span>{line.total.toFixed(2)}</span>
                    {calcs.lines.length > 1 && (
                      <button onClick={() => removeLine(idx)} className="p-1 text-muted-foreground hover:text-destructive rounded-md transition-all ml-1">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex items-center gap-2 bg-accent/30">
              <button onClick={addLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-all">
                <Plus className="h-3.5 w-3.5" /> Add New Line
              </button>
            </div>
          </div>

          {/* Terms + Totals */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-6">
              <div className="p-4 rounded-xl bg-accent/30 border border-border space-y-2">
                <span className="text-xs font-bold underline block border-b border-border pb-1.5 text-foreground">Terms and Conditions</span>
                <textarea rows={3} value={form.terms}
                  onChange={e => setForm(p => ({ ...p, terms: e.target.value }))}
                  className="w-full bg-transparent text-xs font-semibold text-foreground resize-none focus:outline-none" />
              </div>
            </div>
            <div className="md:col-span-6">
              <div className="rounded-xl p-4 space-y-3 bg-accent/30 border border-border">
                <div className="space-y-1.5 text-xs font-semibold text-muted-foreground border-b border-border pb-3">
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="font-mono font-bold text-foreground">{form.currency} {calcs.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TAX</span>
                    <span className="font-mono font-bold text-foreground">{form.currency} {calcs.totalTax.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-foreground">Total ({form.currency})</span>
                  <span className="font-mono font-black text-lg text-foreground">{form.currency} {calcs.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold block mb-1 text-foreground">Notes</label>
            <textarea
              className="w-full rounded-lg py-2 px-3 text-xs border border-input text-foreground bg-background focus:outline-none min-h-[60px]"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Any additional notes for the customer…"
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
    </div>
  );
}
