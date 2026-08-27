'use client';

import { useParams, useRouter } from 'next/navigation';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { allowedActions, type DocType } from '@/lib/documents/actions';
import { docContextFromRow } from '@/hooks/use-document-actions';
import {
  useInvoice,
  useSendInvoice,
  useVoidInvoice,
  useMarkPaid,
  useCreateCreditNote,
  useCreateDebitNote,
  useGenerateDeliveryNote,
  useDispatchDeliveryNote,
  useDeliverDeliveryNote,
  useCancelDeliveryNote,
} from '@/hooks/use-invoices';
import { useOutletFilterStore } from '@/store/outlet-filter';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Ban, CheckCircle, CheckCircle2, Copy, DollarSign, Download,
  ExternalLink, FileMinus, FilePlus, Loader2, Send, Truck, X,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { downloadPublicInvoicePdf } from '@/lib/api/documents';
import { CreditNoteDialog } from '@/components/documents/CreditNoteDialog';
import { RecordPaymentModal } from '@/components/documents/RecordPaymentModal';
import { DocumentApprovalCard } from '@/components/documents/DocumentApprovalCard';
import { DocumentJournalPanel } from '@/components/documents/DocumentJournalPanel';
import { FiscalInfoPanel } from '@/components/documents/FiscalInfoPanel';
import { EtimsResponseModal } from '@/components/tax/etims-response-modal';
import { useTransmitInvoice, useIsEtimsActive } from '@/hooks/use-tax';
import { MarginPanel } from '@/components/documents/MarginPanel';
import { LinkedCostsPanel } from '@/components/documents/LinkedCostsPanel';
import { moduleForDocType } from '@/lib/documents/approvals';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    paid:             'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    approved:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    sent:             'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    draft:            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    overdue:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    void:             'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
    cancelled:        'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide', variants[status] ?? 'bg-zinc-100 text-zinc-600')}>
      {status?.replace(/_/g, ' ')}
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

