'use client';

import { useMemo } from 'react';
import { useInvoices, useCustomerBalances } from '@/hooks/use-invoices';
import { useCRMContacts } from '@/hooks/use-crm-contacts';
import type { Invoice, CustomerBalance } from '@/lib/api/invoices';
import type { CRMContact } from '@/lib/api/crm';

/**
 * Unified client record — the tenant's clients merged from (a) doc-derived customers
 * (invoices + operational AR balances) and (b) CRM contacts (marketflow, the customer SoT).
 */
export interface ClientRecord {
  /** Stable de-dupe/list key (crm id when present, else normalized name). */
  key: string;
  name: string;
  email: string;
  phone: string;
  /** CRM contact type, when this client is also a CRM contact. */
  contactType?: string;
  /** Total invoiced across the tenant's docs for this client. */
  totalAmount: number;
  /** Total settled (paid) across the tenant's docs for this client. */
  paidAmount: number;
  /** Operational outstanding balance (AR ledger; includes POS credit sales). */
  outstanding: number;
  invoiceCount: number;
  currency: string;
  lastInvoiceDate: string;
  /** CRM contact / customer UUID used by the AR statement + receive-payment endpoints. */
  customerId?: string;
  /** The matched operational AR balance row, when one exists (powers Receive Payment). */
  balance?: CustomerBalance;
  /** True when this client originates from (or is enriched by) a CRM contact. */
  fromCRM: boolean;
}

/** Normalize a name for cross-source matching (case/whitespace-insensitive). */
const normName = (s?: string | null) => (s ?? '').trim().toLowerCase();
const crmName = (c: CRMContact) =>
  [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.email || '';

/**
 * useClients merges the tenant's clients from docs + CRM into ONE de-duplicated list.
 *
 * Merge/dedupe strategy (single source of truth for client logic):
 * 1. Doc-derived customers are aggregated from invoices, keyed by `crm_customer_id`
 *    when present else by normalized customer name; enriched with operational AR
 *    balances (matched by crm id / identifier / name) for the live outstanding figure.
 * 2. CRM contacts are merged in: an existing doc client that matches a CRM contact
 *    (by crm id, else by normalized name) is enriched with email/phone/contact_type;
 *    CRM-only contacts are added as zero-balance clients.
 */
export function useClients(tenant: string) {
  const { data, isLoading, error } = useInvoices(tenant, {}, !!tenant);
  const invoices = useMemo(() => data?.invoices ?? [], [data]);

  const { data: balances } = useCustomerBalances(tenant, !!tenant);
  const { data: crmContacts = [], isLoading: crmLoading } = useCRMContacts(tenant, '');

  const clients = useMemo<ClientRecord[]>(() => {
    const map = new Map<string, ClientRecord>();

    // Index operational AR balances by crm id, identifier, and normalized name.
    const balanceByCrm = new Map<string, CustomerBalance>();
    const balanceByName = new Map<string, CustomerBalance>();
    (balances ?? []).forEach((b) => {
      if (b.crm_contact_id) balanceByCrm.set(b.crm_contact_id, b);
      if (b.customer_identifier) balanceByCrm.set(b.customer_identifier, b);
      const n = normName(b.customer_name);
      if (n) balanceByName.set(n, b);
    });

    const matchBalance = (crmId?: string, name?: string) =>
      (crmId && balanceByCrm.get(crmId)) || (name ? balanceByName.get(normName(name)) : undefined) || undefined;

    // 1. Doc-derived customers (from invoices).
    invoices.forEach((inv: Invoice) => {
      const name = inv.customer_name || 'Unknown Customer';
      const crmId = inv.crm_customer_id || inv.customer_id;
      const key = crmId || normName(name) || name;
      const amount = parseFloat(inv.total_amount ?? '0') || 0;
      const paid = inv.status === 'paid' ? amount : 0;
      const existing = map.get(key);
      if (existing) {
        existing.invoiceCount += 1;
        existing.totalAmount += amount;
        existing.paidAmount += paid;
        if (!existing.customerId && crmId) existing.customerId = crmId;
        if (!existing.email && inv.customer_email) existing.email = inv.customer_email;
        if (!existing.phone && inv.customer_phone) existing.phone = inv.customer_phone;
        if (inv.created_at > existing.lastInvoiceDate) existing.lastInvoiceDate = inv.created_at;
      } else {
        map.set(key, {
          key,
          name,
          email: inv.customer_email || '',
          phone: inv.customer_phone || '',
          totalAmount: amount,
          paidAmount: paid,
          outstanding: 0,
          invoiceCount: 1,
          currency: inv.currency || 'KES',
          lastInvoiceDate: inv.created_at,
          customerId: crmId,
          fromCRM: false,
        });
      }
    });

    // Attach the operational AR balance (live outstanding) to each doc client.
    map.forEach((c) => {
      const bal = matchBalance(c.customerId, c.name);
      if (bal) {
        c.balance = bal;
        c.outstanding = parseFloat(bal.balance_due) || 0;
        if (!c.customerId) c.customerId = bal.crm_contact_id || bal.customer_identifier || bal.id;
      } else {
        c.outstanding = Math.max(c.totalAmount - c.paidAmount, 0);
      }
    });

    // 2. Merge CRM contacts — enrich matches, add CRM-only contacts.
    crmContacts.forEach((c: CRMContact) => {
      const name = crmName(c);
      // Find an existing doc client matching this contact (by crm id, else by name).
      let target: ClientRecord | undefined = map.get(c.id);
      if (!target) {
        for (const rec of map.values()) {
          if (rec.customerId === c.id || (name && normName(rec.name) === normName(name))) {
            target = rec;
            break;
          }
        }
      }
      if (target) {
        target.fromCRM = true;
        if (!target.customerId) target.customerId = c.id;
        if (!target.email && c.email) target.email = c.email;
        if (!target.phone && c.phone) target.phone = c.phone;
        if (!target.contactType && c.contact_type) target.contactType = c.contact_type;
      } else {
        const bal = matchBalance(c.id, name);
        map.set(c.id, {
          key: c.id,
          name: name || 'Unknown Contact',
          email: c.email || '',
          phone: c.phone || '',
          contactType: c.contact_type,
          totalAmount: bal ? parseFloat(bal.total_invoiced) || 0 : 0,
          paidAmount: bal ? parseFloat(bal.total_paid) || 0 : 0,
          outstanding: bal ? parseFloat(bal.balance_due) || 0 : 0,
          invoiceCount: 0,
          currency: bal?.currency || 'KES',
          lastInvoiceDate: bal?.last_invoice_date || '',
          customerId: c.id,
          balance: bal,
          fromCRM: true,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [invoices, balances, crmContacts]);

  return { clients, invoices, isLoading: isLoading || crmLoading, error };
}
