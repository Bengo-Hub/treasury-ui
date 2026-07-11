'use client';

import { SharedDocumentList } from '@/components/documents/SharedDocumentList';
import { DocPreview } from '@/components/documents/DocPreview';
import { DocStatsBlock } from '@/components/documents/DocStatsBlock';
import { DocGraph } from '@/components/documents/DocGraph';
import { DocTabNav, type DocTab } from '@/components/documents/DocTabNav';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { ManageClients } from '@/app/[orgSlug]/invoices/_components/ManageClients';
import { useDocumentListSource } from '@/hooks/use-document-list-source';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useDocRowAction } from '@/hooks/use-doc-row-action';
import {
  sendQuotation, deleteQuotation, duplicateQuotation, cancelQuotation,
  acceptQuotation, declineQuotation, convertQuotationToProforma,
  convertQuotationToSalesOrder, generateDeliveryChallan,
} from '@/lib/api/invoices';
import { useAdminStatusOverride } from '@/hooks/use-admin-status-override';
import { Ban, CheckCircle, Copy, ExternalLink, FileText, Pencil, Send, Trash2, Truck, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

type QuotationTab = 'overview' | 'manage-clients';

const QUOTATION_TABS: DocTab<QuotationTab>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'manage-clients', label: 'Manage Clients' },
];

export default function QuotationsPage() {
  const [activeTab, setActiveTab] = useState<QuotationTab>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const src = useDocumentListSource({ family: 'quotation', status: statusFilter, page, limit: ITEMS_PER_PAGE });
  const { run } = useDocRowAction();
  const { adminActions, statusModal } = useAdminStatusOverride({ family: 'quotation', isPlatformOwner: src.isPlatformOwner, rowTenant: src.rowTenant });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return src.rows;
    const q = searchQuery.toLowerCase();
    return src.rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q) || r.tenant_name?.toLowerCase().includes(q));
  }, [src.rows, searchQuery]);

  const actions = useDocumentActions('quotation', {
    view_public: { label: 'View Public Page', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => r.public_token && window.open(`/q/${r.public_token}`, '_blank') },
    edit: { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onClick: (r) => setEditId(r.id) },
    send: { label: 'Send', icon: <Send className="h-3.5 w-3.5" />, onClick: (r) => run(() => sendQuotation(src.rowTenant(r), r.id), `Quotation ${r.doc_number} sent`) },
    accept: { label: 'Accept', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: (r) => run(() => acceptQuotation(src.rowTenant(r), r.id), `Quotation ${r.doc_number} accepted → invoice created`) },
    decline: { label: 'Decline', icon: <XCircle className="h-3.5 w-3.5" />, onClick: (r) => run(() => declineQuotation(src.rowTenant(r), r.id), `Quotation ${r.doc_number} declined`) },
    convert_to_proforma: { label: 'Convert to Proforma', icon: <FileText className="h-3.5 w-3.5" />, onClick: (r) => run(() => convertQuotationToProforma(src.rowTenant(r), r.id), `Converted ${r.doc_number} to proforma`) },
    convert_to_sales_order: { label: 'Convert to Sales Order', icon: <FileText className="h-3.5 w-3.5" />, onClick: (r) => run(() => convertQuotationToSalesOrder(src.rowTenant(r), r.id), `Converted ${r.doc_number} to sales order`) },
    generate_delivery_note: { label: 'Generate Delivery Challan', icon: <Truck className="h-3.5 w-3.5" />, onClick: (r) => run(() => generateDeliveryChallan(src.rowTenant(r), r.id), `Delivery challan generated for ${r.doc_number}`) },
    duplicate: { label: 'Duplicate', icon: <Copy className="h-3.5 w-3.5" />, onClick: (r) => run(() => duplicateQuotation(src.rowTenant(r), r.id), 'Quotation duplicated') },
    cancel: { label: 'Cancel', icon: <Ban className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => cancelQuotation(src.rowTenant(r), r.id), `Quotation ${r.doc_number} cancelled`) },
    delete: { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => deleteQuotation(src.rowTenant(r), r.id), 'Quotation deleted') },
  });

  // Platform-owner-only status override — appended outside the status-gated policy so it is
  // available on any quotation regardless of its current state.
  const actionsWithAdmin = useMemo(() => [...actions, ...adminActions], [actions, adminActions]);

  if (createOpen || editId) {
    return (
      <SharedDocumentCreateView
        effectiveTenant={src.docTenant}
        docType="quotation"
        editId={editId ?? undefined}
        onClose={() => { setCreateOpen(false); setEditId(null); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {previewId && (
        <DocPreview
          docId={previewId}
          docType="quotation"
          tenant={src.docTenant}
          onClose={() => setPreviewId(null)}
          onEdit={() => { setPreviewId(null); setEditId(previewId); }}
          onDuplicate={() => { run(() => duplicateQuotation(src.docTenant, previewId), 'Quotation duplicated'); setPreviewId(null); }}
        />
      )}

      <div className="px-6 pt-6 pb-0">
        <h1 className="text-lg font-black text-foreground">Quotations &amp; Estimates</h1>
      </div>

      <DocTabNav tabs={QUOTATION_TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          {!src.isAggregate && <DocStatsBlock tenant={src.docTenant} docType="quotation" />}
          {!src.isAggregate && <DocGraph tenant={src.docTenant} docType="quotation" />}
          <SharedDocumentList
            title="Quotations"
            subtitle={src.isAggregate ? 'All tenants — create and manage quotations.' : 'Create and manage quotations for your customers.'}
            createLabel={src.isAggregate ? undefined : 'Create New Quotation'}
            onCreateClick={src.isAggregate ? undefined : () => setCreateOpen(true)}
            rows={filtered}
            isLoading={src.isLoading}
            error={src.error}
            total={src.total}
            page={page}
            onPageChange={setPage}
            itemsPerPage={ITEMS_PER_PAGE}
            statusOptions={['all', 'draft', 'sent', 'accepted', 'declined', 'expired', 'converted', 'cancelled']}
            statusFilter={statusFilter}
            onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
            searchQuery={searchQuery}
            onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
            actions={actionsWithAdmin}
            pdfKind="quotation"
            showDueDate
            showExpandLineItems
            showTenant={src.showTenant}
            storageKey="quotation-col-prefs"
            secondaryDateLabel="Valid Until"
            emptyStateDescription="Create quotations and send them to customers for approval."
            onRowPreview={setPreviewId}
          />
        </div>
      )}

      {activeTab === 'manage-clients' && (
        <ManageClients effectiveTenant={src.docTenant} />
      )}

      {statusModal}
    </div>
  );
}
