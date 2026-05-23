'use client';

import {
  DocumentListPage,
  invoiceToDocumentRow,
  type DocAction,
} from '@/components/documents/DocumentListPage';
import {
  useDeleteInvoice,
  useDuplicateInvoice,
  useInvoices,
  useSendInvoice,
  useVoidInvoice,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { SharedInvoiceCreateView } from '@/components/documents/SharedInvoiceCreateView';
import { Ban, Copy, Download, ExternalLink, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

export default function SalesOrdersPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);

  const filters = useMemo(() => ({
    type: 'sales_order',
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    page,
    limit: ITEMS_PER_PAGE,
  }), [statusFilter, page]);

  const { data, isLoading, error } = useInvoices(effectiveTenant, filters, !!effectiveTenant);

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  const sendMutation      = useSendInvoice(effectiveTenant);
  const voidMutation      = useVoidInvoice(effectiveTenant);
  const duplicateMutation = useDuplicateInvoice(effectiveTenant);
  const deleteMutation    = useDeleteInvoice(effectiveTenant);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(inv =>
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.customer_name?.toLowerCase().includes(q),
    );
  }, [invoices, searchQuery]);

  const rows = useMemo(() => filtered.map(invoiceToDocumentRow), [filtered]);

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
      visible: (r) => r.status !== 'void' && r.status !== 'cancelled',
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
        docType="sales_order"
        onClose={() => { setShowCreate(false); setEditId(undefined); }}
        editId={editId}
      />
    );
  }

  return (
    <DocumentListPage
      title="Sales Orders"
      subtitle="Manage customer purchase orders before invoicing."
      createLabel="Create Sales Order"
      onCreateClick={() => setShowCreate(true)}
      rows={rows}
      isLoading={isLoading}
      error={error}
      total={total}
      page={page}
      onPageChange={setPage}
      itemsPerPage={ITEMS_PER_PAGE}
      statusOptions={['all', 'draft', 'confirmed', 'fulfilled', 'cancelled']}
      statusFilter={statusFilter}
      onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
      searchQuery={searchQuery}
      onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
      actions={actions}
      showDueDate
      emptyStateDescription="Track customer purchase orders before converting them to invoices."
    />
  );
}
