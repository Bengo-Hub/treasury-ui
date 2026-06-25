'use client';

import {
  SharedDocumentList,
  invoiceToDocumentRow,
  type DocAction,
  type DocumentRow,
} from '@/components/documents/SharedDocumentList';
import {
  useInvoices,
  useInvoiceStats,
  usePlatformInvoices,
  usePlatformInvoiceStats,
} from '@/hooks/use-invoices';
import {
  sendInvoice,
  voidInvoice,
  markPaid,
  recordPayment,
  createCreditNote,
  createDebitNote,
  generateReceiptFromInvoice,
  generateDeliveryNote,
  submitInvoiceForApproval,
  approveInvoice,
  rejectInvoice,
  type PlatformInvoiceScope,
} from '@/lib/api/invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useAuthStore } from '@/store/auth';
import { userHasPermission } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, CheckCircle, DollarSign, ExternalLink, FileText, FileMinus, FilePlus, Loader2, Pencil, Receipt, Send, ThumbsUp, Truck, Upload, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { BulkUploadStepper } from '@/components/documents/BulkUploadStepper';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { DocTabNav, type DocTab } from '@/components/documents/DocTabNav';
import { SuggestedInvoice } from './_components/SuggestedInvoice';
import { ManageClients } from './_components/ManageClients';
import { ScannedDocuments } from './_components/ScannedDocuments';
import { ReportsAndMore } from './_components/ReportsAndMore';

const ITEMS_PER_PAGE = 20;

type InvoiceTab = 'overview' | 'suggested' | 'clients' | 'scanned' | 'reports';

const INVOICE_TABS: DocTab<InvoiceTab>[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'suggested', label: 'Suggested Invoice' },
  { id: 'clients',   label: 'Manage Clients' },
  { id: 'scanned',   label: 'Scanned Documents' },
  { id: 'reports',   label: 'Reports & More' },
];

const SCOPE_OPTIONS: { value: PlatformInvoiceScope; label: string }[] = [
  { value: 'all',      label: 'All invoices' },
  { value: 'platform', label: 'Platform (subscription) only' },
  { value: 'business', label: 'Tenant sales only' },
];

// The Invoices page shows the invoice family (standard + platform subscription invoices) —
// credit/debit notes, proforma, sales orders, delivery challans and receipts (incl. POS
// receipts) each have their own page. The scope filter narrows the type set.
const SCOPE_TYPES: Record<PlatformInvoiceScope, string> = {
  all: 'standard,subscription',
  platform: 'subscription',
  business: 'standard',
};
const TENANT_INVOICE_TYPES = 'standard';

