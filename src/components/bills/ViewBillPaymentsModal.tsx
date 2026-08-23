'use client';

import { useState } from 'react';
import { Loader2, Printer, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBillPayments, useVoidBillPayment } from '@/hooks/use-bills';
import type { Bill, BillPayment } from '@/lib/api/bills';
import { formatCurrency } from '@/lib/utils/currency';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', bank: 'Bank transfer', bank_transfer: 'Bank Transfer', card: 'Card',
  cheque: 'Cheque', mpesa_b2b: 'M-Pesa B2B', mpesa_b2c: 'M-Pesa B2C',
  paystack_bank: 'Paystack (bank)', paystack_mobile: 'Paystack (mobile)',
  vendor_credit: 'Vendor credit', gateway_collected: 'Gateway (linked payment)', manual: 'Manual',
};

const fmtDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/**
 * ViewBillPaymentsModal — the recorded-payments history for a vendor bill: Date / Reference /
 * Method / Amount / Status, with a Void action (reversing journal + amount_paid/status
 * recompute). The AP mirror of the invoice ViewPaymentsModal — lets a bill paid across several
 * partial payments (cash, bank, vendor credit, online dispatch) show its complete settlement
 * trail, not just the single most-recent payment_method/payment_reference on the bill itself.
 */
export function ViewBillPaymentsModal({ tenant, bill, onClose, canManage = true }: {
  tenant: string;
  bill: Bill;
  onClose: () => void;
  canManage?: boolean;
}) {
  const { data, isLoading } = useBillPayments(tenant, bill.id);
  const payments: BillPayment[] = data?.data ?? [];
  const paidSum = payments.filter((p) => p.status === 'active').reduce((s, p) => s + Number(p.amount || 0), 0);
  const voidPayment = useVoidBillPayment(tenant);
  const [voiding, setVoiding] = useState<BillPayment | null>(null);

  const printPayments = () => {
    const rows = payments.map((p) =>
      `<tr><td>${fmtDateTime(p.paid_at)}</td><td>${p.reference || p.id.slice(0, 8)}</td>` +
      `<td>${METHOD_LABELS[p.method] ?? p.method}</td>` +
      `<td style="text-align:right">${formatCurrency(Number(p.amount), p.currency)}</td><td>${p.status}</td></tr>`).join('');
    const w = window.open('', '_blank', 'width=760,height=560');
    if (!w) { toast.error('Pop-up blocked — allow pop-ups to print'); return; }
    w.document.write(
      `<html><head><title>Payments — ${bill.bill_number}</title>` +
      `<style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:13px}` +
      `th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}</style></head><body>` +
      `<h3>Payments — ${bill.bill_number}</h3>` +
      `<p>Total: ${formatCurrency(Number(bill.total_amount), bill.currency)} · Paid: ${formatCurrency(paidSum, bill.currency)}</p>` +
      `<table><thead><tr><th>Date</th><th>Reference</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead>` +
      `<tbody>${rows}</tbody></table></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-black text-foreground">Payments — {bill.bill_number}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total {formatCurrency(Number(bill.total_amount), bill.currency)} · Paid {formatCurrency(paidSum, bill.currency)}
              {' · '}Balance due {formatCurrency(Number(bill.total_amount) - paidSum, bill.currency)}
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
            <p className="text-center text-sm text-muted-foreground py-6">No payments recorded on this bill yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap border-collapse">
                <thead>
                  <tr className="text-left text-muted-foreground uppercase tracking-wider">
                    <th className="py-2 px-2 border border-border/60 font-bold">Date</th>
                    <th className="py-2 px-2 border border-border/60 font-bold">Reference</th>
                    <th className="py-2 px-2 border border-border/60 font-bold">Method</th>
                    <th className="py-2 px-2 border border-border/60 font-bold text-right">Amount</th>
                    <th className="py-2 px-2 border border-border/60 font-bold">Status</th>
                    {canManage && <th className="py-2 px-2 border border-border/60 font-bold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className={p.status === 'voided' ? 'opacity-60' : ''}>
                      <td className="py-2 px-2 border border-border/40">{fmtDateTime(p.paid_at)}</td>
                      <td className="py-2 px-2 border border-border/40 font-mono">{p.reference || p.id.slice(0, 8)}</td>
                      <td className="py-2 px-2 border border-border/40">{METHOD_LABELS[p.method] ?? p.method}</td>
                      <td className="py-2 px-2 border border-border/40 text-right tabular-nums font-semibold">{formatCurrency(Number(p.amount), p.currency)}</td>
                      <td className="py-2 px-2 border border-border/40">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-600'}`}>
                          {p.status === 'active' ? 'Active' : 'Voided'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-2 px-2 border border-border/40">
                          {p.status === 'active' && (
                            <button title="Void payment (reversing journal; totals recomputed)"
                              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/10"
                              onClick={() => setVoiding(p)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {voiding && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-xs text-red-700">
                Void {formatCurrency(Number(voiding.amount), voiding.currency)} on {bill.bill_number}? A reversing journal is
                posted, the paid total is recomputed, and the bill reopens if it was fully paid.
              </p>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background hover:bg-accent" onClick={() => setVoiding(null)}>Cancel</button>
                <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={voidPayment.isPending}
                  onClick={() => voidPayment.mutate(
                    { billId: bill.id, paymentId: voiding.id, reason: 'Voided from View Payments' },
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
