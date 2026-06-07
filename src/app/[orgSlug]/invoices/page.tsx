'use client';

import {
  SharedDocumentList,
  invoiceToDocumentRow,
  type DocAction,
} from '@/components/documents/SharedDocumentList';
import {
  useInvoices,
  useInvoiceStats,
  useMarkPaid,
  useRecordPayment,
  useSendInvoice,
  useVoidInvoice,
  useCreateCreditNote,
  useCreateDebitNote,
  useGenerateReceiptFromInvoice,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { cn } from '@/lib/utils';
import { Ban, CheckCircle, DollarSign, ExternalLink, FileText, FileMinus, FilePlus, Loader2, Receipt, Send, Upload, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { BulkUploadStepper } from '@/components/documents/BulkUploadStepper';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { DocTabNav, type DocTab } from '@/components/documents/DocTabNav';
import { SuggestedInvoice } from './_components/SuggestedInvoice';
import { ManageClients } from './_components/ManageClients';
import { ScannedDocuments } from './_components/ScannedDocuments';
import { OnlinePayments } from './_components/OnlinePayments';
import { ReportsAndMore } from './_components/ReportsAndMore';

const ITEMS_PER_PAGE = 20;

type InvoiceTab = 'overview' | 'suggested' | 'clients' | 'scanned' | 'payments' | 'reports';

const INVOICE_TABS: DocTab<InvoiceTab>[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'suggested', label: 'Suggested Invoice' },
  { id: 'clients',   label: 'Manage Clients' },
  { id: 'scanned',   label: 'Scanned Documents' },
  { id: 'payments',  label: 'Online Payments' },
  { id: 'reports',   label: 'Reports & More' },
];

export default function InvoicesPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [activeTab, setActiveTab] = useState<InvoiceTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreateView, setShowCreateView] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{ invoiceId: string; invoiceNumber: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const filters = useMemo(
    () => ({
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

  const sendMutation       = useSendInvoice(effectiveTenant);
  const voidMutation       = useVoidInvoice(effectiveTenant);
  const paymentMutation    = useRecordPayment(effectiveTenant);
  const markPaidMutation   = useMarkPaid(effectiveTenant);
  const creditNoteMutation  = useCreateCreditNote(effectiveTenant);
  const debitNoteMutation   = useCreateDebitNote(effectiveTenant);
  const generateReceiptMutation = useGenerateReceiptFromInvoice(effectiveTenant);

  const rows = useMemo(() => invoices.map(invoiceToDocumentRow), [invoices]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_email?.toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const handleRecordPayment = useCallback(() => {
    if (!paymentDialog || !paymentAmount) return;
    paymentMutation.mutate(
      { invoiceId: paymentDialog.invoiceId, amount: paymentAmount },
      { onSuccess: () => { setPaymentDialog(null); setPaymentAmount(''); } },
    );
  }, [paymentDialog, paymentAmount, paymentMutation]);

  const actions: DocAction[] = [
    {
      label: 'View Details',
      icon: <FileText className="h-3.5 w-3.5" />,
      onClick: (r) => router.push(`/${orgSlug}/invoices/${r.id}`),
    },
    {
      label: 'View Public Page',
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      onClick: (r) => r.public_token && window.open(`/i/${r.public_token}`, '_blank'),
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
      onClick: (r) => setPaymentDialog({ invoiceId: r.id, invoiceNumber: r.doc_number }),
      visible: (r) =>
        (r.payment_status === 'unpaid' || r.payment_status === 'partial') &&
        r.status !== 'void' && r.status !== 'cancelled',
    },
    {
      label: 'Mark as Paid',
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      onClick: (r) => markPaidMutation.mutate(r.id),
      visible: (r) => r.payment_status !== 'paid' && r.status !== 'void' && r.status !== 'cancelled',
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
      label: 'Generate Receipt',
      icon: <Receipt className="h-3.5 w-3.5" />,
      onClick: (r) => generateReceiptMutation.mutate(r.id, {
        onSuccess: (receipt: any) => toast.success(`Receipt ${receipt.invoice_number} generated`),
        onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to generate receipt'),
      }),
      visible: (r) => r.payment_status === 'paid' || r.status === 'paid',
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
      <SharedDocumentCreateView
        effectiveTenant={effectiveTenant}
        docType="invoice"
        onClose={() => { setShowCreateView(false); setEditId(undefined); }}
        editId={editId}
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
          {/* Page header */}
          <div className="px-6 pt-6 pb-0">
            <h1 className="text-lg font-black text-foreground">Invoice</h1>
          </div>

          {/* Tab navigation */}
          <DocTabNav tabs={INVOICE_TABS} active={activeTab} onChange={setActiveTab} />

          {/* Tab content */}
          {activeTab === 'overview' && (
            <>
              <SharedDocumentList
                title="Invoices"
                subtitle="Create, send and manage invoices."
                createLabel="Create Invoice"
                onCreateClick={() => setShowCreateView(true)}
                rows={filtered}
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
                pdfKind="invoice"
                showPaymentStatus
                showDueDate
                showExpandLineItems
                storageKey="invoice-col-prefs"
                emptyStateDescription="Send professional invoices and get paid faster."
              />

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

          {activeTab === 'suggested' && (
            <SuggestedInvoice
              effectiveTenant={effectiveTenant}
              onCreateFromSuggestion={() => setShowCreateView(true)}
            />
          )}

          {activeTab === 'clients' && (
            <ManageClients effectiveTenant={effectiveTenant} />
          )}

          {activeTab === 'scanned' && (
            <ScannedDocuments effectiveTenant={effectiveTenant} />
          )}

          {activeTab === 'payments' && (
            <OnlinePayments effectiveTenant={effectiveTenant} />
          )}

          {activeTab === 'reports' && (
            <ReportsAndMore effectiveTenant={effectiveTenant} />
          )}
        </>
      )}

      {bulkUploadOpen && (
        <BulkUploadStepper
          tenant={effectiveTenant}
          docType="invoice"
          onClose={() => setBulkUploadOpen(false)}
        />
      )}

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