// Goods-dispatch lifecycle badge (delivery_challan / delivery_note docs only).
function DeliveryBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    delivered:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dispatched: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    draft:      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    cancelled:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const s = status || 'draft';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide', variants[s] ?? 'bg-zinc-100 text-zinc-600')}>
      {s.replace(/_/g, ' ')}
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
  const creditNoteMut  = useCreateCreditNote(effectiveTenant);
  const debitNoteMut   = useCreateDebitNote(effectiveTenant);
  const deliveryNoteMut = useGenerateDeliveryNote(effectiveTenant);
  const dispatchMut     = useDispatchDeliveryNote(effectiveTenant);
  const deliverMut      = useDeliverDeliveryNote(effectiveTenant);
  const cancelDelivMut  = useCancelDeliveryNote(effectiveTenant);

  // Resolve the originating outlet's display name from the loaded outlet list (set by the
  // header OutletFilter). Falls back to the raw id when the list isn't populated.
  const outlets = useOutletFilterStore((s) => s.outlets);

  const [showPayModal, setShowPayModal]   = useState(false);
  const [showCreditNote, setShowCreditNote] = useState(false);
  const [creditNoteError, setCreditNoteError] = useState('');
  // Confirm gate for the Send action (fiscalises + delivers) — the shared ConfirmDialog warns
  // about the KRA eTIMS sync. Approve's own fiscal-consequence warning now lives in
  // DocumentApprovalCard's confirmApprove prop (below) — the centralized approval flow is the
  // only way to approve an invoice, so there is no separate legacy approve action here anymore.
  const [confirmAction, setConfirmAction] = useState<null | 'send'>(null);
  // Send modal's explicit per-send eTIMS choice — defaults to syncing (today's behaviour);
  // unchecking sends the invoice WITHOUT queuing an eTIMS sync for this document.
  const [sendSyncEtims, setSendSyncEtims] = useState(true);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [receivedBy, setReceivedBy]       = useState('');
  const [deliverNote, setDeliverNote]     = useState('');
  // Confirm gate for the delivery-note stock actions (dispatch deducts stock; cancel voids the
  // note) — same shared ConfirmDialog pattern as the approve/send fiscal gate above.
  const [deliveryConfirm, setDeliveryConfirm] = useState<null | 'dispatch' | 'cancel'>(null);
  const [etimsResp, setEtimsResp]         = useState<any>(null);
  const transmitMut = useTransmitInvoice();
  // Gate "Transmit to eTIMS" on the tenant actually having an active device — see bill-columns.tsx's
  // identical fix for the same class of bug (the button used to render for every tenant regardless
  // of KRA integration status, based only on the document's own type/status).
  const { isActive: etimsActive } = useIsEtimsActive(effectiveTenant);

  const handleDispatch = useCallback(() => setDeliveryConfirm('dispatch'), []);
  const confirmDispatch = useCallback(() => {
    dispatchMut.mutate(invoiceId, {
      onSuccess: () => { toast.success('Delivery note dispatched'); setDeliveryConfirm(null); },
      onError: (err: any) => { toast.error(err?.response?.data?.error ?? 'Failed to mark dispatched'); setDeliveryConfirm(null); },
    });
  }, [invoiceId, dispatchMut]);

  const handleDeliver = useCallback(() => {
    deliverMut.mutate(
      { invoiceId, received_by: receivedBy.trim() || undefined, note: deliverNote.trim() || undefined },
      {
        onSuccess: () => { toast.success('Delivery note delivered'); setShowDeliverModal(false); setReceivedBy(''); setDeliverNote(''); },
        onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to mark delivered'),
      },
    );
  }, [invoiceId, receivedBy, deliverNote, deliverMut]);

  const handleCancelDelivery = useCallback(() => setDeliveryConfirm('cancel'), []);
  const confirmCancelDelivery = useCallback(() => {
    cancelDelivMut.mutate(invoiceId, {
      onSuccess: () => { toast.success('Delivery cancelled'); setDeliveryConfirm(null); },
      onError: (err: any) => { toast.error(err?.response?.data?.error ?? 'Failed to cancel delivery'); setDeliveryConfirm(null); },
    });
  }, [invoiceId, cancelDelivMut]);

  // Preview-first PDF: open the shared modal (Download / Print / Open-in-tab)
  // instead of force-downloading the file.
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });
  const previewPdf = useCallback(() => {
    const token = invoice?.public_token;
    if (!token) return;
    const name = invoice?.invoice_number || 'invoice';
    openPreview(
      () => downloadPublicInvoicePdf(token, name).then((r) => r.blob),
      { fileName: `${name}.pdf`, title: name }
    );
  }, [invoice, openPreview]);

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

  // Gate the action buttons via the centralized per-document-type policy, since this detail
  // view is reached from every document family (credit notes, delivery challans, …) — not
  // just standard invoices. This keeps the buttons consistent with the list action menus.
  const acts = allowedActions(invoice.invoice_type as DocType, docContextFromRow(invoice));
  const canSend        = acts.includes('send');
  const canVoid        = acts.includes('void');
  const canRecordPay   = acts.includes('record_payment');
  const canMarkPaid    = acts.includes('mark_paid');
  const canCreditDebit = acts.includes('create_credit_note');
  const canViewCreditNote = acts.includes('view_credit_note');
  const canDebitNote    = acts.includes('create_debit_note');
  const canViewDebitNote = acts.includes('view_debit_note');
  const canDeliveryNote = acts.includes('generate_delivery_note');
  const canViewDeliveryNote = acts.includes('view_delivery_note');

  // Delivery-note goods-dispatch lifecycle — a separate axis from invoice.status, only
  // meaningful for delivery_challan / delivery_note documents. Buttons are gated to the
  // valid current delivery_status: dispatch (draft/empty), deliver (dispatched), cancel
  // (draft|dispatched).
  const isDeliveryDoc   = invoice.invoice_type === 'delivery_challan' || invoice.invoice_type === 'delivery_note';
  const deliveryState   = invoice.delivery_status || 'draft';
  const canDispatch     = isDeliveryDoc && deliveryState === 'draft';
  const canDeliver      = isDeliveryDoc && deliveryState === 'dispatched';
  const canCancelDeliv  = isDeliveryDoc && (deliveryState === 'draft' || deliveryState === 'dispatched');

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
              {isDeliveryDoc
                ? <DeliveryBadge status={deliveryState} />
                : <PaymentBadge status={invoice.payment_status} />}
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
                onClick={previewPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              {/* Transmit to KRA eTIMS — for fiscal sale documents (standard invoice / credit
                  note). The backend is idempotent; the worker may also fiscalise automatically,
                  but this gives the operator an explicit action + immediate KRA response. */}
              {etimsActive && (invoice.invoice_type === 'standard' || invoice.invoice_type === 'credit_note') && (
                <button
                  onClick={() => transmitMut.mutate(
                    { tenantSlug: orgSlug, invoiceId },
                    { onSuccess: (data) => setEtimsResp(data) },
                  )}
                  disabled={transmitMut.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-xs font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {transmitMut.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />}
                  {invoice.invoice_type === 'credit_note' ? 'Transmit refund' : 'Transmit to eTIMS'}
                </button>
              )}
            </>
          )}
          {canSend && (
            <button
              onClick={() => setConfirmAction('send')}
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
            <button
              onClick={() => { setCreditNoteError(''); setShowCreditNote(true); }}
              disabled={creditNoteMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              <FileMinus className="h-3.5 w-3.5" /> Credit Note
            </button>
          )}
          {canViewCreditNote && invoice.related_documents?.credit_note_ids?.[0] && (
            <button
              onClick={() => router.push(`/${orgSlug}/invoices/${invoice.related_documents!.credit_note_ids![0]}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <FileMinus className="h-3.5 w-3.5" /> View Credit Note
            </button>
          )}
          {canDebitNote && (
            <button
              onClick={() => debitNoteMut.mutate(invoiceId)}
              disabled={debitNoteMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              <FilePlus className="h-3.5 w-3.5" /> Debit Note
            </button>
          )}
          {canViewDebitNote && invoice.related_documents?.debit_note_ids?.[0] && (
            <button
              onClick={() => router.push(`/${orgSlug}/invoices/${invoice.related_documents!.debit_note_ids![0]}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <FilePlus className="h-3.5 w-3.5" /> View Debit Note
            </button>
          )}
          {canDeliveryNote && (
            <button
              onClick={() => deliveryNoteMut.mutate(invoiceId, {
                onSuccess: (dc: any) => toast.success(`Delivery note ${dc?.invoice_number ?? ''} generated`),
                onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to generate delivery note'),
              })}
              disabled={deliveryNoteMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              {deliveryNoteMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />} Delivery Note
            </button>
          )}
          {canViewDeliveryNote && invoice.related_documents?.delivery_note_id && (
            <button
              onClick={() => router.push(`/${orgSlug}/invoices/${invoice.related_documents!.delivery_note_id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <Truck className="h-3.5 w-3.5" /> View Delivery Note
            </button>
          )}
          {canDispatch && (
            <button
              onClick={handleDispatch}
              disabled={dispatchMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {dispatchMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
              Mark Dispatched
            </button>
          )}
          {canDeliver && (
            <button
              onClick={() => setShowDeliverModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
            </button>
          )}
          {canCancelDeliv && (
            <button
              onClick={handleCancelDelivery}
              disabled={cancelDelivMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {cancelDelivMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Cancel
            </button>
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

        {/* Approval status + Submit / Approve / Reject */}
        {moduleForDocType(invoice.invoice_type as DocType) && (
          <DocumentApprovalCard
            tenant={effectiveTenant}
            module={moduleForDocType(invoice.invoice_type as DocType)!}
            documentId={invoiceId}
            documentReference={invoice.invoice_number}
            confirmApprove="Approving advances the workflow. On the FINAL approval step the document becomes a fiscal supply and is transmitted to KRA eTIMS (fiscalised) — after which it can no longer be edited. Continue?"
          />
        )}

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
                {invoice.additional_charges && invoice.additional_charges.length > 0 && (
                  <DetailRow
                    label="Additional Charges"
                    value={fmtAmount(invoice.additional_charges.reduce((s, c) => s + Number(c.amount), 0))}
                  />
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-black text-foreground">Total</span>
                  <span className="text-sm font-black text-foreground tabular-nums">{fmtAmount(invoice.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Business-only margin analysis (internal — never on the customer PDF). */}
        {invoice.lines && invoice.lines.length > 0 && (
          <MarginPanel
            currency={invoice.currency}
            lines={invoice.lines.map((l) => ({
              description: l.description,
              quantity: Number(l.quantity),
              unit_price: Number(l.unit_price),
              unit_cost: l.unit_cost != null ? Number(l.unit_cost) : undefined,
            }))}
          />
        )}

        {/* Business-only linked costs (e.g. the delivery/transport cost recorded as a Freight &
            Shipping expense for this invoice). Internal — never on the customer PDF. */}
        <LinkedCostsPanel tenant={effectiveTenant} invoiceId={invoice.id} currency={invoice.currency} />

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
            {isDeliveryDoc
              ? <DetailRow label="Delivery Status" value={<DeliveryBadge status={deliveryState} />} />
              : <DetailRow label="Payment Status" value={<PaymentBadge status={invoice.payment_status} />} />}
            <DetailRow label="Created" value={new Date(invoice.created_at).toLocaleDateString()} />
            <DetailRow label="Last Updated" value={new Date(invoice.updated_at).toLocaleDateString()} />
            {invoice.reference_type && (
              <DetailRow label="Reference" value={`${invoice.reference_type}: ${invoice.reference_id ?? '—'}`} />
            )}
            {invoice.outlet_id && (
              <DetailRow
                label="Branch"
                value={outlets.find((o) => o.id === invoice.outlet_id)?.name ?? invoice.outlet_id}
              />
            )}
          </div>
        </div>

        {/* Shipping & Transport (captured on the document — own fleet or third-party courier) */}
        {invoice.transport && Object.keys(invoice.transport).length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-sm p-5">
            <h3 className="text-xs font-bold text-foreground mb-3">Shipping & Transport</h3>
            <div className="space-y-0">
              {invoice.transport.transporter_name != null && (
                <DetailRow label="Transporter" value={String(invoice.transport.transporter_name)} />
              )}
              {invoice.transport.transporter_type != null && (
                <DetailRow label="Fleet" value={invoice.transport.transporter_type === 'own_fleet' ? 'Own fleet' : 'Third-party courier'} />
              )}
              {invoice.transport.transport_mode != null && (
                <DetailRow label="Mode" value={String(invoice.transport.transport_mode)} />
              )}
              {invoice.transport.distance != null && (
                <DetailRow label="Distance" value={String(invoice.transport.distance)} />
              )}
              {invoice.transport.vehicle_number != null && (
                <DetailRow label="Vehicle" value={`${invoice.transport.vehicle_type ?? ''} ${invoice.transport.vehicle_number ?? ''}`.trim()} />
              )}
              {invoice.transport.transport_doc_number != null && (
                <DetailRow label="Transport doc #" value={String(invoice.transport.transport_doc_number)} />
              )}
              {invoice.shipping_amount != null && Number(invoice.shipping_amount) > 0 && (
                <DetailRow label="Shipping charged" value={fmtAmount(invoice.shipping_amount)} />
              )}
            </div>
          </div>
        )}

        {/* KRA eTIMS fiscalisation evidence — renders only for transmitted documents. */}
        <FiscalInfoPanel tenant={effectiveTenant} invoiceId={invoice.id} />

        {/* View Journal — the GL postings for this document (Refrens-style). */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-5">
          <h3 className="text-xs font-bold text-foreground mb-3">View Journal</h3>
          <DocumentJournalPanel tenant={effectiveTenant} referenceID={invoice.id} currency={invoice.currency} />
        </div>
      </div>

      {/* Credit note — line picker (full or partial) */}
      {invoice && (
        <CreditNoteDialog
          invoice={invoice}
          open={showCreditNote}
          onClose={() => setShowCreditNote(false)}
          pending={creditNoteMut.isPending}
          error={creditNoteError}
          onSubmit={(lines) => {
            setCreditNoteError('');
            creditNoteMut.mutate(
              { invoiceId, lines },
              {
                onSuccess: (cn: any) => {
                  setShowCreditNote(false);
                  toast.success(`Credit note ${cn?.invoice_number ?? ''} created`);
                },
                onError: (err: any) =>
                  setCreditNoteError(err?.response?.data?.error ?? err?.message ?? 'Failed to create credit note'),
              },
            );
          }}
        />
      )}

      {/* Record Payment Modal — the SAME shared modal the invoices list / payment-receipts pages
          use (full capture: date/reference/method persisted on the InvoicePayment record, and a
          real BankAccount picker since RecordPayment requires account_id). This page previously
          had its own amount-only inline dialog that never collected an account, so submitting it
          would 400 ("account_id is required") — replaced rather than patched, matching the fix
          already applied to invoices/page.tsx. */}
      {showPayModal && invoice && (
        <RecordPaymentModal
          tenant={effectiveTenant}
          invoiceId={invoice.id}
          invoiceTotal={invoice.total_amount}
          currency={invoice.currency}
          settlementAccountId={invoice.settlement_account_id}
          onClose={() => setShowPayModal(false)}
        />
      )}

      {/* Mark Delivered Modal — optional received-by + note (dispatched → delivered). */}
      {showDeliverModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeliverModal(false); }}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-border p-6 space-y-4 bg-card shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Mark Delivered</h2>
              <button onClick={() => setShowDeliverModal(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{invoice.invoice_number} will be marked as delivered.</p>
            <div>
              <label className="text-xs font-bold block mb-1 text-foreground">Received by</label>
              <input
                className="w-full rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-ring bg-background border border-input text-foreground"
                placeholder="Name of receiver (optional)"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 text-foreground">Note</label>
              <textarea
                className="w-full rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-ring bg-background border border-input text-foreground min-h-20"
                placeholder="Delivery note (optional)..."
                value={deliverNote}
                onChange={(e) => setDeliverNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeliverModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDeliver}
                disabled={deliverMut.isPending}
                className={cn(
                  'px-5 py-2 rounded-lg text-xs font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700',
                  deliverMut.isPending && 'opacity-50 cursor-not-allowed',
                )}
              >
                {deliverMut.isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-1" />}
                Mark Delivered
              </button>
            </div>
          </div>
        </div>
      )}

      <PdfPreview {...previewProps} />

      <EtimsResponseModal
        open={!!etimsResp}
        onClose={() => setEtimsResp(null)}
        title="KRA eTIMS transmission"
        payload={etimsResp}
        rows={[
          { label: 'Status', value: etimsResp?.status ?? etimsResp?.transmission_status },
          { label: 'eTIMS Invc No', value: etimsResp?.invc_no, mono: true },
          { label: 'KRA Receipt No', value: etimsResp?.etims_receipt_number, mono: true },
          { label: 'CU Number', value: etimsResp?.etims_cu_number, mono: true },
          { label: 'Receipt signature', value: etimsResp?.rcpt_sign, mono: true },
          { label: 'Message', value: etimsResp?.kra_response?.resultMsg },
        ]}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(o) => { if (!o) setConfirmAction(null); }}
        title="Send this document?"
        description="This will deliver the document to the customer."
        confirmLabel="Send"
        isPending={sendMutation.isPending}
        onConfirm={() => {
          sendMutation.mutate({ invoiceId, syncEtims: sendSyncEtims }, {
            onSuccess: () => setConfirmAction(null),
            onError: () => setConfirmAction(null),
          });
        }}
      >
        <label className="flex items-start gap-2 text-sm rounded border border-border/60 bg-muted/30 p-3">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={sendSyncEtims}
            onChange={(e) => setSendSyncEtims(e.target.checked)}
          />
          <span>
            <span className="font-medium">Sync to KRA eTIMS</span>
            <br />
            <span className="text-muted-foreground">
              {sendSyncEtims
                ? 'This document will be transmitted to KRA eTIMS (fiscalised) when sent.'
                : "This document will be sent WITHOUT syncing to eTIMS. You can fiscalise it later from the transaction's \"Generate ETR Receipt\" action."}
            </span>
          </span>
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={deliveryConfirm !== null}
        onOpenChange={(o) => { if (!o) setDeliveryConfirm(null); }}
        title={deliveryConfirm === 'dispatch' ? 'Mark this delivery note as dispatched?' : 'Cancel this delivery note?'}
        description={deliveryConfirm === 'dispatch'
          ? 'This deducts stock (emits a goods-issue) for the delivered items.'
          : 'It will be marked cancelled.'}
        confirmLabel={deliveryConfirm === 'dispatch' ? 'Dispatch' : 'Cancel Delivery'}
        destructive={deliveryConfirm === 'cancel'}
        isPending={deliveryConfirm === 'dispatch' ? dispatchMut.isPending : cancelDelivMut.isPending}
        onConfirm={deliveryConfirm === 'dispatch' ? confirmDispatch : confirmCancelDelivery}
      />
    </div>
  );
}
