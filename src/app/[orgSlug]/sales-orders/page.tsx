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
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { Copy, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

export default function SalesOrdersPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      type: 'sales_order',
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      page,
      limit: ITEMS_PER_PAGE,
    }),
    [statusFilter, page],
  );

  const { data, isLoading, error } = useInvoices(effectiveTenant, filters, !!effectiveTenant);

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  const duplicateMutation = useDuplicateInvoice(effectiveTenant);
  const deleteMutation = useDeleteInvoice(effectiveTenant);

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

  const actions: DocAction[] = [
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
    <DocumentListPage
      title="Sales Orders"
      subtitle="Manage customer purchase orders before invoicing."
      createLabel="Create Sales Order"
      onCreateClick={() => {}}
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
