'use client';

import { useParams, useRouter } from 'next/navigation';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useInvoice,
  useSendInvoice,
  useVoidInvoice,
  useMarkPaid,
  useRecordPayment,
  useCreateCreditNote,
  useCreateDebitNote,
} from '@/hooks/use-invoices';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Ban, CheckCircle, Copy, DollarSign, Download,
  ExternalLink, FileMinus, FilePlus, Loader2, Send, X,
} from 'lucide-react';
import { useCallback, useState } from 'react';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    paid:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    sent:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    draft:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    overdue:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    void:     'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
    cancelled:'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide', variants[status] ?? 'bg-zinc-100 text-zinc-600')}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    paid:    'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
    unpaid:  'bg-red-100 text-red-700',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide', variants[status] ?? 'bg-zinc-100 text-zinc-600')}>
      {status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0 gap-4">
      <span className="text-xs text-muted-foreground font-medium shrink-0">{label}</span>
      <span className="text-xs font-bold text-foreground text-right">{value}</span>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const invoiceId = params.invoiceId as string;
  const orgSlug   = params.orgSlug as string;

  const { tenantPathId: effectiveTenant } = useResolvedTenant();

  const { data: invoice, isLoading, error } = useInvoice(effectiveTenant, invoiceId, !!effectiveTenant && !!invoiceId);

  const sendMutation   = useSendInvoice(effectiveTenant);
  const voidMutation   = useVoidInvoice(effectiveTenant);
  const markPaidMut    = useMarkPaid(effectiveTenant);
  const recordPayMut   = useRecordPayment(effectiveTenant);
  const creditNoteMut  = useCreateCreditNote(effectiveTenant);
  const debitNoteMut   = useCreateDebitNote(effectiveTenant);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPayModal, setShowPayModal]   = useState(false);

  const handleRecordPayment = useCallback(() => {
    if (!paymentAmount) return;
    recordPayMut.mutate(
      { invoiceId, amount: paymentAmount },
      { onSuccess: () => { setShowPayModal(false); setPaymentAmount(''); } },
    );
  }, [invoiceId, paymentAmount, recordPayMut]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm font-bold text-foreground">Invoice not found</p>
          <button onClick={() => router.back()} className="text-xs text-primary hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  const fmtAmount = (v: string | number) =>
    `${invoice.currency} ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const canSend        = invoice.status === 'draft';
  const canVoid        = !['void', 'cancelled', 'paid'].includes(invoice.status);
  const canRecordPay   = ['unpaid', 'partial'].includes(invoice.payment_status) && !['void', 'cancelled'].includes(invoice.status);
  const canMarkPaid    = invoice.payment_status !== 'paid' && !['void', 'cancelled'].includes(invoice.status);
  const canCreditDebit = ['sent', 'paid', 'overdue'].includes(invoice.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${orgSlug}/invoices`)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-5 w-px bg-border" />
          <div>
            <h1 className="text-sm font-black text-foreground">{invoice.invoice_number}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={invoice.status} />
              <PaymentBadge status={invoice.payment_status} />
            </div>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {invoice.public_token && (
            <>
              <button
                onClick={() => window.open(`/i/${invoice.public_token}`, '_blank')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View
              </button>
              <button
                onClick={() => window.open(`/api/v1/public/invoices/${invoice.public_token}/pdf?download=true`, '_blank')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </>
          )}
          {canSend && (
            <button
              onClick={() => sendMutation.mutate(invoiceId)}
              disabled={sendMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </button>
          )}
          {canRecordPay && (
            <button
              onClick={() => setShowPayModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <DollarSign className="h-3.5 w-3.5" /> Record Payment
            </button>
          )}
          {canMarkPaid && (
            <button
              onClick={() => markPaidMut.mutate(invoiceId)}
              disabled={markPaidMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Mark Paid
            </button>
          )}
          {canCreditDebit && (
            <>
              <button
                onClick={() => creditNoteMut.mutate(invoiceId)}
                disabled={creditNoteMut.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <FileMinus className="h-3.5 w-3.5" /> Credit Note
              </button>
              <button
                onClick={() => debitNoteMut.mutate(invoiceId)}
                disabled={debitNoteMut.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <FilePlus className="h-3.5 w-3.5" /> Debit Note
              </button>
            </>
          )}
          {canVoid && (
            <button
              onClick={() => voidMutation.mutate(invoiceId)}
              disabled={voidMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" /> Void
            </button>
          )}
          <button
            onClick={() => router.push(`/${orgSlug}/invoices?edit=${invoiceId}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-xs font-bold text-foreground hover:bg-accent/80 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> Edit
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Summary card */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Customer</p>
              <p className="text-lg font-black text-foreground">{invoice.customer_name || '—'}</p>
              {invoice.customer_email && (
                <p className="text-xs text-muted-foreground font-mono">{invoice.customer_email}</p>
              )}
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Total Amount</p>
              <p className="text-2xl font-black text-foreground tabular-nums">{fmtAmount(invoice.total_amount)}</p>
              <p className="text-xs text-muted-foreground">Tax: {fmtAmount(invoice.tax_amount)}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-accent/30 border border-border">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Invoice No</p>
              <p className="text-xs font-black text-foreground font-mono">{invoice.invoice_number}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/30 border border-border">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Invoice Date</p>
              <p className="text-xs font-black text-foreground">{invoice.invoice_date?.slice(0, 10) || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/30 border border-border">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Due Date</p>
              <p className="text-xs font-black text-foreground">{invoice.due_date?.slice(0, 10) || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/30 border border-border">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Currency</p>
              <p className="text-xs font-black text-foreground">{invoice.currency}</p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        {invoice.lines && invoice.lines.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-accent/20">
                    <th className="text-left px-4 py-2.5 font-bold text-muted-foreground">#</th>
                    <th className="text-left px-4 py-2.5 font-bold text-muted-foreground">Description</th>
                    <th className="text-right px-4 py-2.5 font-bold text-muted-foreground">Qty</th>
                    <th className="text-right px-4 py-2.5 font-bold text-muted-foreground">Unit Price</th>
                    <th className="text-right px-4 py-2.5 font-bold text-muted-foreground">Tax</th>
                    <th className="text-right px-4 py-2.5 font-bold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, i) => (
                    <tr key={line.id ?? i} className="border-b border-border last:border-0 hover:bg-accent/10">
                      <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{line.description}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{Number(line.quantity).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtAmount(line.unit_price)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{Number(line.tax_rate).toFixed(1)}%</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold">{fmtAmount(line.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totals footer */}
            <div className="px-5 py-4 border-t border-border flex justify-end">
              <div className="w-64 space-y-1">
                <DetailRow label="Subtotal" value={fmtAmount(invoice.subtotal)} />
                {Number(invoice.discount_amount) > 0 && (
                  <DetailRow label="Discount" value={`− ${fmtAmount(invoice.discount_amount ?? 0)}`} />
                )}
                <DetailRow label="Tax" value={fmtAmount(invoice.tax_amount)} />
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-black text-foreground">Total</span>
                  <span className="text-sm font-black text-foreground tabular-nums">{fmtAmount(invoice.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoice.notes && (
              <div className="rounded-xl border border-border bg-card shadow-sm p-5">
                <h3 className="text-xs font-bold text-foreground mb-2">Notes</h3>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div className="rounded-xl border border-border bg-card shadow-sm p-5">
                <h3 className="text-xs font-bold text-foreground mb-2">Terms & Conditions</h3>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-5">
          <h3 className="text-xs font-bold text-foreground mb-3">Document Info</h3>
          <div className="space-y-0">
            <DetailRow label="Invoice Type" value={invoice.invoice_type} />
            <DetailRow label="Status" value={<StatusBadge status={invoice.status} />} />
            <DetailRow label="Payment Status" value={<PaymentBadge status={invoice.payment_status} />} />
            <DetailRow label="Created" value={new Date(invoice.created_at).toLocaleDateString()} />
            <DetailRow label="Last Updated" value={new Date(invoice.updated_at).toLocaleDateString()} />
            {invoice.reference_type && (
              <DetailRow label="Reference" value={`${invoice.reference_type}: ${invoice.reference_id ?? '—'}`} />
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75"
          onClick={e => { if (e.target === e.currentTarget) setShowPayModal(false); }}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-border p-6 space-y-4 bg-card shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Record Payment</h2>
              <button onClick={() => setShowPayModal(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Invoice: {invoice.invoice_number}</p>
            <div>
              <label className="text-xs font-bold block mb-1 text-foreground">
                Amount<span className="text-destructive">*</span>
              </label>
              <input
                type="number" min={0} step="0.01"
                className="w-full rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-ring bg-background border border-input text-foreground"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowPayModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors text-muted-foreground">
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={recordPayMut.isPending || !paymentAmount}
                className={cn(
                  'px-5 py-2 rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90',
                  (recordPayMut.isPending || !paymentAmount) && 'opacity-50 cursor-not-allowed',
                )}
              >
                {recordPayMut.isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-1" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
