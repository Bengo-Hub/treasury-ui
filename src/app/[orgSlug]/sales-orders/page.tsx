'use client';

import { SharedDocumentList } from '@/components/documents/SharedDocumentList';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { useDocumentListSource } from '@/hooks/use-document-list-source';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useDocRowAction } from '@/hooks/use-doc-row-action';
import { sendInvoice, voidInvoice, duplicateInvoice, generateDeliveryNote } from '@/lib/api/invoices';
import { Ban, Copy, ExternalLink, Pencil, Send, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 20;

export default function SalesOrdersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [edit, setEdit] = useState<{ id: string; tenant: string } | null>(null);

  const src = useDocumentListSource({ family: 'invoice', invoiceType: 'sales_order', status: statusFilter, page, limit: ITEMS_PER_PAGE });
  const { run } = useDocRowAction();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return src.rows;
    const q = searchQuery.toLowerCase();
    return src.rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q) || r.tenant_name?.toLowerCase().includes(q));
  }, [src.rows, searchQuery]);

  const actions = useDocumentActions('sales_order', {
    view_details: { label: 'View Details', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => router.push(`/${src.detailHrefTenant(r)}/invoices/${r.id}`) },
    view_public: { label: 'View Public Page', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => r.public_token && window.open(`/i/${r.public_token}`, '_blank') },
    edit: { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onClick: (r) => setEdit({ id: r.id, tenant: src.rowTenant(r) || src.docTenant }) },
    send: { label: 'Send', icon: <Send className="h-3.5 w-3.5" />, onClick: (r) => run(() => sendInvoice(src.rowTenant(r), r.id), `Sales order ${r.doc_number} sent`) },
    generate_delivery_note: { label: 'Generate Delivery Note', icon: <Truck className="h-3.5 w-3.5" />, onClick: (r) => run(() => generateDeliveryNote(src.rowTenant(r), r.id), `Delivery note generated for ${r.doc_number}`) },
    duplicate: { label: 'Duplicate', icon: <Copy className="h-3.5 w-3.5" />, onClick: (r) => run(() => duplicateInvoice(src.rowTenant(r), r.id), 'Sales order duplicated') },
    void: { label: 'Void', icon: <Ban className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => voidInvoice(src.rowTenant(r), r.id), `Sales order ${r.doc_number} voided`) },
  });

  if (showCreate || edit) {
    return <SharedDocumentCreateView effectiveTenant={edit?.tenant ?? src.docTenant} docType="sales_order" editId={edit?.id} onClose={() => { setShowCreate(false); setEdit(null); }} />;
  }

  return (
    <SharedDocumentList
      title="Sales Orders"
      subtitle={src.isAggregate ? 'All tenants — confirmed customer orders ready for fulfilment.' : 'Confirmed customer orders ready for fulfilment.'}
      createLabel={src.isAggregate ? undefined : 'Create Sales Order'}
      onCreateClick={src.isAggregate ? undefined : () => setShowCreate(true)}
      rows={filtered}
      isLoading={src.isLoading}
      error={src.error}
      total={src.total}
      page={page}
      onPageChange={setPage}
      itemsPerPage={ITEMS_PER_PAGE}
      statusOptions={['all', 'draft', 'sent', 'confirmed', 'void']}
      statusFilter={statusFilter}
      onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
      searchQuery={searchQuery}
      onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
      actions={actions}
      pdfKind="invoice"
      showExpandLineItems
      showTenant={src.showTenant}
      storageKey="sales-order-col-prefs"
      emptyStateDescription="Confirm customer orders before invoicing or dispatch."
    />
  );
}
