'use client';

import {
  SharedDocumentList,
  quotationToDocumentRow,
  type DocAction,
} from '@/components/documents/SharedDocumentList';
import { DocPreview }     from '@/components/documents/DocPreview';
import { DocStatsBlock }  from '@/components/documents/DocStatsBlock';
import { DocGraph }       from '@/components/documents/DocGraph';
import { DocTabNav, type DocTab } from '@/components/documents/DocTabNav';
import {
  useQuotations,
  useSendQuotation,
  useDeleteQuotation,
  useDuplicateQuotation,
  useCancelQuotation,
  useConvertToProforma,
  useConvertToSalesOrder,
  useGenerateDeliveryChallan,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { cn } from '@/lib/utils';
import {
  Ban, Copy, ExternalLink, FileText, Send, Trash2, Truck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SharedDocumentCreateView } from '@/components/documents/SharedDocumentCreateView';
import { ClientsTab }          from './_components/ClientsTab';
import { TagReportTab }        from './_components/TagReportTab';
import { FiltersPanel }        from './_components/FiltersPanel';

const ITEMS_PER_PAGE = 20;

interface DropdownItem { label: string; icon?: React.ReactNode; onClick: () => void; className?: string; }

function DropdownMenu({ items, onClose }: { items: DropdownItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 z-50 min-w-55 rounded-xl border border-border bg-popover shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
      {items.map((item, idx) => (
        <button key={idx} onClick={() => { item.onClick(); onClose(); }}
          className={cn('w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors text-left', item.className)}>
          {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

type QuotationTab = 'overview' | 'manage-clients' | 'tag-wise-report';

const QUOTATION_TABS: DocTab<QuotationTab>[] = [
  { id: 'overview',        label: 'Overview'        },
  { id: 'manage-clients',  label: 'Manage Clients'  },
  { id: 'tag-wise-report', label: 'Tag-wise Report' },
];

function ClientsTabWrapper() {
  const [addClientDropOpen, setAddClientDropOpen] = useState(false);
  const addClientDropItems: DropdownItem[] = [
    { label: 'Import Clients (CSV)',   onClick: () => {} },
    { label: 'Add From CRM Contacts', onClick: () => {} },
  ];
  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ClientsTab
        onAddClient={() => setAddClientDropOpen(o => !o)}
        addClientDropOpen={addClientDropOpen}
        setAddClientDropOpen={setAddClientDropOpen}
        addClientDropItems={addClientDropItems}
        DropdownMenu={DropdownMenu}
      />
    </div>
  );
}

export default function QuotationsPage() {
  const { tenantPathId: effectiveTenant } = useResolvedTenant();

  const [activeTab, setActiveTab]   = useState<QuotationTab>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [previewId, setPreviewId]   = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');

  const filters = useMemo(() => ({
    page,
    limit: ITEMS_PER_PAGE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  }), [page, statusFilter]);

  const { data, isLoading, error } = useQuotations(effectiveTenant, filters);

  const quotations = data?.quotations ?? [];
  const total      = data?.total ?? 0;

  const sendMutation     = useSendQuotation(effectiveTenant);
  const deleteMutation   = useDeleteQuotation(effectiveTenant);
  const dupMutation      = useDuplicateQuotation(effectiveTenant);
  const cancelMutation   = useCancelQuotation(effectiveTenant);
  const proformaMutation = useConvertToProforma(effectiveTenant);
  const salesOrderMut    = useConvertToSalesOrder(effectiveTenant);
  const challanMutation  = useGenerateDeliveryChallan(effectiveTenant);

  const rows = useMemo(() => quotations.map(quotationToDocumentRow), [quotations]);

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
      onClick: (r) => r.public_token && window.open(`/q/${r.public_token}`, '_blank'),
      visible: (r) => !!r.public_token,
    },
    {
      label: 'Send',
      icon: <Send className="h-3.5 w-3.5" />,
      onClick: (r) => sendMutation.mutate(r.id),
      visible: (r) => r.status === 'draft',
    },
    {
      label: 'Convert to Proforma',
      icon: <FileText className="h-3.5 w-3.5" />,
      onClick: (r) => proformaMutation.mutate(r.id),
      visible: (r) => r.status !== 'cancelled' && r.status !== 'expired',
    },
    {
      label: 'Convert to Sales Order',
      icon: <FileText className="h-3.5 w-3.5" />,
      onClick: (r) => salesOrderMut.mutate(r.id),
      visible: (r) => r.status !== 'cancelled' && r.status !== 'expired',
    },
    {
      label: 'Generate Delivery Challan',
      icon: <Truck className="h-3.5 w-3.5" />,
      onClick: (r) => challanMutation.mutate(r.id),
      visible: (r) => r.status === 'accepted' || r.status === 'converted',
    },
    {
      label: 'Duplicate',
      icon: <Copy className="h-3.5 w-3.5" />,
      onClick: (r) => dupMutation.mutate(r.id),
    },
    {
      label: 'Cancel',
      icon: <Ban className="h-3.5 w-3.5" />,
      onClick: (r) => cancelMutation.mutate(r.id),
      visible: (r) => r.status !== 'cancelled' && r.status !== 'converted',
      destructive: true,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      onClick: (r) => deleteMutation.mutate(r.id),
      destructive: true,
    },
  ];

  if (createOpen || editId) {
    return (
      <SharedDocumentCreateView
        effectiveTenant={effectiveTenant}
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
          tenant={effectiveTenant}
          onClose={() => setPreviewId(null)}
          onEdit={() => { setPreviewId(null); setEditId(previewId); }}
          onDuplicate={() => { dupMutation.mutate(previewId); setPreviewId(null); }}
        />
      )}

      {/* Page header */}
      <div className="px-6 pt-6 pb-0">
        <h1 className="text-lg font-black text-foreground">Quotations & Estimates</h1>
      </div>

      {/* Tab navigation */}
      <DocTabNav tabs={QUOTATION_TABS} active={activeTab} onChange={setActiveTab} />

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          <DocStatsBlock tenant={effectiveTenant} docType="quotation" />
          <DocGraph tenant={effectiveTenant} docType="quotation" />
          <FiltersPanel
            statusFilter={statusFilter}   onStatusChange={setStatusFilter}
            clientSearch={clientSearch}   onClientSearchChange={setClientSearch}
            dateFrom={dateFrom}           onDateFromChange={setDateFrom}
            dateTo={dateTo}               onDateToChange={setDateTo}
            onClearAll={() => { setStatusFilter('all'); setClientSearch(''); setDateFrom(''); setDateTo(''); }}
          />
          <SharedDocumentList
            title="Quotations"
            subtitle="Create and manage quotations for your customers."
            createLabel="Create New Quotation"
            onCreateClick={() => setCreateOpen(true)}
            rows={filtered}
            isLoading={isLoading}
            error={error}
            total={total}
            page={page}
            onPageChange={setPage}
            itemsPerPage={ITEMS_PER_PAGE}
            statusOptions={['all', 'draft', 'sent', 'accepted', 'declined', 'expired', 'converted', 'cancelled']}
            statusFilter={statusFilter}
            onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
            searchQuery={searchQuery}
            onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
            actions={actions}
            pdfKind="quotation"
            showDueDate
            showExpandLineItems
            storageKey="quotation-col-prefs"
            secondaryDateLabel="Valid Until"
            emptyStateDescription="Create quotations and send them to customers for approval."
            onRowPreview={setPreviewId}
          />
        </div>
      )}

      {activeTab === 'manage-clients' && (
        <ClientsTabWrapper />
      )}

      {activeTab === 'tag-wise-report' && (
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <TagReportTab />
        </div>
      )}
    </div>
  );
}
