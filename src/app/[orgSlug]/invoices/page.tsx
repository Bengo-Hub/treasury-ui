'use client';

/**
 * Invoices Overview — a thin consumer of the SAME shared document stack every sibling page
 * uses (quotations, credit/debit notes, proforma, sales orders, delivery challans,
 * payment receipts): useDocumentListSource (tenant/aggregate resolution + scope filter),
 * useDocumentActions (centralized per-type action policy), useDocRowAction (mutation
 * runner) and the shared modals. Invoice-specific extras kept here: approval workflow
 * (permission-gated), Record Payment (shared RecordPaymentModal), View Payments, bulk
 * upload, and the Suggested/Clients/Scanned/Reports tabs.
 */

import { SharedDocumentList, type DocumentRow } from '@/components/documents/SharedDocumentList';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { DocTabNav, type DocTab } from '@/components/documents/DocTabNav';
import { BulkUploadStepper } from '@/components/documents/BulkUploadStepper';
import { RecordPaymentModal } from '@/components/documents/RecordPaymentModal';
import { ViewPaymentsModal, type ViewPaymentsInvoiceRef } from '@/components/documents/ViewPaymentsModal';
import { DocumentApprovalModal } from '@/components/documents/DocumentApprovalModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDocumentListSource } from '@/hooks/use-document-list-source';
import { useDocumentActions, type ActionRunner } from '@/hooks/use-document-actions';
import { useDocRowAction } from '@/hooks/use-doc-row-action';
import { useAdminStatusOverride } from '@/hooks/use-admin-status-override';
import {
  sendInvoice,
  voidInvoice,
  markPaid,
  createCreditNote,
  createDebitNote,
  generateReceiptFromInvoice,
  generateDeliveryNote,
  type PlatformInvoiceScope,
} from '@/lib/api/invoices';
import { useAuthStore } from '@/store/auth';
import { userHasPermission } from '@/lib/auth/permissions';
import type { ActionKey } from '@/lib/documents/actions';
import { Ban, Check, CheckCircle, DollarSign, ExternalLink, FileText, FileMinus, FilePlus, Pencil, Receipt, Send, ThumbsUp, Truck, Upload, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function InvoicesPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<InvoiceTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreateView, setShowCreateView] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  // In the all-tenants view a row's edit must target that row's tenant, not the owner org.
  const [editTenant, setEditTenant] = useState<string | undefined>(undefined);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [paymentFor, setPaymentFor] = useState<{ tenant: string; invoiceId: string; invoiceTotal?: string; currency?: string } | null>(null);
  const [viewPaymentsFor, setViewPaymentsFor] = useState<{ tenant: string; invoice: ViewPaymentsInvoiceRef } | null>(null);
  // Reused centralized approval modal (submit / approve / reject) — the SAME flow as the Approvals
  // inbox and the invoice detail page, opened right from a row so no one has to navigate away.
  const [approvalFor, setApprovalFor] = useState<{ tenant: string; invoiceId: string; invoiceNumber: string } | null>(null);
  // Confirm gate for Send (fiscalises + delivers) — warns about the KRA eTIMS sync via the shared
  // ConfirmDialog. (Approval itself now runs through the centralized modal, which fiscalises on the
  // final approval step server-side.)
  const [confirmDialog, setConfirmDialog] = useState<{ kind: 'send'; tenant: string; invoiceId: string; invoiceNumber: string } | null>(null);

  // The Invoices page shows the invoice family: 'standard' for regular tenants, broadened
  // (subscription/platform invoices too) on the owner's own view, and scope-driven in the
  // all-tenants aggregate — all inside the shared list source.
  const src = useDocumentListSource({
    family: 'invoice',
    invoiceType: 'standard',
    status: statusFilter,
    page,
    limit: ITEMS_PER_PAGE,
    withStats: true,
    withScope: true,
    ownerSelfOmitsTypes: true,
  });
  const { run, isPending } = useDocRowAction();
  const { adminActions, statusModal } = useAdminStatusOverride({ family: 'invoice', isPlatformOwner: src.isPlatformOwner, rowTenant: src.rowTenant });

  // Approve/reject/submit are privileged: mirror the permission set the backend + the shared
  // DocumentApprovalCard enforce (approvals.* OR invoices.change|manage) so anyone who can actually
  // act on an approval sees the buttons — a view-only user never does.
  const user = useAuthStore((s) => s.user);
  const canApprove = userHasPermission(
    user as Parameters<typeof userHasPermission>[0],
    [
      'treasury.approvals.change',
      'treasury.approvals.manage',
      'treasury.approvals.add',
      'treasury.invoices.change',
      'treasury.invoices.manage',
    ],
    'or',
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return src.rows;
    const q = searchQuery.toLowerCase();
    return src.rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_email?.toLowerCase().includes(q) ||
      r.tenant_name?.toLowerCase().includes(q),
    );
  }, [src.rows, searchQuery]);

  // Action runners bound to the centralized per-type policy (lib/documents/actions.ts) —
  // visibility comes from allowedActions('invoice', row), same as every sibling page.
  // Approval-workflow runners are only supplied when the caller has the permission; all three open
  // the SAME centralized approval modal (submit / approve / reject) so no one has to leave the list.
  const openApproval = (r: DocumentRow) =>
    setApprovalFor({ tenant: src.rowTenant(r), invoiceId: r.id, invoiceNumber: r.doc_number });
  const runners: Partial<Record<ActionKey, ActionRunner>> = {
    view_details: { label: 'View Details', icon: <FileText className="h-3.5 w-3.5" />, onClick: (r) => router.push(`/${src.detailHrefTenant(r)}/invoices/${r.id}`) },
    view_public: { label: 'View Public Page', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => r.public_token && window.open(`/i/${r.public_token}`, '_blank') },
    edit: { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onClick: (r) => { setEditId(r.id); setEditTenant(src.rowTenant(r) || src.docTenant); setShowCreateView(true); } },
    ...(canApprove ? {
      submit_for_approval: { label: 'Submit for Approval', icon: <ThumbsUp className="h-3.5 w-3.5" />, onClick: openApproval } as ActionRunner,
      approve: { label: 'Approve', icon: <Check className="h-3.5 w-3.5" />, onClick: openApproval } as ActionRunner,
      reject: { label: 'Reject', icon: <X className="h-3.5 w-3.5" />, destructive: true, onClick: openApproval } as ActionRunner,
    } : {}),
    send: { label: 'Send / Resend', icon: <Send className="h-3.5 w-3.5" />, onClick: (r) => setConfirmDialog({ kind: 'send', tenant: src.rowTenant(r), invoiceId: r.id, invoiceNumber: r.doc_number }) },
    generate_delivery_note: { label: 'Generate Delivery Note', icon: <Truck className="h-3.5 w-3.5" />, onClick: (r) => run(() => generateDeliveryNote(src.rowTenant(r), r.id), `Delivery note generated for ${r.doc_number}`) },
    view_delivery_note: { label: 'View Delivery Note', icon: <Truck className="h-3.5 w-3.5" />, onClick: (r) => r.related_documents?.delivery_note_id && router.push(`/${src.detailHrefTenant(r)}/invoices/${r.related_documents.delivery_note_id}`) },
    record_payment: { label: 'Record Payment', icon: <DollarSign className="h-3.5 w-3.5" />, onClick: (r) => setPaymentFor({ tenant: src.rowTenant(r), invoiceId: r.id, invoiceTotal: r.total_amount, currency: r.currency }) },
    view_payments: {
      label: 'View Payments', icon: <Receipt className="h-3.5 w-3.5" />,
      onClick: (r) => setViewPaymentsFor({ tenant: src.rowTenant(r), invoice: { id: r.id, invoice_number: r.doc_number, total_amount: r.total_amount, currency: r.currency } }),
    },
    mark_paid: { label: 'Mark as Paid', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: (r) => run(() => markPaid(src.rowTenant(r), r.id), `Invoice ${r.doc_number} marked paid`) },
    create_credit_note: { label: 'Create Credit Note', icon: <FileMinus className="h-3.5 w-3.5" />, onClick: (r) => run(() => createCreditNote(src.rowTenant(r), r.id), `Credit note created for ${r.doc_number}`) },
    view_credit_note: { label: 'View Credit Note', icon: <FileMinus className="h-3.5 w-3.5" />, onClick: (r) => r.related_documents?.credit_note_ids?.[0] && router.push(`/${src.detailHrefTenant(r)}/invoices/${r.related_documents.credit_note_ids[0]}`) },
    create_debit_note: { label: 'Create Debit Note', icon: <FilePlus className="h-3.5 w-3.5" />, onClick: (r) => run(() => createDebitNote(src.rowTenant(r), r.id), `Debit note created for ${r.doc_number}`) },
    view_debit_note: { label: 'View Debit Note', icon: <FilePlus className="h-3.5 w-3.5" />, onClick: (r) => r.related_documents?.debit_note_ids?.[0] && router.push(`/${src.detailHrefTenant(r)}/invoices/${r.related_documents.debit_note_ids[0]}`) },
    generate_receipt: { label: 'Generate Receipt', icon: <Receipt className="h-3.5 w-3.5" />, onClick: (r) => run(() => generateReceiptFromInvoice(src.rowTenant(r), r.id), `Receipt generated for ${r.doc_number}`) },
    view_receipt: { label: 'View Receipt', icon: <Receipt className="h-3.5 w-3.5" />, onClick: (r) => r.related_documents?.receipt_id && router.push(`/${src.detailHrefTenant(r)}/invoices/${r.related_documents.receipt_id}`) },
    void: { label: 'Void Invoice', icon: <Ban className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => voidInvoice(src.rowTenant(r), r.id), `Invoice ${r.doc_number} voided`) },
  };
  const actions = useDocumentActions('invoice', runners);
  // Platform-owner-only escape hatch: force any status, bypassing the workflow (backend
  // independently enforces the privilege).
  const actionsWithAdmin = useMemo(() => [...actions, ...adminActions], [actions, adminActions]);

  if (showCreateView) {
    return (
      <SharedDocumentCreateView
        effectiveTenant={editId ? (editTenant ?? src.docTenant) : src.docTenant}
        docType="invoice"
        onClose={() => { setShowCreateView(false); setEditId(undefined); setEditTenant(undefined); }}
        editId={editId}
      />
    );
  }

  const stats = src.statsData
    ? {
        total_count: src.statsData.total_count,
        total_amount: src.statsData.total_amount,
        amount_due: src.statsData.amount_due,
        currency: src.statsData.currency,
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
          {src.isAggregate && (
            <div className="px-8 pt-4 flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-muted-foreground">Invoice scope</label>
              <select
                value={src.scope}
                onChange={(e) => { src.setScope(e.target.value as PlatformInvoiceScope); setPage(1); }}
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
            subtitle={src.isAggregate ? 'All tenants — create, send and manage invoices.' : 'Create, send and manage invoices.'}
            createLabel={src.isAggregate ? undefined : 'Create Invoice'}
            onCreateClick={src.isAggregate ? undefined : () => setShowCreateView(true)}
            rows={filtered}
            isLoading={src.isLoading}
            error={src.error}
            total={src.total}
            page={page}
            onPageChange={setPage}
            itemsPerPage={ITEMS_PER_PAGE}
            statusOptions={['all', 'draft', 'pending_approval', 'approved', 'sent', 'paid', 'overdue', 'void']}
            statusFilter={statusFilter}
            onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
            searchQuery={searchQuery}
            onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
            stats={stats}
            actions={actionsWithAdmin}
            pdfKind="invoice"
            showPaymentStatus
            showDueDate
            showExpandLineItems
            showTenant={src.showTenant}
            storageKey="invoice-col-prefs"
            bulk={src.isAggregate ? undefined : { docType: 'invoice', family: 'invoice', tenant: src.docTenant }}
            emptyStateDescription="Send professional invoices and get paid faster."
          />

          {!src.isAggregate && (
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
        <SuggestedInvoice effectiveTenant={src.docTenant} onCreateFromSuggestion={() => setShowCreateView(true)} />
      )}

      {activeTab === 'clients' && (
        <ManageClients effectiveTenant={src.docTenant} />
      )}

      {activeTab === 'scanned' && (
        <ScannedDocuments effectiveTenant={src.docTenant} />
      )}

      {activeTab === 'reports' && (
        <ReportsAndMore effectiveTenant={src.docTenant} />
      )}

      {bulkUploadOpen && (
        <BulkUploadStepper
          tenant={src.docTenant}
          docType="invoice"
          onClose={() => setBulkUploadOpen(false)}
        />
      )}

      {/* Record Payment — the SAME shared modal the Payment Receipts page uses (full capture:
          date/reference/method persisted on the InvoicePayment record), replacing the old
          amount-only inline dialog. */}
      {paymentFor && (
        <RecordPaymentModal
          tenant={paymentFor.tenant}
          invoiceId={paymentFor.invoiceId}
          invoiceTotal={paymentFor.invoiceTotal}
          currency={paymentFor.currency}
          onClose={() => setPaymentFor(null)}
        />
      )}

      {viewPaymentsFor && (
        <ViewPaymentsModal
          tenant={viewPaymentsFor.tenant}
          invoice={viewPaymentsFor.invoice}
          onClose={() => setViewPaymentsFor(null)}
          canManage={canApprove}
        />
      )}

      {statusModal}

      {/* Centralized approval — reused from the detail page / Approvals inbox so submit/approve/reject
          happens right here. Terminal approval fiscalises with KRA eTIMS server-side. */}
      {approvalFor && (
        <DocumentApprovalModal
          open
          onClose={() => setApprovalFor(null)}
          tenant={approvalFor.tenant}
          module="invoice"
          documentId={approvalFor.invoiceId}
          documentReference={approvalFor.invoiceNumber}
        />
      )}

      <ConfirmDialog
        open={confirmDialog !== null}
        onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}
        title="Send this invoice?"
        description={`${confirmDialog?.invoiceNumber ?? 'The invoice'} will be transmitted to KRA eTIMS (fiscalised) and delivered to the customer.`}
        confirmLabel="Send"
        isPending={isPending}
        onConfirm={() => {
          if (!confirmDialog) return;
          const { tenant, invoiceId, invoiceNumber } = confirmDialog;
          run(() => sendInvoice(tenant, invoiceId), `Invoice ${invoiceNumber} sent to customer`);
          setConfirmDialog(null);
        }}
      />
    </>
  );
}
