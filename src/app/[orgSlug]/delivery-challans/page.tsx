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
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { Copy, Download, ExternalLink, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

export default function DeliveryChallansPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filters = useMemo(() => ({
    type: 'delivery_challan',
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    page,
    limit: ITEMS_PER_PAGE,
  }), [statusFilter, page]);

  const { data, isLoading, error } = useInvoices(effectiveTenant, filters, !!effectiveTenant);

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  const sendMutation      = useSendInvoice(effectiveTenant);
  const duplicateMutation = useDuplicateInvoice(effectiveTenant);
  const deleteMutation    = useDeleteInvoice(effectiveTenant);

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
      label: 'Delete',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      onClick: (r) => deleteMutation.mutate(r.id),
      destructive: true,
    },
  ];

  return (
    <SharedDocumentList
      title="Delivery Challans"
      subtitle="Track goods dispatched to customers."
      rows={filtered}
      isLoading={isLoading}
      error={error}
      total={total}
      page={page}
      onPageChange={setPage}
      itemsPerPage={ITEMS_PER_PAGE}
      statusOptions={['all', 'draft', 'dispatched', 'delivered', 'cancelled']}
      statusFilter={statusFilter}
      onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
      searchQuery={searchQuery}
      onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
      actions={actions}
      showDueDate
      showExpandLineItems
      storageKey="delivery-challan-col-prefs"
      emptyStateDescription="Delivery challans are generated from quotations. Use Generate Delivery Challan from a quotation's action menu."
    />
  );
}
