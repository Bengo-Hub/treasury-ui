'use client';

import { useInvoice, useQuotation } from '@/hooks/use-invoices';
import { Badge } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import { Copy, ExternalLink, FileText, Link2, Mail, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { downloadInvoicePdf, downloadQuotationPdf } from '@/lib/api/documents';
import { MarginPanel } from './MarginPanel';

type DocType = 'invoice' | 'quotation' | 'proforma_invoice' | 'credit_note' | 'debit_note' | 'sales_order' | 'payment_receipt';

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' {
  switch (status?.toLowerCase()) {
    case 'accepted': case 'paid': case 'converted': return 'success';
    case 'sent': case 'confirmed': case 'delivered': return 'default';
    case 'draft': return 'secondary';
    case 'expired': case 'overdue': return 'warning';
    case 'declined': case 'void': case 'cancelled': return 'error';
    default: return 'outline';
  }
}

const fmt = (v: string | number | undefined) =>
  v != null ? Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

const fmtDate = (d: string | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function docLabel(docType: DocType): string {
  const labels: Record<DocType, string> = {
    invoice: 'INVOICE',
    quotation: 'QUOTATION',
    proforma_invoice: 'PROFORMA INVOICE',
    credit_note: 'CREDIT NOTE',
    debit_note: 'DEBIT NOTE',
    sales_order: 'SALES ORDER',
    payment_receipt: 'PAYMENT RECEIPT',
  };
  return labels[docType] ?? docType.toUpperCase().replace('_', ' ');
}

interface PreviewLine {
  id?: string;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  /** Buying / cost price per unit (business-only). */
  unit_cost?: string | number;
  tax_amount?: string | number;
  line_total: string | number;
}

interface PreviewDoc {
  id: string;
  docNumber: string;
  primaryDate: string;
  secondaryDate?: string;
  primaryDateLabel: string;
  secondaryDateLabel?: string;
  customer_name?: string;
  customer_email?: string;
  currency: string;
  subtotal: string | number;
  tax_amount: string | number;
  discount_amount?: string | number;
  total_amount: string | number;
  status: string;
  public_token?: string;
  notes?: string;
  terms?: string;
  lines?: PreviewLine[];
  publicPath: string; // e.g. /q/ or /i/
}

function usePreviewDoc(
  tenant: string,
  docId: string,
  docType: DocType,
): { data: PreviewDoc | undefined; isLoading: boolean } {
  const isQuotation = docType === 'quotation';
  // payment_receipt fetches like an invoice (same endpoint, different invoice_type in DB)
  const { data: inv, isLoading: invLoading } = useInvoice(tenant, docId, !isQuotation);
  const { data: qt, isLoading: qtLoading } = useQuotation(tenant, docId, isQuotation);

  if (isQuotation) {
    return {
      isLoading: qtLoading,
      data: qt ? {
        id: qt.id,
        docNumber: qt.quote_number,
        primaryDate: qt.quote_date,
        secondaryDate: qt.valid_until,
        primaryDateLabel: 'Quotation Date',
        secondaryDateLabel: 'Valid Until',
        customer_name: qt.customer_name,
        customer_email: qt.customer_email,
        currency: qt.currency,
        subtotal: qt.subtotal,
        tax_amount: qt.tax_amount,
        discount_amount: qt.discount_amount,
        total_amount: qt.total_amount,
        status: qt.status,
        public_token: qt.public_token,
        notes: qt.notes,
        terms: qt.terms,
        lines: qt.lines?.map(l => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          unit_cost: l.unit_cost,
          tax_amount: l.tax_amount,
          line_total: l.line_total,
        })),
        publicPath: '/q/',
      } : undefined,
    };
  }

  const labels: Record<DocType, { primary: string; secondary?: string }> = {
    invoice: { primary: 'Invoice Date', secondary: 'Due Date' },
    proforma_invoice: { primary: 'Invoice Date', secondary: 'Due Date' },
    credit_note: { primary: 'Date' },
    debit_note: { primary: 'Date' },
    sales_order: { primary: 'Order Date' },
    quotation: { primary: 'Quotation Date', secondary: 'Valid Until' },
    payment_receipt: { primary: 'Payment Date' },
  };
  const lbl = labels[docType] ?? { primary: 'Date' };

  return {
    isLoading: invLoading,
    data: inv ? {
      id: inv.id,
      docNumber: inv.invoice_number,
      primaryDate: inv.invoice_date,
      secondaryDate: inv.due_date,
      primaryDateLabel: lbl.primary,
      secondaryDateLabel: lbl.secondary,
      customer_name: inv.customer_name,
      customer_email: inv.customer_email,
      currency: inv.currency,
      subtotal: inv.subtotal,
      tax_amount: inv.tax_amount,
      discount_amount: inv.discount_amount,
      total_amount: inv.total_amount,
      status: inv.status,
      public_token: inv.public_token,
      notes: inv.notes,
      terms: inv.terms,
      lines: inv.lines?.map(l => ({
        id: l.id,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        unit_cost: l.unit_cost,
        tax_amount: l.tax_amount,
        line_total: l.line_total,
      })),
      publicPath: '/i/',
    } : undefined,
  };
}

