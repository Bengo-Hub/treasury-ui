'use client';

import { useState } from 'react';
import { Check, Loader2, Mail, Pencil, Printer, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInvoicePayments, useUpdateInvoicePayment, useVoidInvoicePayment, useNotifyInvoicePayment,
} from '@/hooks/use-invoices';
import type { InvoicePayment } from '@/lib/api/invoices';

/** Minimal invoice shape the modal needs — satisfied by both Invoice and DocumentRow. */
export interface ViewPaymentsInvoiceRef {
  id: string;
  invoice_number: string;
  total_amount: string | number;
  currency?: string;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer', mpesa: 'M-Pesa', card: 'Card',
  cheque: 'Cheque', manual: 'Manual', other: 'Other',
};

const fmtMoney = (v: string | number, cur = 'KES') =>
  `${cur} ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * ViewPaymentsModal — the detailed recorded-payments view for an invoice: Date /
 * Reference / Method / Note / Amount / Status with per-row Edit (descriptive fields —
 * never the amount), Void (reversing journal + cumulative amount_paid recompute), Send
 * Payment Received Notification, and Print. Mutations require treasury.invoices
 * change/manage (the routes are gated server-side).
 */
export function ViewPaymentsModal({ tenant, invoice, onClose, canManage = true }: {
  tenant: string;
  invoice: ViewPaymentsInvoiceRef;
  onClose: () => void;
  canManage?: boolean;
}) {
  const { data, isLoading } = useInvoicePayments(tenant, invoice.id);
  const payments: InvoicePayment[] = data?.data ?? [];
  // Paid = sum of ACTIVE rows (authoritative for this view; matches the backend recompute).
  const paidSum = payments.filter((p) => p.status === 'active').reduce((s, p) => s + Number(p.amount || 0), 0);
  const updatePayment = useUpdateInvoicePayment(tenant);
  const voidPayment = useVoidInvoicePayment(tenant);
  const notifyPayment = useNotifyInvoicePayment(tenant);

  const [editing, setEditing] = useState<{ id: string; reference: string; note: string; method: string } | null>(null);
  const [voiding, setVoiding] = useState<InvoicePayment | null>(null);

  const printPayments = () => {
    const rows = payments.map((p) =>
      `<tr><td>${p.paid_at?.slice(0, 10) ?? '—'}</td><td>${p.reference || p.id.slice(0, 8)}</td>` +
      `<td>${METHOD_LABELS[p.method] ?? p.method}</td><td>${p.note || ''}</td>` +
      `<td style="text-align:right">${fmtMoney(p.amount, p.currency)}</td><td>${p.status}</td></tr>`).join('');
    const w = window.open('', '_blank', 'width=760,height=560');
    if (!w) { toast.error('Pop-up blocked — allow pop-ups to print'); return; }
    w.document.write(
      `<html><head><title>Payments — ${invoice.invoice_number}</title>` +
      `<style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:13px}` +
      `th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}</style></head><body>` +
      `<h3>Payments — ${invoice.invoice_number}</h3>` +
      `<p>Total: ${fmtMoney(invoice.total_amount, invoice.currency)} · Paid: ${fmtMoney(paidSum, invoice.currency)}</p>` +
      `<table><thead><tr><th>Date</th><th>Reference</th><th>Method</th><th>Note</th><th>Amount</th><th>Status</th></tr></thead>` +
      `<tbody>${rows}</tbody></table></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const inputCls = 'w-full rounded-lg py-1.5 px-2 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-black text-foreground">Payments — {invoice.invoice_number}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total {fmtMoney(invoice.total_amount, invoice.currency)} · Paid {fmtMoney(paidSum, invoice.currency)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : payments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No payments recorded on this invoice.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap border-collapse">
                <thead>
                  <tr className="text-left text-muted-foreground uppercase tracking-wider">
                    <th className="py-2 px-2 border border-border/60 font-bold">Date</th>
                    <th className="py-2 px-2 border border-border/60 font-bold">Reference No</th>
                    <th className="py-2 px-2 border border-border/60 font-bold">Method</th>
                    <th className="py-2 px-2 border border-border/60 font-bold">Note</th>
                    <th className="py-2 px-2 border border-border/60 font-bold text-right">Amount</th>
                    <th className="py-2 px-2 border border-border/60 font-bold">Status</th>
                    {canManage && <th className="py-2 px-2 border border-border/60 font-bold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className={p.status === 'voided' ? 'opacity-60' : ''}>
                      <td className="py-2 px-2 border border-border/40">{p.paid_at?.slice(0, 10) ?? '—'}</td>
                      <td className="py-2 px-2 border border-border/40 font-mono">{p.reference || p.id.slice(0, 8)}</td>
                      <td className="py-2 px-2 border border-border/40">{METHOD_LABELS[p.method] ?? p.method}</td>
                      <td className="py-2 px-2 border border-border/40 max-w-[160px] truncate" title={p.note}>{p.note || '—'}</td>
                      <td className="py-2 px-2 border border-border/40 text-right tabular-nums font-semibold">{fmtMoney(p.amount, p.currency)}</td>
                      <td className="py-2 px-2 border border-border/40">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-600'}`}>
                          {p.status === 'active' ? 'Active' : 'Voided'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-2 px-2 border border-border/40">
                          {p.status === 'active' && (
                            <div className="flex items-center gap-1">
                              <button title="Edit payment (reference/note/method — not the amount)"
                                className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent"
                                onClick={() => setEditing({ id: p.id, reference: p.reference ?? '', note: p.note ?? '', method: p.method })}>
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <button title="Void payment (reversing journal; totals recomputed)"
                                className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/10"
                                onClick={() => setVoiding(p)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                              <button title="Send payment received notification"
                                className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent"
                                disabled={notifyPayment.isPending}
                                onClick={() => notifyPayment.mutate({ invoiceId: invoice.id, paymentId: p.id }, {
                                  onSuccess: () => toast.success('Payment notification queued'),
                                  onError: (e: any) => toast.error(e?.response?.data?.error || 'Could not send notification'),
                                })}>
                                <Mail className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editing && (
            <div className="rounded-xl border border-border p-3 space-y-2 bg-accent/10">
              <p className="text-[11px] font-bold">Edit payment — the amount is not editable (void &amp; re-record to change money)</p>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Reference
                  <input className={inputCls} value={editing.reference} onChange={(e) => setEditing({ ...editing, reference: e.target.value })} />
                </label>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Note
                  <input className={inputCls} value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
                </label>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Method
                  <select className={inputCls} value={editing.method} onChange={(e) => setEditing({ ...editing, method: e.target.value })}>
                    {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border hover:bg-accent" onClick={() => setEditing(null)}>Cancel</button>
                <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  disabled={updatePayment.isPending}
                  onClick={() => updatePayment.mutate(
                    { invoiceId: invoice.id, paymentId: editing.id, reference: editing.reference, note: editing.note, method: editing.method },
                    {
                      onSuccess: () => { toast.success('Payment updated'); setEditing(null); },
                      onError: (e: any) => toast.error(e?.response?.data?.error || 'Update failed'),
                    },
                  )}>
                  {updatePayment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                </button>
              </div>
            </div>
          )}

          {voiding && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-xs text-red-700">
                Void {fmtMoney(voiding.amount, voiding.currency)} on {invoice.invoice_number}? A reversing journal is posted,
                the paid total is recomputed, and a fully-paid invoice reopens.
              </p>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background hover:bg-accent" onClick={() => setVoiding(null)}>Cancel</button>
                <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={voidPayment.isPending}
                  onClick={() => voidPayment.mutate(
                    { invoiceId: invoice.id, paymentId: voiding.id, reason: 'Voided from View Payments' },
                    {
                      onSuccess: () => { toast.success('Payment voided'); setVoiding(null); },
                      onError: (e: any) => toast.error(e?.response?.data?.error || 'Void failed'),
                    },
                  )}>
                  {voidPayment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Void payment
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-3 border-t border-border bg-accent/10">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background hover:bg-accent" onClick={printPayments}>
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
