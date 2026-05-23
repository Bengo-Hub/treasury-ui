'use client';

import {
  DocumentListPage,
  invoiceToDocumentRow,
  type DocAction,
} from '@/components/documents/DocumentListPage';
import {
  useDuplicateInvoice,
  useInvoices,
  useInvoiceStats,
  useRecordPayment,
  useSendInvoice,
  useVoidInvoice,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { Ban, DollarSign, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback, useMemo, useState } from 'react';
import { Loader2, Copy } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export default function ProformaInvoicesPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [paymentDialog, setPaymentDialog] = useState<{
    invoiceId: string;
    invoiceNumber: string;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const filters = useMemo(
    () => ({
      type: 'proforma_invoice',
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      page,
      limit: ITEMS_PER_PAGE,
    }),
    [statusFilter, page],
  );

  const { data, isLoading, error } = useInvoices(effectiveTenant, filters, !!effectiveTenant);
  const { data: statsData } = useInvoiceStats(effectiveTenant);

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  const sendMutation = useSendInvoice(effectiveTenant);
  const voidMutation = useVoidInvoice(effectiveTenant);
  const paymentMutation = useRecordPayment(effectiveTenant);
  const duplicateMutation = useDuplicateInvoice(effectiveTenant);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q),
    );
  }, [invoices, searchQuery]);

  const rows = useMemo(() => filtered.map(invoiceToDocumentRow), [filtered]);

  const handleRecordPayment = useCallback(() => {
    if (!paymentDialog || !paymentAmount) return;
    paymentMutation.mutate(
      { invoiceId: paymentDialog.invoiceId, amount: paymentAmount },
      { onSuccess: () => { setPaymentDialog(null); setPaymentAmount(''); } },
    );
  }, [paymentDialog, paymentAmount, paymentMutation]);

  const actions: DocAction[] = [
    {
      label: 'Send',
      icon: <Send className="h-3.5 w-3.5" />,
      onClick: (r) => sendMutation.mutate(r.id),
      visible: (r) => r.status === 'draft',
    },
    {
      label: 'Record Payment',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      onClick: (r) => setPaymentDialog({ invoiceId: r.id, invoiceNumber: r.doc_number }),
      visible: (r) =>
        (r.payment_status === 'unpaid' || r.payment_status === 'partial') && r.status !== 'void',
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
      visible: (r) => r.status !== 'void' && r.status !== 'paid',
      destructive: true,
    },
  ];

  const stats = statsData
    ? {
        total_count: statsData.total_count,
        total_amount: statsData.total_amount,
        amount_due: statsData.amount_due,
        currency: statsData.currency,
      }
    : undefined;

  return (
    <>
      <DocumentListPage
        title="Proforma Invoices"
        subtitle="Pre-invoices sent before the final invoice."
        createLabel="Create Proforma Invoice"
        onCreateClick={() => {}}
        rows={rows}
        isLoading={isLoading}
        error={error}
        total={total}
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
        showPaymentStatus
        showDueDate
        emptyStateDescription="Create proforma invoices to send to customers before issuing the final invoice."
      />

      {paymentDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75"
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentDialog(null); }}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-border p-6 space-y-4 bg-card shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Record Payment</h2>
              <button onClick={() => setPaymentDialog(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Invoice: {paymentDialog.invoiceNumber}</p>
            <div>
              <label className="text-xs font-bold block mb-1 text-foreground">
                Amount<span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-ring bg-background border border-input text-foreground"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPaymentDialog(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={paymentMutation.isPending || !paymentAmount}
                className={cn(
                  'px-5 py-2 rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90',
                  (paymentMutation.isPending || !paymentAmount) && 'opacity-50 cursor-not-allowed',
                )}
              >
                {paymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-1" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