export default function InvoicesPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  // Aggregate (all-tenants) mode: a platform owner who has NOT narrowed to a single
  // tenant sees invoices across every tenant — including platform-level subscription
  // invoices — via the dedicated /platform/invoices endpoint.
  const isAggregate = isPlatformOwner && !tenantQueryParam;

  // The tenant-specific tabs (suggested, clients, scanned, payments, reports) and the
  // create/bulk flows always need a single tenant. For a platform owner with no tenant
  // selected, default to their own org (orgSlug, e.g. "codevertex") so these surfaces show
  // real content instead of a dead-end gate; selecting a tenant switches them to that tenant.
  const docTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const [activeTab, setActiveTab] = useState<InvoiceTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState<PlatformInvoiceScope>('all');
  const [page, setPage] = useState(1);
  const [showCreateView, setShowCreateView] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  // In the all-tenants view a row's edit must target that row's tenant, not the owner org.
  const [editTenant, setEditTenant] = useState<string | undefined>(undefined);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{ tenant: string; invoiceId: string; invoiceNumber: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ tenant: string; invoiceId: string; invoiceNumber: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Approve/reject/submit are privileged: the backend gates them on
  // treasury.invoices.change|manage — mirror that here so a view-only user never sees them.
  const user = useAuthStore((s) => s.user);
  const canApprove = userHasPermission(
    user as Parameters<typeof userHasPermission>[0],
    ['treasury.invoices.change', 'treasury.invoices.manage'],
    'or',
  );

  const platformTypes = SCOPE_TYPES[scopeFilter];

  const filters = useMemo(
    () => ({
      types: TENANT_INVOICE_TYPES,
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      page,
      limit: ITEMS_PER_PAGE,
    }),
    [statusFilter, page],
  );

  const platformFilters = useMemo(
    () => ({
      types: platformTypes,
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      page,
      limit: ITEMS_PER_PAGE,
    }),
    [platformTypes, statusFilter, page],
  );

  // Tenant-scoped queries (regular tenant, or platform owner with a tenant selected).
  const tenantQuery = useInvoices(effectiveTenant, filters, !isAggregate && !!effectiveTenant);
  const tenantStats = useInvoiceStats(effectiveTenant, TENANT_INVOICE_TYPES, !isAggregate && !!effectiveTenant);
  // Cross-tenant queries (platform owner, no tenant selected).
  const platformQuery = usePlatformInvoices(platformFilters, isAggregate);
  const platformStats = usePlatformInvoiceStats({ types: platformTypes }, isAggregate);

  const data = isAggregate ? platformQuery.data : tenantQuery.data;
  const isLoading = isAggregate ? platformQuery.isLoading : tenantQuery.isLoading;
  const error = isAggregate ? platformQuery.error : tenantQuery.error;
  const statsData = isAggregate ? platformStats.data : tenantStats.data;

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  // Resolve the tenant a row's mutations should target: the row's own tenant in the
  // all-tenants view, otherwise the active tenant.
  const rowTenant = useCallback(
    (r: DocumentRow & { tenant_slug?: string }) => (isAggregate ? r.tenant_slug ?? '' : effectiveTenant),
    [isAggregate, effectiveTenant],
  );

  const queryClient = useQueryClient();
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
  }, [queryClient]);

  // Generic per-row action runner — works in both tenant-scoped and all-tenants modes
  // by resolving the target tenant per row.
  const rowAction = useMutation({
    mutationFn: ({ fn }: { fn: () => Promise<unknown>; label: string }) => fn(),
    onSuccess: (_d, vars) => { invalidate(); toast.success(vars.label); },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Action failed'),
  });

  const run = useCallback(
    (fn: () => Promise<unknown>, label: string) => rowAction.mutate({ fn, label }),
    [rowAction],
  );

  const handleRecordPayment = useCallback(() => {
    if (!paymentDialog || !paymentAmount) return;
    rowAction.mutate(
      { fn: () => recordPayment(paymentDialog.tenant, paymentDialog.invoiceId, paymentAmount), label: 'Payment recorded' },
      { onSuccess: () => { invalidate(); setPaymentDialog(null); setPaymentAmount(''); } },
    );
  }, [paymentDialog, paymentAmount, rowAction, invalidate]);

  const handleReject = useCallback(() => {
    if (!rejectDialog) return;
    rowAction.mutate(
      { fn: () => rejectInvoice(rejectDialog.tenant, rejectDialog.invoiceId, rejectReason || undefined), label: `Invoice ${rejectDialog.invoiceNumber} rejected` },
      { onSuccess: () => { invalidate(); setRejectDialog(null); setRejectReason(''); } },
    );
  }, [rejectDialog, rejectReason, rowAction, invalidate]);

  // Build a tenant-scoped detail route. In the all-tenants view a platform owner can
  // open any tenant's invoice because the API resolves the tenant from the URL slug.
  const detailHref = useCallback(
    (r: DocumentRow & { tenant_slug?: string }) => `/${isAggregate ? (r.tenant_slug ?? orgSlug) : orgSlug}/invoices/${r.id}`,
    [isAggregate, orgSlug],
  );

  const rows = useMemo(() => invoices.map(invoiceToDocumentRow), [invoices]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_email?.toLowerCase().includes(q) ||
      r.tenant_name?.toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const actions: DocAction[] = [
    {
      label: 'View Details',
      icon: <FileText className="h-3.5 w-3.5" />,
      onClick: (r) => router.push(detailHref(r)),
    },
    {
      label: 'View Public Page',
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      onClick: (r) => r.public_token && window.open(`/i/${r.public_token}`, '_blank'),
      visible: (r) => !!r.public_token,
    },
    {
      label: 'Edit',
      icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: (r) => { setEditId(r.id); setEditTenant(rowTenant(r) || docTenant); setShowCreateView(true); },
      visible: (r) => r.status === 'draft',
    },
    {
      label: 'Submit for Approval',
      icon: <ThumbsUp className="h-3.5 w-3.5" />,
      onClick: (r) => run(() => submitInvoiceForApproval(rowTenant(r), r.id), `Invoice ${r.doc_number} submitted for approval`),
      // Draft invoices only; gated on the same permission the backend requires.
      visible: (r) => canApprove && r.status === 'draft',
    },
    {
      label: 'Approve',
      icon: <Check className="h-3.5 w-3.5" />,
      onClick: (r) => run(() => approveInvoice(rowTenant(r), r.id), `Invoice ${r.doc_number} approved`),
      visible: (r) => canApprove && r.status === 'pending_approval',
    },
    {
      label: 'Reject',
      icon: <X className="h-3.5 w-3.5" />,
      onClick: (r) => setRejectDialog({ tenant: rowTenant(r), invoiceId: r.id, invoiceNumber: r.doc_number }),
      visible: (r) => canApprove && r.status === 'pending_approval',
      destructive: true,
    },
    {
      // Send doubles as resend — the backend re-emails the customer on sent→sent — so it
      // stays available for sent/overdue invoices, not only drafts.
      label: 'Send / Resend',
      icon: <Send className="h-3.5 w-3.5" />,
      onClick: (r) => run(() => sendInvoice(rowTenant(r), r.id), `Invoice ${r.doc_number} sent to customer`),
      visible: (r) => r.status === 'draft' || r.status === 'approved' || r.status === 'sent' || r.status === 'overdue',
    },
    {
      label: 'Generate Delivery Note',
      icon: <Truck className="h-3.5 w-3.5" />,
      onClick: (r) => run(() => generateDeliveryNote(rowTenant(r), r.id), `Delivery note generated for ${r.doc_number}`),
      visible: (r) => r.status !== 'void' && r.status !== 'cancelled',
    },
    {
      label: 'Record Payment',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      onClick: (r) => setPaymentDialog({ tenant: rowTenant(r), invoiceId: r.id, invoiceNumber: r.doc_number }),
      visible: (r) =>
        (r.payment_status === 'unpaid' || r.payment_status === 'partial') &&
        r.status !== 'void' && r.status !== 'cancelled',
    },
    {
      label: 'Mark as Paid',
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      onClick: (r) => run(() => markPaid(rowTenant(r), r.id), `Invoice ${r.doc_number} marked paid`),
      visible: (r) => r.payment_status !== 'paid' && r.status !== 'void' && r.status !== 'cancelled',
    },
    {
      label: 'Create Credit Note',
      icon: <FileMinus className="h-3.5 w-3.5" />,
      onClick: (r) => run(() => createCreditNote(rowTenant(r), r.id), `Credit note created for ${r.doc_number}`),
      visible: (r) => r.status === 'sent' || r.status === 'paid' || r.status === 'overdue',
    },
    {
      label: 'Create Debit Note',
      icon: <FilePlus className="h-3.5 w-3.5" />,
      onClick: (r) => run(() => createDebitNote(rowTenant(r), r.id), `Debit note created for ${r.doc_number}`),
      visible: (r) => r.status === 'sent' || r.status === 'paid' || r.status === 'overdue',
    },
    {
      label: 'Generate Receipt',
      icon: <Receipt className="h-3.5 w-3.5" />,
      onClick: (r) => run(() => generateReceiptFromInvoice(rowTenant(r), r.id), `Receipt generated for ${r.doc_number}`),
      visible: (r) => r.payment_status === 'paid' || r.status === 'paid',
    },
    {
      label: 'Void Invoice',
      icon: <Ban className="h-3.5 w-3.5" />,
      onClick: (r) => run(() => voidInvoice(rowTenant(r), r.id), `Invoice ${r.doc_number} voided`),
      visible: (r) => r.status !== 'void' && r.status !== 'cancelled' && r.status !== 'paid',
      destructive: true,
    },
  ];

  if (showCreateView) {
    return (
      <SharedDocumentCreateView
        effectiveTenant={editId ? (editTenant ?? docTenant) : docTenant}
        docType="invoice"
        onClose={() => { setShowCreateView(false); setEditId(undefined); setEditTenant(undefined); }}
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
      {/* Page header */}
      <div className="px-6 pt-6 pb-0">
        <h1 className="text-lg font-black text-foreground">Invoice</h1>
      </div>

      {/* Tab navigation */}
      <DocTabNav tabs={INVOICE_TABS} active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === 'overview' && (
        <>
          {isAggregate && (
            <div className="px-8 pt-4 flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-muted-foreground">Invoice scope</label>
              <select
                value={scopeFilter}
                onChange={(e) => { setScopeFilter(e.target.value as PlatformInvoiceScope); setPage(1); }}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="text-[11px] text-muted-foreground">
                Showing invoices across all tenants. Use the tenant filter above to focus on one tenant.
              </span>
            </div>
          )}

          <SharedDocumentList
            title="Invoices"
            subtitle={isAggregate ? 'All tenants — create, send and manage invoices.' : 'Create, send and manage invoices.'}
            createLabel={isAggregate ? undefined : 'Create Invoice'}
            onCreateClick={isAggregate ? undefined : () => setShowCreateView(true)}
            rows={filtered}
            isLoading={isLoading}
            error={error}
            total={total}
            page={page}
            onPageChange={setPage}
            itemsPerPage={ITEMS_PER_PAGE}
            statusOptions={['all', 'draft', 'pending_approval', 'approved', 'sent', 'paid', 'overdue', 'void']}
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
            showTenant={isAggregate}
            storageKey="invoice-col-prefs"
            emptyStateDescription="Send professional invoices and get paid faster."
          />

          {!isAggregate && (
            <div className="px-8 pb-6 flex">
              <button
                onClick={() => setBulkUploadOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-accent transition-colors"
              >
                <Upload className="h-3.5 w-3.5" /> Bulk Upload Invoices
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'suggested' && (
        <SuggestedInvoice effectiveTenant={docTenant} onCreateFromSuggestion={() => setShowCreateView(true)} />
      )}

      {activeTab === 'clients' && (
        <ManageClients effectiveTenant={docTenant} />
      )}

      {activeTab === 'scanned' && (
        <ScannedDocuments effectiveTenant={docTenant} />
      )}

      {activeTab === 'reports' && (
        <ReportsAndMore effectiveTenant={docTenant} />
      )}

      {bulkUploadOpen && (
        <BulkUploadStepper
          tenant={docTenant}
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
                disabled={rowAction.isPending || !paymentAmount}
                className={cn(
                  'px-5 py-2 rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90',
                  (rowAction.isPending || !paymentAmount) && 'opacity-50 cursor-not-allowed',
                )}
              >
                {rowAction.isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-1" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectDialog(null); }}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-border p-6 space-y-4 bg-card shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Reject Invoice</h2>
              <button onClick={() => setRejectDialog(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Invoice {rejectDialog.invoiceNumber} will be sent back to draft for revision.
            </p>
            <div>
              <label className="text-xs font-bold block mb-1 text-foreground">Reason</label>
              <textarea
                className="w-full rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-ring bg-background border border-input text-foreground min-h-20"
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectDialog(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-accent transition-colors text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rowAction.isPending}
                className={cn(
                  'px-5 py-2 rounded-lg text-xs font-bold transition-all bg-destructive text-destructive-foreground hover:bg-destructive/90',
                  rowAction.isPending && 'opacity-50 cursor-not-allowed',
                )}
              >
                {rowAction.isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-1" />}
                Reject Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
