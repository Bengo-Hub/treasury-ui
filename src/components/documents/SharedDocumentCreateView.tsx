'use client';

import { useOrgBranding } from '@/hooks/use-org-branding';
import { useCRMContacts } from '@/hooks/use-crm-contacts';
import {
  useCreateInvoice, useInvoice, useUpdateInvoice,
  useCreateQuotation, useQuotation, useUpdateQuotation,
} from '@/hooks/use-invoices';
import type {
  CreateInvoiceRequest, UpdateInvoiceRequest,
  CreateQuotationRequest, UpdateQuotationRequest,
} from '@/lib/api/invoices';
import { crmContactDisplayName, type CRMContact } from '@/lib/api/crm';
import { useOutletFilterStore } from '@/store/outlet-filter';
import { useVendors } from '@/hooks/use-inventory';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LineItemsSection, newLineRow, lineCompletionFactor, type LineRow } from './sections/LineItemsSection';
import { TotalsSection, type AdditionalCharge } from './sections/TotalsSection';
import { ShippingTransportSection, type TransportDetails } from './sections/ShippingTransportSection';
import { CurrencySection } from './sections/CurrencySection';
import { TermsNotesSection } from './sections/TermsNotesSection';
import { CreateItemModal } from './CreateItemModal';
import { CreateClientModal } from './CreateClientModal';

export interface DocTypeConfig {
  invoiceType: string;
  apiFamily: 'invoice' | 'quotation';
  title: string;
  fromLabel: string;
  forLabel: string;
  primaryDateLabel: string;
  secondaryDateLabel?: string;
  numberLabel: string;
  showDueDate: boolean;
  defaultSecondaryDays: number;
}

export const DOC_CONFIGS: Record<string, DocTypeConfig> = {
  invoice: {
    // Must be "standard" — the canonical invoice_type treasury-api's list filters + defaults
    // use for a plain sales invoice (invoicing/service.go coalesce(...,"standard"),
    // TENANT_INVOICE_TYPES/SCOPE_TYPES in invoices/page.tsx). "invoice" was a stray value that
    // matched no list filter anywhere, so every invoice created through this form (any tenant)
    // silently vanished from the Invoices Overview and the platform aggregate — see
    // [[treasury-tenant-resolution-consistency]].
    invoiceType: 'standard',
    apiFamily: 'invoice',
    title: 'Invoice',
    fromLabel: 'Billed By',
    forLabel: 'Billed To',
    primaryDateLabel: 'Invoice Date',
    secondaryDateLabel: 'Due Date',
    numberLabel: 'Invoice No',
    showDueDate: true,
    defaultSecondaryDays: 30,
  },
  quotation: {
    invoiceType: 'quotation',
    apiFamily: 'quotation',
    title: 'Quotation',
    fromLabel: 'Quotation From',
    forLabel: 'Quotation For',
    primaryDateLabel: 'Quotation Date',
    secondaryDateLabel: 'Valid Until',
    numberLabel: 'Quotation No',
    showDueDate: true,
    defaultSecondaryDays: 15,
  },
  proforma_invoice: {
    invoiceType: 'proforma_invoice',
    apiFamily: 'invoice',
    title: 'Proforma Invoice',
    fromLabel: 'Billed By',
    forLabel: 'Billed To',
    primaryDateLabel: 'Invoice Date',
    secondaryDateLabel: 'Due Date',
    numberLabel: 'Proforma No',
    showDueDate: true,
    defaultSecondaryDays: 30,
  },
  sales_order: {
    invoiceType: 'sales_order',
    apiFamily: 'invoice',
    title: 'Sales Order',
    fromLabel: 'Sales Order From',
    forLabel: 'Sales Order For',
    primaryDateLabel: 'Sales Order Date',
    numberLabel: 'Sales Order No',
    showDueDate: false,
    defaultSecondaryDays: 0,
  },
  payment_receipt: {
    invoiceType: 'payment_receipt',
    apiFamily: 'invoice',
    title: 'Payment Receipt',
    fromLabel: 'Issued By',
    forLabel: 'Issued To',
    primaryDateLabel: 'Receipt Date',
    numberLabel: 'Receipt No',
    showDueDate: false,
    defaultSecondaryDays: 0,
  },
  credit_note: {
    invoiceType: 'credit_note',
    apiFamily: 'invoice',
    title: 'Credit Note',
    fromLabel: 'Issued By',
    forLabel: 'Issued To',
    primaryDateLabel: 'Credit Note Date',
    numberLabel: 'Credit Note No',
    showDueDate: false,
    defaultSecondaryDays: 0,
  },
  debit_note: {
    invoiceType: 'debit_note',
    apiFamily: 'invoice',
    title: 'Debit Note',
    fromLabel: 'Issued By',
    forLabel: 'Issued To',
    primaryDateLabel: 'Debit Note Date',
    numberLabel: 'Debit Note No',
    showDueDate: false,
    defaultSecondaryDays: 0,
  },
  delivery_challan: {
    invoiceType: 'delivery_challan',
    apiFamily: 'invoice',
    title: 'Delivery Note',
    fromLabel: 'Delivered By',
    forLabel: 'Deliver To',
    primaryDateLabel: 'Delivery Date',
    numberLabel: 'Delivery Note No',
    showDueDate: false,
    defaultSecondaryDays: 0,
  },
};

