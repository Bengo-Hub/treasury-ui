'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { createCRMContact, type CRMContact } from '@/lib/api/crm';

interface Props {
  tenant: string;
  initialName?: string;
  onCreated: (contact: CRMContact) => void;
  onClose: () => void;
}

/**
 * Inline "create a new customer" dialog for the invoice/quotation "Billed To" picker —
 * mirrors CreateItemModal's shape (tenant/initialName/onCreated/onClose) so the two
 * inline-create flows (line item, client) stay structurally consistent.
 *
 * Posts straight to MarketFlow (the customer source of truth, see [[crm-data-ownership-sync]])
 * via the existing createCRMContact()/proxy route. MarketFlow's Contact schema has no
 * dedicated address/company/tax-pin columns, so anything beyond name/email/phone is carried
 * in Contact.metadata — a JSON catch-all field that already exists, so this needs no
 * marketflow-api schema migration.
 */
export function CreateClientModal({ tenant, initialName = '', onCreated, onClose }: Props) {
  const [form, setForm] = useState({
    name: initialName,
    email: '',
    phone: '',
    contact_person: '',
    kra_pin: '',
    address: '',
    country: '',
    notes: '',
  });

  const field = (key: keyof typeof form, value: string) => setForm(p => ({ ...p, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const [first, ...rest] = form.name.trim().split(/\s+/);
      const metadata: Record<string, unknown> = {};
      if (form.contact_person.trim()) metadata.contact_person = form.contact_person.trim();
      if (form.kra_pin.trim())        metadata.kra_pin = form.kra_pin.trim();
      if (form.address.trim())        metadata.address = form.address.trim();
      if (form.country.trim())        metadata.country = form.country.trim();
      if (form.notes.trim())          metadata.notes = form.notes.trim();

      return createCRMContact(tenant, {
        first_name: first,
        last_name: rest.join(' ') || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
    },
    onSuccess: (contact) => {
      if (contact) {
        onCreated(contact);
        onClose();
      }
    },
  });

  const inputCls = 'w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const labelCls = 'text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-sm font-black text-foreground">Add New Client</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Customer / Company Name <span className="text-destructive">*</span></label>
            <input className={inputCls} value={form.name} onChange={e => field('name', e.target.value)} placeholder="e.g. Acme Ltd or Jane Doe" autoFocus />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={e => field('email', e.target.value)} placeholder="customer@email.com" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone} onChange={e => field('phone', e.target.value)} placeholder="+254 7xx xxx xxx" />
            </div>
          </div>

          {/* Contact person + Tax PIN */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contact Person</label>
              <input className={inputCls} value={form.contact_person} onChange={e => field('contact_person', e.target.value)} placeholder="Person to address (optional)" />
            </div>
            <div>
              <label className={labelCls}>Tax / KRA PIN</label>
              <input className={inputCls} value={form.kra_pin} onChange={e => field('kra_pin', e.target.value)} placeholder="P051565369U" />
            </div>
          </div>

          {/* Address + Country */}
          <div>
            <label className={labelCls}>Address</label>
            <textarea rows={2} className={inputCls + ' resize-none'} value={form.address}
              onChange={e => field('address', e.target.value)} placeholder="Street, building, city…" />
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input className={inputCls} value={form.country} onChange={e => field('country', e.target.value)} placeholder="Kenya" />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className={inputCls + ' resize-none'} value={form.notes}
              onChange={e => field('notes', e.target.value)} placeholder="Optional internal notes…" />
          </div>

          {mutation.isError && (
            <p className="text-xs text-destructive font-semibold">Failed to create client. Please try again.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-accent/20 sticky bottom-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-all">
            Cancel
          </button>
          <button type="button" disabled={!form.name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {mutation.isPending ? 'Creating…' : 'Create & Use Client'}
          </button>
        </div>
      </div>
    </div>
  );
}
