'use client';

import {
  SharedDocumentList,
  invoiceToDocumentRow,
  type DocAction,
} from '@/components/documents/SharedDocumentList';
import {
  useDeleteInvoice,
  useDuplicateInvoice,
  useInvoices,
  useSendInvoice,
  useVoidInvoice,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { SharedInvoiceCreateView } from '@/components/documents/SharedInvoiceCreateView';
import { RecordPaymentModal } from '@/components/documents/RecordPaymentModal';
import { Ban, Copy, Download, ExternalLink, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/base';
import { reconcilePendingPayments, type ReconcileSummary } from '@/lib/api/payments';

const ITEMS_PER_PAGE = 20;

export default function PaymentReceiptsPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const filters = useMemo(() => ({
    type: 'payment_receipt',
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    page,
    limit: ITEMS_PER_PAGE,
  }), [statusFilter, page]);

  const { data, isLoading, error } = useInvoices(effectiveTenant, filters, !!effectiveTenant);

  const invoices = data?.invoices ?? [];
  const total    = data?.total ?? 0;

  const sendMutation      = useSendInvoice(effectiveTenant);
  const voidMutation      = useVoidInvoice(effectiveTenant);
  const duplicateMutation = useDuplicateInvoice(effectiveTenant);
  const deleteMutation    = useDeleteInvoice(effectiveTenant);

  // Manually reconcile pending payment intents against their gateway (treasury also runs this on a
  // 5-minute cron). Settles any payment that went through but whose webhook/redirect was missed.
  const reconcileMutation = useMutation({
    mutationFn: () => reconcilePendingPayments(effectiveTenant),
    onSuccess: (s: ReconcileSummary) => {
      toast.success(
        `Reconciliation complete — ${s.settled} settled, ${s.failed} failed, ${s.checked} checked` +
          (s.errors ? `, ${s.errors} error(s)` : ''),
      );
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Reconciliation failed'),
  });

  const rows = useMemo(() => invoices.map(invoiceToDocumentRow), [invoices]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const actions: DocAction[] = [
    {
      label: 'View Public Page',
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      onClick: (r) => r.public_token && window.open(`/i/${r.public_token}`, '_blank'),
      visible: (r) => !!r.public_token,
    },
    {
      label: 'Download PDF',
      icon: <Download className="h-3.5 w-3.5" />,
      onClick: (r) => r.public_token && window.open(`/api/v1/public/invoices/${r.public_token}/pdf?download=true`, '_blank'),
      visible: (r) => !!r.public_token,
    },
    {
      label: 'Send',
      icon: <Send className="h-3.5 w-3.5" />,
      onClick: (r) => sendMutation.mutate(r.id),
      visible: (r) => r.status === 'draft',
    },
    {
      label: 'Duplicate',
      icon: <Copy className="h-3.5 w-3.5" />,
      onClick: (r) => duplicateMutation.mutate(r.id),
    },
    {
      label: 'Void',
      icon: <Ban className="h-3.5 w-3.5" />,
      onClick: (r) => voidMutation.mutate(r.id),
      visible: (r) => r.status !== 'void',
      destructive: true,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      onClick: (r) => deleteMutation.mutate(r.id),
      destructive: true,
    },
  ];

  if (showCreate) {
    return (
      <SharedInvoiceCreateView
        effectiveTenant={effectiveTenant}
        docType="payment_receipt"
        onClose={() => setShowCreate(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showRecordPayment && (
        <RecordPaymentModal
          tenant={effectiveTenant}
          onClose={() => setShowRecordPayment(false)}
        />
      )}

      <div className="px-6 pt-6 pb-0 flex items-center justify-between gap-3">
        <h1 className="text-lg font-black text-foreground">Payment Receipts</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reconcileMutation.mutate()}
          disabled={reconcileMutation.isPending || !effectiveTenant}
          title="Re-verify pending payments against the gateway and settle any that completed"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${reconcileMutation.isPending ? 'animate-spin' : ''}`} />
          {reconcileMutation.isPending ? 'Reconciling…' : 'Reconcile Payments'}
        </Button>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SharedDocumentList
          title="Payment Receipts"
          subtitle="Receipts issued to customers for payments received."
          createLabel="Create Payment Receipt"
          onCreateClick={() => setShowCreate(true)}
          rows={filtered}
          isLoading={isLoading}
          error={error}
          total={total}
          page={page}
          onPageChange={setPage}
          itemsPerPage={ITEMS_PER_PAGE}
          statusOptions={['all', 'draft', 'issued', 'void']}
          statusFilter={statusFilter}
          onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
          actions={actions}
          storageKey="payment-receipt-col-prefs"
          emptyStateDescription="Issue receipts to customers once you receive their payments."
        />
      </div>
    </div>
  );
}