interface Props {
  effectiveTenant: string;
  docType: keyof typeof DOC_CONFIGS;
  onClose: () => void;
  editId?: string;
}

export function SharedDocumentCreateView({ effectiveTenant, docType, onClose, editId }: Props) {
  // Fall back to the invoice config for any unmapped type so the form never hard-crashes.
  const config = DOC_CONFIGS[docType] ?? DOC_CONFIGS.invoice;
  const isEdit = !!editId;
  const isQuotation = config.apiFamily === 'quotation';

  // Always call all hooks unconditionally (Rules of Hooks)
  const invCreateMutation = useCreateInvoice(effectiveTenant);
  const invUpdateMutation = useUpdateInvoice(effectiveTenant, editId ?? '');
  const qtCreateMutation  = useCreateQuotation(effectiveTenant);
  const qtUpdateMutation  = useUpdateQuotation(effectiveTenant, editId ?? '');

  const { data: existingInvoice,   isLoading: invLoading } = useInvoice(effectiveTenant, editId ?? '', isEdit && !isQuotation);
  const { data: existingQuotation, isLoading: qtLoading  } = useQuotation(effectiveTenant, editId ?? '', isEdit && isQuotation);

  const createMutation  = isQuotation ? qtCreateMutation  : invCreateMutation;
  const updateMutation  = isQuotation ? qtUpdateMutation  : invUpdateMutation;
  const existing        = isQuotation ? existingQuotation : existingInvoice;
  const existingLoading = isQuotation ? qtLoading         : invLoading;

  const { data: brand, isLoading: brandLoading } = useOrgBranding(effectiveTenant);

  // Originating outlet/branch (from the header OutletFilter). The selected branch flows to the
  // backend as outlet_id so procure-to-order receives stock at the branch that made the sale.
  // null = "All Outlets" (tenant-wide / HQ); regular staff are scoped automatically by the backend.
  const selectedOutlet = useOutletFilterStore((s) => s.selectedOutlet);

  const [initialized, setInitialized] = useState(false);
  const [customerId, setCustomerId]   = useState<string | null>(null);
  // Marketflow CRM contact id (system of record) — set when a CRM contact is picked,
  // sent as crm_customer_id so the document links to the canonical contact. Distinct from
  // the treasury customer_id FK.
  const [crmCustomerId, setCrmCustomerId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const clientRef = useRef<HTMLInputElement>(null);
  const { data: crmContacts = [] } = useCRMContacts(effectiveTenant, clientSearch);
  // Carriers/couriers for the delivery-cost vendor picker (invoices only). Best-effort: an empty
  // list just degrades the picker to a free-text carrier field in the section.
  const { data: vendorsResp } = useVendors(effectiveTenant, undefined, !isQuotation);
  const carrierVendors = (vendorsResp?.vendors ?? []).map((v) => ({ id: v.id, name: v.business_name }));

  const today = new Date().toISOString().slice(0, 10);
  const defaultSecondary = config.defaultSecondaryDays > 0
    ? new Date(Date.now() + config.defaultSecondaryDays * 86400000).toISOString().slice(0, 10)
    : today;

  const [form, setForm] = useState({
    customer_name:  '',
    customer_email: '',
    customer_phone: '',
    primary_date:   today,
    secondary_date: defaultSecondary,
    currency:       'KES',
    reference:      '', // contract / tender / PO number → metadata.reference (meta box "Reference")
    terms:          '',
    notes:          '',
  });
  // Extra Billed-To details that have no dedicated invoice/quotation column — carried into
  // document metadata (customer_address/customer_country/customer_contact_person, matching the
  // keys treasury-api's PDF renderer already reads) and, for invoices, the typed
  // customer_kra_pin field. Populated either from a picked CRM contact's metadata or from the
  // "Add New Client" modal.
  const [customerDetails, setCustomerDetails] = useState({
    kra_pin:        '',
    address:        '',
    country:        '',
    contact_person: '',
  });
  const [lines, setLines]                         = useState<LineRow[]>([newLineRow()]);
  const [globalDiscount, setGlobalDiscount]       = useState(0);
  const [globalDiscountMode, setGlobalDiscountMode] = useState<'flat' | 'percent'>('flat');
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  // Shipping & transport capture (own fleet or third-party courier) + customer shipping charge.
  const [addShipping, setAddShipping]   = useState(false);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [transport, setTransport]       = useState<TransportDetails>({ transporter_type: 'own_fleet' });
  const [createItemTarget, setCreateItemTarget]   = useState<number | null>(null);

  useEffect(() => {
    if (!isEdit || !existing || initialized) return;
    if (existing.customer_id) setCustomerId(existing.customer_id);
    if (existing.crm_customer_id) setCrmCustomerId(existing.crm_customer_id);
    if (existing.customer_name) setClientSearch(existing.customer_name);

    const primaryDate = isQuotation
      ? (existingQuotation?.quote_date?.slice(0, 10) ?? today)
      : (existingInvoice?.invoice_date?.slice(0, 10) ?? today);
    const secondaryDate = isQuotation
      ? (existingQuotation?.valid_until?.slice(0, 10) ?? defaultSecondary)
      : (existingInvoice?.due_date?.slice(0, 10) ?? defaultSecondary);

    setForm({
      customer_name:  existing.customer_name ?? '',
      customer_email: existing.customer_email ?? '',
      customer_phone: (existing as { customer_phone?: string }).customer_phone ?? '',
      primary_date:   primaryDate,
      secondary_date: secondaryDate,
      currency:       existing.currency ?? 'KES',
      reference:      (existing.metadata?.reference as string) ?? '',
      terms:          existing.terms ?? '',
      notes:          existing.notes ?? '',
    });
    setCustomerDetails({
      kra_pin:        (existing as { customer_kra_pin?: string }).customer_kra_pin ?? (existing.metadata?.customer_kra_pin as string) ?? '',
      address:        (existing.metadata?.customer_address as string) ?? '',
      country:        (existing.metadata?.customer_country as string) ?? '',
      contact_person: (existing.metadata?.customer_contact_person as string) ?? '',
    });

    const srcLines = existing.lines ?? [];
    setLines(srcLines.map(l => ({
      _key:           Math.random().toString(36).slice(2),
      description:    l.description,
      item_id:        l.item_id,
      item_sku:       l.item_sku,
      item_type:      l.item_type,
      image_url:      l.image_url,
      unit:           l.unit,
      quantity:       Number(l.quantity),
      unit_price:     Number(l.unit_price),
      unit_cost:      l.unit_cost != null ? Number(l.unit_cost) : undefined,
      tax_code:       l.tax_code,
      tax_rate:       Number(l.tax_rate),
      discount_amount: Number(l.discount_amount) || 0,
    })) || [newLineRow()]);

    // Rehydrate shipping/transport on edit.
    const existingTransport = (existing as { transport?: TransportDetails }).transport;
    const existingShipping = Number((existing as { shipping_amount?: string }).shipping_amount ?? 0);
    if ((existingTransport && Object.keys(existingTransport).length > 0) || existingShipping > 0) {
      setAddShipping(true);
      if (existingTransport) setTransport({ transporter_type: 'own_fleet', ...existingTransport });
      if (existingShipping > 0) setShippingAmount(existingShipping);
    }

    setInitialized(true);
  }, [isEdit, existing, initialized, isQuotation, existingInvoice, existingQuotation, today, defaultSecondary]);

  const computedLines = lines.map(l => {
    // Fold progress/milestone completion into the billable net (qty × rate × completion%).
    const net  = l.quantity * l.unit_price * lineCompletionFactor(l.completion_percent);
    const disc = l.discount_amount || 0;
    return { net, disc, tax: (net - disc) * (l.tax_rate / 100) };
  });
  const subtotal      = computedLines.reduce((s, c) => s + c.net, 0);
  const totalDiscount = computedLines.reduce((s, c) => s + c.disc, 0);
  const totalTax      = computedLines.reduce((s, c) => s + c.tax, 0);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const selectContact = useCallback((c: CRMContact) => {
    // c.id is the MarketFlow CRM contact id → link via crm_customer_id, not the treasury FK.
    setCrmCustomerId(c.id);
    const name = crmContactDisplayName(c);
    setClientSearch(name);
    setForm(p => ({ ...p, customer_name: name, customer_email: c.email ?? '', customer_phone: c.phone ?? '' }));
    // Carry over the extra details captured on the CRM contact's metadata bag (company/address/
    // country/contact_person/kra_pin — see CreateClientModal) so a picked contact re-populates
    // the same Billed-To details a newly-created one would.
    const meta = (c.metadata ?? {}) as Record<string, unknown>;
    setCustomerDetails({
      kra_pin:        (meta.kra_pin as string) ?? '',
      address:        (meta.address as string) ?? '',
      country:        (meta.country as string) ?? '',
      contact_person: (meta.contact_person as string) ?? '',
    });
    setShowSuggestions(false);
  }, []);

  // "Add New Client" opens a full CreateClientModal (mirrors CreateItemModal's inline-create
  // pattern for line items) instead of firing a bare name/email upsert — lets the user capture
  // phone/address/tax-pin/contact-person up front and posts them all to MarketFlow CRM.
  const [showCreateClient, setShowCreateClient] = useState(false);

  const buildLinePayload = useCallback(() =>
    lines
      .filter(l => l.description.trim())
      .map(l => ({
        description:     l.description,
        item_id:         l.item_id,
        item_sku:        l.item_sku,
        item_type:       l.item_type,
        image_url:       l.image_url,
        unit:            l.unit,
        quantity:        l.quantity,
        unit_price:      l.unit_price,
        unit_cost:       l.unit_cost != null ? l.unit_cost : undefined,
        tax_code:        l.tax_code,
        tax_rate:        l.tax_rate,
        discount_amount: l.discount_amount || undefined,
        // Only send completion when it's a real partial bill (0 < pct < 100); the backend
        // folds it into the billed line total (transient — not persisted as its own column).
        completion_percent:
          l.completion_percent != null && l.completion_percent > 0 && l.completion_percent < 100
            ? l.completion_percent
            : undefined,
      })),
  [lines]);

  // Save/update mutations previously had NO onError handler anywhere in this component (and no
  // global MutationCache error handler exists either — see org-shell.tsx) — a failed create just
  // silently stopped the "Saving…" spinner with zero feedback, which reads to the user as "I
  // created the document and it disappeared" when really it never saved. Surface the real error.
  const handleSaveError = useCallback((err: unknown) => {
    const message = (err as { response?: { data?: { error?: string; message?: string } } })
      ?.response?.data?.error
      ?? (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message
      ?? `Failed to save ${config.title.toLowerCase()}. Please check the form and try again.`;
    toast.error(message);
  }, [config.title]);

  const handleSave = useCallback(() => {
    const linePayload = buildLinePayload();
    const secondary = config.showDueDate ? form.secondary_date : form.primary_date;

    // Quotations must be raised for a REAL customer (QA: never walk-in/anonymous) — the
    // server (treasury CreateQuotation) rejects them too; this guard gives instant feedback.
    if (isQuotation) {
      const name = form.customer_name.trim();
      const isWalkIn = /^walk[\s-]?in customer$/i.test(name);
      if ((name === '' || isWalkIn) && !crmCustomerId && !customerId) {
        toast.error('A customer is required for quotations — search the CRM or add a new client first.');
        return;
      }
    }

    // Merge the contract/tender/PO reference plus the Billed-To details that have no
    // dedicated column (address/country/contact person — and, for quotations, the tax PIN
    // since only Invoice has a typed customer_kra_pin field) into metadata, preserving any
    // existing keys on edit. treasury-api's doc renderer already reads these exact keys
    // (customer_address/customer_country/customer_contact_person) — see drawParties.
    const mergedMeta: Record<string, unknown> = {
      ...((isEdit && existing?.metadata) ? existing.metadata : {}),
      ...(form.reference.trim() ? { reference: form.reference.trim() } : {}),
      ...(customerDetails.address.trim() ? { customer_address: customerDetails.address.trim() } : {}),
      ...(customerDetails.country.trim() ? { customer_country: customerDetails.country.trim() } : {}),
      ...(customerDetails.contact_person.trim() ? { customer_contact_person: customerDetails.contact_person.trim() } : {}),
      ...(isQuotation && customerDetails.kra_pin.trim() ? { customer_kra_pin: customerDetails.kra_pin.trim() } : {}),
    };
    const metadata = Object.keys(mergedMeta).length ? mergedMeta : undefined;

    // Originating outlet: prefer the header-selected branch; on edit fall back to the
    // document's existing outlet so leaving the filter on "All Outlets" doesn't blank it.
    const outletId =
      selectedOutlet?.id ??
      (isEdit ? (existing as { outlet_id?: string } | undefined)?.outlet_id : undefined) ??
      undefined;

    if (isQuotation) {
      const base: CreateQuotationRequest = {
        customer_id:     customerId ?? undefined,
        crm_customer_id: crmCustomerId ?? undefined,
        customer_name:  form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone || undefined,
        quote_date:     form.primary_date,
        valid_until:    secondary,
        currency:       form.currency,
        terms:          form.terms,
        notes:          form.notes,
        outlet_id:      outletId,
        metadata,
        lines:          linePayload,
      };
      if (isEdit && editId) {
        (updateMutation as ReturnType<typeof useUpdateQuotation>).mutate(base as UpdateQuotationRequest, { onSuccess: onClose, onError: handleSaveError });
      } else {
        (createMutation as ReturnType<typeof useCreateQuotation>).mutate(base, { onSuccess: onClose, onError: handleSaveError });
      }
    } else {
      const base = {
        customer_id:     customerId ?? undefined,
        crm_customer_id: crmCustomerId ?? undefined,
        customer_name:  form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone || undefined,
        customer_kra_pin: customerDetails.kra_pin.trim() || undefined,
        invoice_date:   form.primary_date,
        due_date:       secondary,
        currency:       form.currency,
        terms:          form.terms,
        notes:          form.notes,
        outlet_id:      outletId,
        metadata,
        lines:          linePayload,
        shipping_amount: addShipping && shippingAmount > 0 ? shippingAmount : undefined,
        transport:       addShipping && Object.keys(transport).length > 0 ? transport : undefined,
      };
      if (isEdit && editId) {
        (updateMutation as ReturnType<typeof useUpdateInvoice>).mutate(base as UpdateInvoiceRequest, { onSuccess: onClose, onError: handleSaveError });
      } else {
        (createMutation as ReturnType<typeof useCreateInvoice>).mutate(
          { ...base, invoice_type: config.invoiceType } as CreateInvoiceRequest,
          { onSuccess: onClose, onError: handleSaveError },
        );
      }
    }
  }, [form, customerDetails, buildLinePayload, customerId, crmCustomerId, isEdit, editId, existing, config, isQuotation, createMutation, updateMutation, onClose, handleSaveError, addShipping, shippingAmount, transport, selectedOutlet]);

  if (isEdit && existingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const orgName  = brand?.orgName ?? brand?.name ?? effectiveTenant;
  const logoUrl  = brand?.logoUrl ?? null;
  const inputCls = 'w-full rounded-lg py-2 px-3 text-xs font-mono border border-input text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 border-b border-border px-6 py-4 flex items-center justify-between shadow-sm bg-card">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:bg-accent transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight">
              {isEdit ? `Edit ${config.title}` : `Create ${config.title}`}
            </h1>
            <p className="text-[11px] font-medium text-muted-foreground">Step 1 of 2 — Document Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={isPending}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-border bg-muted text-muted-foreground hover:bg-accent transition-all">
            Save As Draft
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isPending ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-8">

          {/* Dates + Logo */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-4 w-full max-w-sm">
              <div className={cn('grid gap-4', config.showDueDate ? 'grid-cols-2' : 'grid-cols-1')}>
                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">
                    {config.primaryDateLabel}<span className="text-destructive">*</span>
                  </label>
                  <input type="date" className={inputCls} value={form.primary_date}
                    onChange={e => setForm(p => ({ ...p, primary_date: e.target.value }))} />
                </div>
                {config.showDueDate && (
                  <div>
                    <label className="text-xs font-bold block mb-1 text-foreground">
                      {config.secondaryDateLabel}<span className="text-destructive">*</span>
                    </label>
                    <input type="date" className={inputCls} value={form.secondary_date}
                      onChange={e => setForm(p => ({ ...p, secondary_date: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center text-center w-64 h-36 shrink-0 bg-accent/20 overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={orgName} className="max-h-24 max-w-full object-contain" />
              ) : brandLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-sm font-black text-foreground">{orgName || 'Company Logo'}</div>
              )}
            </div>
          </div>

          {/* From / For */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-accent/30 border border-border space-y-3">
              <span className="text-xs font-bold border-b-2 border-foreground pb-0.5 block w-fit text-foreground">{config.fromLabel}</span>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="font-black text-foreground text-sm">{orgName}</div>
                <p className="text-[10px] pt-1">Edit at <span className="font-bold">Settings → Branding</span></p>
              </div>
            </div>
            <div className="p-5 rounded-xl bg-accent/30 border border-border space-y-3">
              <span className="text-xs font-bold border-b-2 border-foreground pb-0.5 block w-fit text-foreground">{config.forLabel}</span>
              <div className="space-y-3">
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
                        setCrmCustomerId(null);
                        setForm(p => ({ ...p, customer_name: v, customer_phone: '' }));
                        setCustomerDetails({ kra_pin: '', address: '', country: '', contact_person: '' });
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
                  {crmCustomerId && <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Linked to CRM contact</p>}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Customer Email</label>
                  <input type="email" placeholder="customer@email.com" value={form.customer_email}
                    onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))}
                    className="mt-1 w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                {/* Extra Billed-To details carried over from the picked/created CRM contact
                    (see selectContact / CreateClientModal) — read-only here; edit them by
                    updating the contact in MarketFlow (the customer source of truth). */}
                {(form.customer_phone || customerDetails.kra_pin || customerDetails.address || customerDetails.country || customerDetails.contact_person) && (
                  <div className="rounded-lg border border-border bg-background/60 px-3 py-2 space-y-0.5 text-[10px] text-muted-foreground">
                    {form.customer_phone && <div><span className="font-bold text-foreground">Phone:</span> {form.customer_phone}</div>}
                    {customerDetails.contact_person && <div><span className="font-bold text-foreground">Contact Person:</span> {customerDetails.contact_person}</div>}
                    {customerDetails.kra_pin && <div><span className="font-bold text-foreground">Tax/KRA PIN:</span> {customerDetails.kra_pin}</div>}
                    {customerDetails.address && <div><span className="font-bold text-foreground">Address:</span> {customerDetails.address}</div>}
                    {customerDetails.country && <div><span className="font-bold text-foreground">Country:</span> {customerDetails.country}</div>}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowCreateClient(true)}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
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

          {/* Reference / Contract / Tender No. */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Reference / Contract No.</label>
            <input
              value={form.reference}
              onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
              placeholder="e.g. tender, contract or PO number"
              className="w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground">Appears as the “Reference” row on the document — for tender, contract or purchase-order numbers.</p>
          </div>

          {/* Line items */}
          <LineItemsSection
            tenant={effectiveTenant}
            lines={lines}
            onChange={setLines}
            currency={form.currency}
            onRequestCreateItem={(_, idx) => setCreateItemTarget(idx)}
          />

          {/* Shipping & Transport capture (invoices/delivery docs) */}
          {!isQuotation && (
            <ShippingTransportSection
              enabled={addShipping}
              onToggle={setAddShipping}
              shippingAmount={shippingAmount}
              onShippingAmountChange={setShippingAmount}
              transport={transport}
              onTransportChange={setTransport}
              currency={form.currency}
              vendors={carrierVendors}
            />
          )}

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
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
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

      {showCreateClient && (
        <CreateClientModal
          tenant={effectiveTenant}
          initialName={(clientSearch || form.customer_name).trim()}
          onCreated={contact => {
            selectContact(contact);
            setShowCreateClient(false);
          }}
          onClose={() => setShowCreateClient(false)}
        />
      )}
    </div>
  );
}

// Backward-compat alias — callers using the old name still work
export const SharedInvoiceCreateView = SharedDocumentCreateView;
