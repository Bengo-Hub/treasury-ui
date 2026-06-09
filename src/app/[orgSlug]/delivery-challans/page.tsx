'use client';

import { SharedDocumentList } from '@/components/documents/SharedDocumentList';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { useDocumentListSource } from '@/hooks/use-document-list-source';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useDocRowAction } from '@/hooks/use-doc-row-action';
import { voidInvoice, duplicateInvoice, deleteInvoice } from '@/lib/api/invoices';
import { Ban, Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 20;

export default function DeliveryChallansPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<{ id: string; tenant: string } | null>(null);

  const src = useDocumentListSource({ family: 'invoice', invoiceType: 'delivery_challan', status: statusFilter, page, limit: ITEMS_PER_PAGE });
  const { run } = useDocRowAction();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return src.rows;
    const q = searchQuery.toLowerCase();
    return src.rows.filter(r =>
      r.doc_number?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q) || r.tenant_name?.toLowerCase().includes(q));
  }, [src.rows, searchQuery]);

  const actions = useDocumentActions('delivery_challan', {
    view_details: { label: 'View Details', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => router.push(`/${src.detailHrefTenant(r)}/invoices/${r.id}`) },
    view_public: { label: 'View Public Page', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: (r) => r.public_token && window.open(`/i/${r.public_token}`, '_blank') },
    edit: { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onClick: (r) => setEdit({ id: r.id, tenant: src.rowTenant(r) || src.docTenant }) },
    duplicate: { label: 'Duplicate', icon: <Copy className="h-3.5 w-3.5" />, onClick: (r) => run(() => duplicateInvoice(src.rowTenant(r), r.id), 'Delivery note duplicated') },
    void: { label: 'Cancel', icon: <Ban className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => voidInvoice(src.rowTenant(r), r.id), `Delivery note ${r.doc_number} cancelled`) },
    delete: { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: (r) => run(() => deleteInvoice(src.rowTenant(r), r.id), 'Delivery note deleted') },
  });

  if (edit) {
    return <SharedDocumentCreateView effectiveTenant={edit.tenant} docType="delivery_challan" editId={edit.id} onClose={() => setEdit(null)} />;
  }

  return (
    <SharedDocumentList
      title="Delivery Challans"
      subtitle={src.isAggregate ? 'All tenants — track goods dispatched to customers.' : 'Track goods dispatched to customers.'}
      rows={filtered}
      isLoading={src.isLoading}
      error={src.error}
      total={src.total}
      page={page}
      onPageChange={setPage}
      itemsPerPage={ITEMS_PER_PAGE}
      statusOptions={['all', 'draft', 'dispatched', 'delivered', 'cancelled']}
      statusFilter={statusFilter}
      onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
      searchQuery={searchQuery}
      onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
      actions={actions}
      pdfKind="invoice"
      showDueDate
      showExpandLineItems
      showTenant={src.showTenant}
      storageKey="delivery-challan-col-prefs"
      emptyStateDescription="Delivery notes are generated from invoices (Generate Delivery Note in an invoice's action menu) or from a quotation's Generate Delivery Challan action."
    />
  );
}
