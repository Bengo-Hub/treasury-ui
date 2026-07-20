'use client';

// Presentational pieces + row types/adapters for SharedDocumentList, split out so the
// list component itself (now built on the shared DataTable) stays small. Everything here
// is re-exported from SharedDocumentList.tsx for backwards-compatible imports.

import { Button } from '@/components/ui/base';
import { AlertCircle, FileText, Plus } from 'lucide-react';
import type { RowAction } from '@/components/ui/action-menu';
import type { Invoice, Quotation } from '@/lib/api/invoices';

// ---- Types ----

export interface DocumentLine {
  description: string;
  tax_code?: string;
  tax_rate?: number | string;
  quantity: number | string;
  unit_price: string | number;
  line_total: string | number;
}

export interface DocumentRow {
  id: string;
  doc_number: string;
  /** Owning tenant name — shown only in the platform-wide (all-tenants) view. */
  tenant_name?: string;
  /** Owning tenant slug — used to target row actions at the right tenant in the all-tenants view. */
  tenant_slug?: string;
  customer_name?: string;
  customer_email?: string;
  currency: string;
  total_amount: string;
  status: string;
  payment_status?: string;
  /** Delivery-note goods-dispatch lifecycle (delivery_challan/delivery_note docs only). */
  delivery_status?: string;
  doc_date: string;
  due_date?: string;
  secondary_date?: string;
  public_token?: string;
  lines?: DocumentLine[];
}

export interface DocStats {
  total_count: number;
  total_amount: string;
  amount_due?: string;
  currency: string;
}

// DocAction is a row action for the document list. It reuses the shared RowAction
// contract (icon is required here) so the clip-safe RowActionMenu can render it.
export interface DocAction extends RowAction<DocumentRow> {
  icon: React.ReactNode;
}

// ---- Utilities ----

export function statusVariant(s: string): 'success' | 'secondary' | 'warning' | 'error' | 'default' {
  if (['paid', 'accepted', 'delivered', 'confirmed', 'converted', 'approved'].includes(s)) return 'success';
  if (['draft'].includes(s)) return 'secondary';
  if (['overdue', 'expired', 'partial', 'sent', 'pending_approval'].includes(s)) return 'warning';
  if (['void', 'cancelled', 'declined'].includes(s)) return 'error';
  return 'default';
}

export function paymentVariant(s: string): 'success' | 'secondary' | 'warning' | 'error' | 'default' {
  if (s === 'paid') return 'success';
  if (s === 'partial') return 'warning';
  if (s === 'unpaid') return 'error';
  return 'secondary';
}

// Delivery-note goods-dispatch lifecycle: draft → dispatched → delivered (+ cancelled).
export function deliveryVariant(s: string): 'success' | 'secondary' | 'warning' | 'error' | 'default' {
  if (s === 'delivered') return 'success';
  if (s === 'dispatched') return 'warning';
  if (s === 'cancelled') return 'error';
  return 'secondary'; // draft / empty
}

export function fmt(amount: string | number, currency: string) {
  return `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// ---- Stats Cards ----

export function StatsBar({ stats, title }: { stats: DocStats; title: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total {title}</p>
          <p className="text-2xl font-black text-foreground tabular-nums">{stats.total_count}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-primary font-black text-xs">{stats.currency}</span>
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Amount</p>
          <p className="text-xl font-black text-foreground tabular-nums">
            {fmt(stats.total_amount, stats.currency)}
          </p>
        </div>
      </div>
      {stats.amount_due !== undefined && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Amount Due</p>
            <p className="text-xl font-black text-destructive tabular-nums">
              {fmt(stats.amount_due, stats.currency)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Expanded Line Items (rendered inside DataTable's renderExpanded slot) ----

export function ExpandedLines({ row }: { row: DocumentRow }) {
  if (!row.lines?.length) {
    return <p className="text-xs text-muted-foreground px-2 py-1">No line items on this document.</p>;
  }
  return (
    <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
      <thead>
        <tr className="bg-muted text-muted-foreground text-[10px] font-bold uppercase">
          <th className="px-3 py-2 text-left">Item</th>
          <th className="px-3 py-2 text-center">Tax Code</th>
          <th className="px-3 py-2 text-center">Tax %</th>
          <th className="px-3 py-2 text-center">Qty</th>
          <th className="px-3 py-2 text-right">Rate</th>
          <th className="px-3 py-2 text-right">Sub Total</th>
          <th className="px-3 py-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border bg-card">
        {row.lines.map((line, i) => (
          <tr key={i}>
            <td className="px-3 py-2 font-semibold text-foreground">{line.description}</td>
            <td className="px-3 py-2 text-center text-muted-foreground">{line.tax_code || '—'}</td>
            <td className="px-3 py-2 text-center text-foreground">{line.tax_rate ?? 0}%</td>
            <td className="px-3 py-2 text-center text-foreground">{line.quantity}</td>
            <td className="px-3 py-2 text-right font-mono text-foreground">{Number(line.unit_price).toLocaleString()}</td>
            <td className="px-3 py-2 text-right font-mono text-foreground">
              {(Number(line.quantity) * Number(line.unit_price)).toLocaleString()}
            </td>
            <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
              {Number(line.line_total).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---- Empty State ----

export function EmptyState({
  title, description, createLabel, onCreateClick,
}: {
  title: string;
  description?: string;
  createLabel?: string;
  onCreateClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <FileText className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">No {title} yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6 mx-auto">
        {description ?? `Create your first ${title.toLowerCase()} to get started.`}
      </p>
      {onCreateClick && createLabel && (
        <Button variant="primary" className="gap-2" onClick={onCreateClick}>
          <Plus className="h-4 w-4" /> {createLabel}
        </Button>
      )}
    </div>
  );
}

// ---- Adapter utilities ----

export function invoiceToDocumentRow(inv: Invoice): DocumentRow {
  return {
    id: inv.id,
    doc_number: inv.invoice_number,
    tenant_name: inv.tenant_name,
    tenant_slug: inv.tenant_slug,
    customer_name: inv.customer_name,
    customer_email: inv.customer_email,
    currency: inv.currency,
    total_amount: inv.total_amount,
    status: inv.status,
    payment_status: inv.payment_status,
    delivery_status: inv.delivery_status,
    doc_date: inv.invoice_date,
    due_date: inv.due_date,
    public_token: inv.public_token,
    lines: inv.lines?.map(l => ({
      description: l.description,
      tax_code: l.tax_code,
      tax_rate: l.tax_rate,
      quantity: l.quantity,
      unit_price: l.unit_price,
      line_total: l.line_total,
    })),
  };
}

export function quotationToDocumentRow(qt: Quotation): DocumentRow {
  return {
    id: qt.id,
    doc_number: qt.quote_number,
    tenant_name: qt.tenant_name,
    tenant_slug: qt.tenant_slug,
    customer_name: qt.customer_name,
    customer_email: qt.customer_email,
    currency: qt.currency,
    total_amount: qt.total_amount,
    status: qt.status,
    doc_date: qt.quote_date,
    secondary_date: qt.valid_until,
    public_token: qt.public_token,
    lines: qt.lines?.map(l => ({
      description: l.description,
      tax_code: l.tax_code,
      tax_rate: l.tax_rate,
      quantity: l.quantity,
      unit_price: l.unit_price,
      line_total: l.line_total,
    })),
  };
}
