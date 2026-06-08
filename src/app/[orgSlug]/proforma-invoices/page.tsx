'use client';

import { SharedDocumentList } from '@/components/documents/SharedDocumentList';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { useDocumentListSource } from '@/hooks/use-document-list-source';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useDocRowAction } from '@/hooks/use-doc-row-action';
import {
  sendInvoice, voidInvoice, duplicateInvoice, markPaid, recordPayment,
  convertProformaToInvoice, createCreditNote,
} from '@/lib/api/invoices';
import { Ban, CheckCircle, Copy, DollarSign, ExternalLink, FileText, FileMinus, Loader2, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 20;

export default function ProformaInvoicesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{ tenant: string; invoiceId: string; invoiceNumber: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const src = useDocumentListSource({ family: 'invoice', invoiceType: 'proforma_invoice', status: statusFilter, page, limit: ITEMS_PER_PAGE, withStats: true });
  const { run, isPending } = useDocRowAction();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return src.rows;
    const q = searchQuery.toLowerCase();
    return src.rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q) || r.tenant_name?.toLowerCase().includes(q));
  }, [src.rows, searchQuery]);

  const handleRecordPayment = () => {
    if (!paymentDialog || !paymentAmount) return;
    run(() => recordPayment(paymentDialog.tenant, paymentDialog.invoiceId, paymentAmount), 'Payment recorded');
    setPaymentDialog(null); setPaymentAmount('');
  };

  const actions = useDocumentActions('proforma_invoice', {
    view_details: { label: 'View Details', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => router.push(`/${src.detailHrefTenant(r)}/invoices/${r.id}`) },
    view_public: { label: 'View Public Page', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => r.public_token && window.open(`/i/${r.public_token}`, '_blank') },
    send: { label: 'Send', icon: <Send className="h-3.5 w-3.5" />, onClick: (r) => run(() => sendInvoice(src.rowTenant(r), r.id), `Proforma ${r.doc_number} sent`) },
    convert_to_invoice: { label: 'Convert to Invoice', icon: <FileText className="h-3.5 w-3.5" />, onClick: (r) => run(() => convertProformaToInvoice(src.rowTenant(r), r.id), `Converted ${r.doc_number} to invoice`) },
    record_payment: { label: 'Record Payment', icon: <DollarSign className="h-3.5 w-3.5" />, onClick: (r) => setPaymentDialog({ tenant: src.rowTenant(r), invoiceId: r.id, invoiceNumber: r.doc_number }) },
    mark_paid: { label: 'Mark as Paid', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: (r) => run(() => markPaid(src.rowTenant(r), r.id), `${r.doc_number} marked paid`) },
    create_credit_note: { label: 'Create Credit Note', icon: <FileMinus className="h-3.5 w-3.5" />, onClick: (r) => run(() => createCreditNote(src.rowTenant(r), r.id), `Credit note created for ${r.doc_number}`) },
    duplicate: { label: 'Duplicate', icon: <Copy className="h-3.5 w-3.5" />, onClick: (r) => run(() => duplicateInvoice(src.rowTenant(r), r.id), 'Proforma duplicated') },
    void: { label: 'Void', icon: <Ban className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => voidInvoice(src.rowTenant(r), r.id), `Proforma ${r.doc_number} voided`) },
  });

  if (showCreate) {
    return <SharedDocumentCreateView effectiveTenant={src.docTenant} docType="proforma_invoice" onClose={() => setShowCreate(false)} />;
  }

  const stats = src.statsData
    ? { total_count: src.statsData.total_count, total_amount: src.statsData.total_amount, amount_due: src.statsData.amount_due, currency: src.statsData.currency }
    : undefined;

  return (
    <>
      <SharedDocumentList
        title="Proforma Invoices"
        subtitle={src.isAggregate ? 'All tenants — pre-invoices sent before the final invoice.' : 'Pre-invoices sent before the final invoice.'}
        createLabel={src.isAggregate ? undefined : 'Create Proforma Invoice'}
        onCreateClick={src.isAggregate ? undefined : () => setShowCreate(true)}
        rows={filtered}
        isLoading={src.isLoading}
        error={src.error}
        total={src.total}
        page={page}
        onPageChange={setPage}
        itemsPerPage={ITEMS_PER_PAGE}
        statusOptions={['all', 'draft', 'sent', 'paid', 'void']}
        statusFilter={statusFilter}
        onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
        stats={stats}
        actions={actions}
        pdfKind="invoice"
        showPaymentStatus
        showDueDate
        showExpandLineItems
        showTenant={src.showTenant}
        storageKey="proforma-invoice-col-prefs"
        emptyStateDescription="Create proforma invoices to send to customers before issuing the final invoice."
      />

      {paymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75" onClick={(e) => { if (e.target === e.currentTarget) setPaymentDialog(null); }}>
          <div className="relative w-full max-w-sm rounded-2xl border border-border p-6 space-y-4 bg-card shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Record Payment</h2>
              <button onClick={() => setPaymentDialog(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Proforma: {paymentDialog.invoiceNumber}</p>
            <div>
              <label className="text-xs font-bold block mb-1 text-foreground">Amount<span className="text-destructive">*</span></label>
              <input type="number" min={0} step="0.01"
                className="w-full rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-ring bg-background border border-input text-foreground"
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPaymentDialog(null)} className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors text-muted-foreground">Cancel</button>
              <button onClick={handleRecordPayment} disabled={isPending || !paymentAmount}
                className={cn('px-5 py-2 rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90', (isPending || !paymentAmount) && 'opacity-50 cursor-not-allowed')}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-1" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
