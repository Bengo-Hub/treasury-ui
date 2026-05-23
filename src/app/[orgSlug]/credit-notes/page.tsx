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
import { Ban, Copy, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

export default function CreditNotesPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      type: 'credit_note',
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      page,
      limit: ITEMS_PER_PAGE,
    }),
    [statusFilter, page],
  );

  const { data, isLoading, error } = useInvoices(effectiveTenant, filters, !!effectiveTenant);

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  const sendMutation = useSendInvoice(effectiveTenant);
  const voidMutation = useVoidInvoice(effectiveTenant);
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
      visible: (r) => r.status !== 'void',
      destructive: true,
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
      title="Credit Notes"
      subtitle="Issued to reduce a customer's outstanding balance."
      createLabel="Create Credit Note"
      onCreateClick={() => {}}
      rows={rows}
      isLoading={isLoading}
      error={error}
      total={total}
      page={page}
      onPageChange={setPage}
      itemsPerPage={ITEMS_PER_PAGE}
      statusOptions={['all', 'draft', 'sent', 'void']}
      statusFilter={statusFilter}
      onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
      searchQuery={searchQuery}
      onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
      actions={actions}
      emptyStateDescription="Issue credit notes to reduce a customer's outstanding balance."
    />
  );
}
