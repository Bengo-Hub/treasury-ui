'use client';

import { SharedDocumentList } from '@/components/documents/SharedDocumentList';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { RecordPaymentModal } from '@/components/documents/RecordPaymentModal';
import { useDocumentListSource } from '@/hooks/use-document-list-source';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useDocRowAction } from '@/hooks/use-doc-row-action';
import { voidInvoice, duplicateInvoice, deleteInvoice } from '@/lib/api/invoices';
import { Ban, Copy, ExternalLink, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/base';
import { reconcilePendingPayments, type ReconcileSummary } from '@/lib/api/payments';

const ITEMS_PER_PAGE = 20;

export default function PaymentReceiptsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [edit, setEdit] = useState<{ id: string; tenant: string } | null>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const src = useDocumentListSource({ family: 'invoice', invoiceType: 'payment_receipt', status: statusFilter, page, limit: ITEMS_PER_PAGE });
  const { run } = useDocRowAction();

  // Manually reconcile pending payment intents against their gateway (treasury also runs a 5-min cron).
  const reconcileMutation = useMutation({
    mutationFn: () => reconcilePendingPayments(src.docTenant),
    onSuccess: (s: ReconcileSummary) =>
      toast.success(`Reconciliation complete — ${s.settled} settled, ${s.failed} failed, ${s.checked} checked` + (s.errors ? `, ${s.errors} error(s)` : '')),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Reconciliation failed'),
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return src.rows;
    const q = searchQuery.toLowerCase();
    return src.rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q) || r.tenant_name?.toLowerCase().includes(q));
  }, [src.rows, searchQuery]);

  const actions = useDocumentActions('payment_receipt', {
    view_details: { label: 'View Details', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => router.push(`/${src.detailHrefTenant(r)}/invoices/${r.id}`) },
    view_public: { label: 'View Public Page', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => r.public_token && window.open(`/i/${r.public_token}`, '_blank') },
    edit: { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onClick: (r) => setEdit({ id: r.id, tenant: src.rowTenant(r) || src.docTenant }) },
    duplicate: { label: 'Duplicate', icon: <Copy className="h-3.5 w-3.5" />, onClick: (r) => run(() => duplicateInvoice(src.rowTenant(r), r.id), 'Receipt duplicated') },
    void: { label: 'Void', icon: <Ban className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => voidInvoice(src.rowTenant(r), r.id), `Receipt ${r.doc_number} voided`) },
    delete: { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => deleteInvoice(src.rowTenant(r), r.id), 'Receipt deleted') },
  });

  if (showCreate || edit) {
    return <SharedDocumentCreateView effectiveTenant={edit?.tenant ?? src.docTenant} docType="payment_receipt" editId={edit?.id} onClose={() => { setShowCreate(false); setEdit(null); }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {showRecordPayment && <RecordPaymentModal tenant={src.docTenant} onClose={() => setShowRecordPayment(false)} />}

      <div className="px-6 pt-6 pb-0 flex items-center justify-between gap-3">
        <h1 className="text-lg font-black text-foreground">Payment Receipts</h1>
        <Button variant="outline" size="sm" onClick={() => reconcileMutation.mutate()} disabled={reconcileMutation.isPending}
          title="Re-verify pending payments against the gateway and settle any that completed">
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${reconcileMutation.isPending ? 'animate-spin' : ''}`} />
          {reconcileMutation.isPending ? 'Reconciling…' : 'Reconcile Payments'}
        </Button>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SharedDocumentList
          title="Payment Receipts"
          subtitle={src.isAggregate ? 'All tenants — receipts issued for payments received.' : 'Receipts issued to customers for payments received.'}
          createLabel={src.isAggregate ? undefined : 'Create Payment Receipt'}
          onCreateClick={src.isAggregate ? undefined : () => setShowCreate(true)}
          rows={filtered}
          isLoading={src.isLoading}
          error={src.error}
          total={src.total}
          page={page}
          onPageChange={setPage}
          itemsPerPage={ITEMS_PER_PAGE}
          statusOptions={['all', 'draft', 'issued', 'void']}
          statusFilter={statusFilter}
          onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
          actions={actions}
          pdfKind="invoice"
          showTenant={src.showTenant}
          storageKey="payment-receipt-col-prefs"
          emptyStateDescription="Issue receipts to customers once you receive their payments."
        />
      </div>
    </div>
  );
}