interface DocPreviewProps {
  docId: string;
  docType: DocType;
  tenant: string;
  onClose: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
}

export function DocPreview({ docId, docType, tenant, onClose, onEdit, onDuplicate }: DocPreviewProps) {
  const { data: doc, isLoading } = usePreviewDoc(tenant, docId, docType);
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });

  // Fetch the rendered PDF as a blob from the authenticated endpoint (quotations
  // use their own endpoint; everything else streams from the invoice endpoint).
  const openPdf = () => {
    if (!doc) return;
    const fetchFn = () =>
      (docType === 'quotation'
        ? downloadQuotationPdf(tenant, doc.id, doc.docNumber)
        : downloadInvoicePdf(tenant, doc.id, doc.docNumber)
      ).then((r) => r.blob);
    openPreview(fetchFn, { fileName: `${doc.docNumber}.pdf`, title: `${docLabel(docType)} ${doc.docNumber}` });
  };

  const actions = [
    {
      icon: <ExternalLink className="h-4 w-4" />,
      label: 'Open',
      onClick: () => doc?.public_token && window.open(`${window.location.origin}${doc.publicPath}${doc.public_token}`, '_blank'),
      show: !!doc?.public_token,
    },
    {
      icon: <Link2 className="h-4 w-4" />,
      label: 'Copy Link',
      onClick: () => doc?.public_token && navigator.clipboard.writeText(`${window.location.origin}${doc.publicPath}${doc.public_token}`),
      show: !!doc?.public_token,
    },
    {
      icon: <Mail className="h-4 w-4" />,
      label: 'Email',
      onClick: () => {},
      show: true,
    },
    {
      icon: <Copy className="h-4 w-4" />,
      label: 'Duplicate',
      onClick: () => onDuplicate?.(),
      show: !!onDuplicate,
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: 'PDF',
      onClick: openPdf,
      show: !!doc,
    },
    {
      icon: <Pencil className="h-4 w-4" />,
      label: 'Edit',
      onClick: () => onEdit?.(),
      show: !!onEdit,
    },
  ].filter(a => a.show);

  return (
    <>
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-2xl bg-card shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200 border-l border-border">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-accent/30">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">Quick Preview</h2>
            {doc && (
              <Badge variant={statusVariant(doc.status)} className="capitalize text-[10px]">
                {doc.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {actions.map(({ icon, label, onClick }) => (
              <button
                key={label}
                title={label}
                onClick={onClick}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-accent text-xs font-semibold transition-colors"
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-medium">
              Loading…
            </div>
          )}

          {doc && (
            <div className="space-y-6 text-sm">
              {/* Document header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black text-foreground tracking-tight">{docLabel(docType)}</h1>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{doc.docNumber}</p>
                </div>
                <div className="h-14 w-14 rounded-xl bg-accent border border-border flex items-center justify-center text-muted-foreground text-xs font-bold">
                  Logo
                </div>
              </div>

              {/* Meta row */}
              <div className={cn('grid gap-4 text-xs', doc.secondaryDate ? 'grid-cols-3' : 'grid-cols-2')}>
                <div>
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">{doc.primaryDateLabel}</p>
                  <p className="font-semibold text-foreground">{fmtDate(doc.primaryDate)}</p>
                </div>
                {doc.secondaryDate && doc.secondaryDateLabel && (
                  <div>
                    <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">{doc.secondaryDateLabel}</p>
                    <p className="font-semibold text-foreground">{fmtDate(doc.secondaryDate)}</p>
                  </div>
                )}
                <div>
                  <p className="font-bold text-muted-foreground uppercase tracking-wider mb-1">Currency</p>
                  <p className="font-semibold text-foreground">{doc.currency}</p>
                </div>
              </div>

              {/* Client block */}
              {(doc.customer_name || doc.customer_email) && (
                <div className="bg-accent/30 rounded-xl p-4 border border-border">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Billed To</p>
                  {doc.customer_name && <p className="font-bold text-foreground">{doc.customer_name}</p>}
                  {doc.customer_email && <p className="font-mono text-muted-foreground text-xs">{doc.customer_email}</p>}
                </div>
              )}

              {/* Line items */}
              {doc.lines && doc.lines.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Line Items</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs border-collapse no-grid">
                      <thead>
                        <tr className="bg-accent border-b border-border text-muted-foreground font-bold uppercase tracking-wide text-[10px]">
                          <th className="p-2.5 pl-3 text-left">Item</th>
                          <th className="p-2.5 text-right">Qty</th>
                          <th className="p-2.5 text-right">Rate</th>
                          <th className="p-2.5 text-right">Tax</th>
                          <th className="p-2.5 pr-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {doc.lines.map((line, i) => (
                          <tr key={line.id ?? i} className="hover:bg-accent/30">
                            <td className="p-2.5 pl-3 font-medium text-foreground">{line.description}</td>
                            <td className="p-2.5 text-right text-muted-foreground tabular-nums">{fmt(line.quantity)}</td>
                            <td className="p-2.5 text-right text-muted-foreground tabular-nums">{fmt(line.unit_price)}</td>
                            <td className="p-2.5 text-right text-muted-foreground tabular-nums">{fmt(line.tax_amount)}</td>
                            <td className="p-2.5 pr-3 text-right font-bold text-foreground tabular-nums">{fmt(line.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Business-only margin analysis (internal — never on the customer PDF). */}
              {doc.lines && doc.lines.length > 0 && (
                <MarginPanel
                  currency={doc.currency}
                  detailed={false}
                  lines={doc.lines.map(l => ({
                    description: l.description,
                    quantity: Number(l.quantity),
                    unit_price: Number(l.unit_price),
                    unit_cost: l.unit_cost != null ? Number(l.unit_cost) : undefined,
                  }))}
                />
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="space-y-1.5 min-w-[200px]">
                  {[
                    { label: 'Subtotal', value: doc.subtotal },
                    { label: 'Tax', value: doc.tax_amount },
                    { label: 'Discount', value: doc.discount_amount },
                  ].filter(r => Number(r.value ?? 0) > 0).map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>{label}</span>
                      <span className="tabular-nums font-semibold">{fmt(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-black text-foreground border-t border-border pt-2 mt-2">
                    <span>Total ({doc.currency})</span>
                    <span className="tabular-nums">{fmt(doc.total_amount)}</span>
                  </div>
                </div>
              </div>

              {doc.notes && (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{doc.notes}</p>
                </div>
              )}
              {doc.terms && (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Terms & Conditions</p>
                  <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-line">{doc.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    <PdfPreview {...previewProps} />
    </>
  );
}
