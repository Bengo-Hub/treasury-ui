'use client';

import { useState } from 'react';
import { Loader2, Printer, Trash2, X } from 'lucide-react';
import { useCustomerReceipts, useVoidCustomerReceipt } from '@/hooks/use-arpa';
import type { ARReceipt } from '@/lib/api/arpa';
import type { CustomerBalance } from '@/lib/api/invoices';
import { formatCurrency } from '@/lib/utils/currency';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', bank: 'Bank transfer', bank_transfer: 'Bank Transfer', card: 'Card',
  cheque: 'Cheque', mpesa: 'M-Pesa', mpesa_manual: 'M-Pesa (Code)', card_manual: 'Card / PDQ',
  mtn_momo: 'MTN Mobile Money', airtel_money: 'Airtel Money', paystack: 'Paystack', manual: 'Manual',
};

const fmtDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/**
 * ViewCustomerPaymentsModal — the recorded-payments history for a customer's AR account: Date /
 * Reference / Method / Amount / Status, with a Void action (reinstates the debt + reversing
 * journal). The AR mirror of bills' ViewBillPaymentsModal — lets a tenant/platform admin correct
 * a payment recorded against the wrong customer/order/amount, which was previously not possible
 * at all (see the 2026-08-30 remediation plan, Batch 5).
 */
export function ViewCustomerPaymentsModal({ tenant, customer, onClose, canManage = true }: {
  tenant: string;
  customer: CustomerBalance;
  onClose: () => void;
  canManage?: boolean;
}) {
  const contactId = customer.crm_contact_id || customer.customer_identifier || customer.id;
  const { data, isLoading } = useCustomerReceipts(tenant, contactId);
  const receipts: ARReceipt[] = data?.data ?? [];
  const activeSum = receipts.filter((r) => r.status !== 'voided').reduce((s, r) => s + Number(r.amount || 0), 0);
  const voidReceipt = useVoidCustomerReceipt(tenant);
  const [voiding, setVoiding] = useState<ARReceipt | null>(null);
  const [reason, setReason] = useState('');

  const printReceipts = () => {
    const rows = receipts.map((r) =>
      `<tr><td>${fmtDateTime(r.occurred_at)}</td><td>${r.reference || r.id.slice(0, 8)}</td>` +
      `<td>${METHOD_LABELS[r.method] ?? r.method}</td>` +
      `<td style="text-align:right">${formatCurrency(Number(r.amount), r.currency)}</td><td>${r.status}</td></tr>`).join('');
    const w = window.open('', '_blank', 'width=760,height=560');
    if (!w) return;
    w.document.write(
      `<html><head><title>Payments — ${customer.customer_name || contactId}</title>` +
      `<style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:13px}` +
      `th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}</style></head><body>` +
      `<h3>Payments — ${customer.customer_name || contactId}</h3>` +
      `<p>Total received: ${formatCurrency(activeSum, customer.currency)}</p>` +
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
            <h2 className="text-sm font-black text-foreground">Payments — {customer.customer_name || contactId}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total received {formatCurrency(activeSum, customer.currency)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : receipts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No payments recorded for this customer yet.</p>
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
                  {receipts.map((r) => (
                    <tr key={r.id} className={r.status === 'voided' ? 'opacity-60' : ''}>
                      <td className="py-2 px-2 border border-border/40">{fmtDateTime(r.occurred_at)}</td>
                      <td className="py-2 px-2 border border-border/40 font-mono">{r.reference || r.id.slice(0, 8)}</td>
                      <td className="py-2 px-2 border border-border/40">{METHOD_LABELS[r.method] ?? r.method}</td>
                      <td className="py-2 px-2 border border-border/40 text-right tabular-nums font-semibold">{formatCurrency(Number(r.amount), r.currency)}</td>
                      <td className="py-2 px-2 border border-border/40">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status !== 'voided' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-600'}`}>
                          {r.status !== 'voided' ? 'Received' : 'Voided'}
                        </span>
                        {r.status === 'voided' && r.void_reason && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground normal-case">{r.void_reason}</p>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-2 px-2 border border-border/40">
                          {r.status !== 'voided' && (
                            <button title="Void payment — reinstates the customer's balance + a reversing journal"
                              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/10"
                              onClick={() => { setVoiding(r); setReason(''); }}>
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
                Void {formatCurrency(Number(voiding.amount), voiding.currency)} recorded on {fmtDateTime(voiding.occurred_at)}?
                The customer's balance is reinstated and a reversing journal is posted — use this when a payment was recorded
                against the wrong order or the wrong amount.
              </p>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (e.g. recorded against the wrong order)"
                className="w-full rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background hover:bg-accent" onClick={() => setVoiding(null)}>Cancel</button>
                <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={voidReceipt.isPending}
                  onClick={() => voidReceipt.mutate(
                    { contactId, receiptId: voiding.id, reason: reason.trim() || undefined },
                    { onSuccess: () => setVoiding(null) },
                  )}>
                  {voidReceipt.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Void payment
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-3 border-t border-border bg-accent/10">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background hover:bg-accent" onClick={printReceipts}>
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
