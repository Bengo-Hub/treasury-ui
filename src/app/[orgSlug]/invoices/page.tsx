'use client';

import {
  DocumentListPage,
  invoiceToDocumentRow,
  type DocAction,
} from '@/components/documents/DocumentListPage';
import {
  useCreateInvoice,
  useInvoices,
  useInvoiceStats,
  useMarkPaid,
  useRecordPayment,
  useSendInvoice,
  useVoidInvoice,
  useCreateCreditNote,
  useCreateDebitNote,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { CreateInvoiceRequest } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import { Ban, CheckCircle, DollarSign, Download, ExternalLink, FileMinus, FilePlus, Loader2, Send, Upload, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { BulkUploadModal } from './_components/BulkUploadModal';
import { CreateInvoiceView } from './_components/CreateInvoiceView';

const ITEMS_PER_PAGE = 20;

function defaultDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 3);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function InvoicesPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreateView, setShowCreateView] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{
    invoiceId: string;
    invoiceNumber: string;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const dateRange = useMemo(() => defaultDateRange(), []);

  const filters = useMemo(
    () => ({
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      from: dateRange.from,
      to: dateRange.to,
      page,
      limit: ITEMS_PER_PAGE,
    }),
    [statusFilter, dateRange, page],
  );

  const { data, isLoading, error } = useInvoices(effectiveTenant, filters, !!effectiveTenant);
  const { data: statsData } = useInvoiceStats(effectiveTenant);

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  const createMutation = useCreateInvoice(effectiveTenant);
  const sendMutation = useSendInvoice(effectiveTenant);
  const voidMutation = useVoidInvoice(effectiveTenant);
  const paymentMutation = useRecordPayment(effectiveTenant);
  const markPaidMutation = useMarkPaid(effectiveTenant);
  const creditNoteMutation = useCreateCreditNote(effectiveTenant);
  const debitNoteMutation = useCreateDebitNote(effectiveTenant);

  // Client-side search filtering
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.customer_email?.toLowerCase().includes(q),
    );
  }, [invoices, searchQuery]);

  const rows = useMemo(() => filtered.map(invoiceToDocumentRow), [filtered]);

  const handleSaveInvoice = useCallback(
    (formData: Partial<CreateInvoiceRequest>) => {
      const body: CreateInvoiceRequest = {
        invoice_date: formData.invoice_date ?? new Date().toISOString().slice(0, 10),
        due_date: formData.due_date ?? new Date().toISOString().slice(0, 10),
        currency: formData.currency,
        lines: formData.lines ?? [],
        notes: formData.notes,
      };
      createMutation.mutate(body, { onSuccess: () => setShowCreateView(false) });
    },
    [createMutation],
  );

  const handleRecordPayment = useCallback(() => {
    if (!paymentDialog || !paymentAmount) return;
    paymentMutation.mutate(
      { invoiceId: paymentDialog.invoiceId, amount: paymentAmount },
      {
        onSuccess: () => {
          setPaymentDialog(null);
          setPaymentAmount('');
        },
      },
    );
  }, [paymentDialog, paymentAmount, paymentMutation]);

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
      onClick: (r) =>
        r.public_token &&
        window.open(
          `/api/v1/public/invoices/${r.public_token}/pdf?download=true`,
          '_blank',
        ),
      visible: (r) => !!r.public_token,
    },
    {
      label: 'Send Invoice',
      icon: <Send className="h-3.5 w-3.5" />,
      onClick: (r) => sendMutation.mutate(r.id),
      visible: (r) => r.status === 'draft',
    },
    {
      label: 'Record Payment',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      onClick: (r) =>
        setPaymentDialog({ invoiceId: r.id, invoiceNumber: r.doc_number }),
      visible: (r) =>
        (r.payment_status === 'unpaid' || r.payment_status === 'partial') &&
        r.status !== 'void' && r.status !== 'cancelled',
    },
    {
      label: 'Mark as Paid',
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      onClick: (r) => markPaidMutation.mutate(r.id),
      visible: (r) =>
        r.payment_status !== 'paid' && r.status !== 'void' && r.status !== 'cancelled',
    },
    {
      label: 'Create Credit Note',
      icon: <FileMinus className="h-3.5 w-3.5" />,
      onClick: (r) => creditNoteMutation.mutate(r.id),
      visible: (r) => r.status === 'sent' || r.status === 'paid' || r.status === 'overdue',
    },
    {
      label: 'Create Debit Note',
      icon: <FilePlus className="h-3.5 w-3.5" />,
      onClick: (r) => debitNoteMutation.mutate(r.id),
      visible: (r) => r.status === 'sent' || r.status === 'paid' || r.status === 'overdue',
    },
    {
      label: 'Void Invoice',
      icon: <Ban className="h-3.5 w-3.5" />,
      onClick: (r) => voidMutation.mutate(r.id),
      visible: (r) => r.status !== 'void' && r.status !== 'cancelled' && r.status !== 'paid',
      destructive: true,
    },
  ];

  if (showCreateView) {
    return (
      <CreateInvoiceView
        onBack={() => setShowCreateView(false)}
        onSave={handleSaveInvoice}
        isPending={createMutation.isPending}
      />
    );
  }

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
      {isPlatformOwner && !tenantQueryParam && (
        <div className="m-8 rounded-lg border border-border bg-accent/5 px-4 py-10 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above to view their invoices.
        </div>
      )}

      {(!isPlatformOwner || !!tenantQueryParam) && (
        <>
          <DocumentListPage
            title="Invoices"
            subtitle="Create, send and manage invoices."
            createLabel="Create Invoice"
            onCreateClick={() => setShowCreateView(true)}
            rows={rows}
            isLoading={isLoading}
            error={error}
            total={total}
            page={page}
            onPageChange={setPage}
            itemsPerPage={ITEMS_PER_PAGE}
            statusOptions={['all', 'draft', 'sent', 'paid', 'overdue', 'void']}
            statusFilter={statusFilter}
            onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
            searchQuery={searchQuery}
            onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
            stats={stats}
            actions={actions}
            showPaymentStatus
            showDueDate
            emptyStateDescription="Send professional invoices and get paid faster."
          />

          {/* Bulk upload button */}
          <div className="px-8 pb-6 flex">
            <button
              onClick={() => setBulkUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              <Upload className="h-3.5 w-3.5" /> Bulk Upload Invoices
            </button>
          </div>
        </>
      )}

      <BulkUploadModal open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} />

      {/* Record Payment Dialog */}
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
