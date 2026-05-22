'use client';

import { useQuotations } from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { cn } from '@/lib/utils';
import { FileSpreadsheet, Tag, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ClientsTab } from './_components/ClientsTab';
import { CreateQuotationView } from './_components/CreateQuotationView';
import { FiltersPanel } from './_components/FiltersPanel';
import { QuotationList } from './_components/QuotationList';
import { QuotationPreview } from './_components/QuotationPreview';
import { QuotationStatsBlock } from './_components/QuotationStats';
import { TagReportTab } from './_components/TagReportTab';

const ITEMS_PER_PAGE = 20;

const TABS = [
  { id: 'overview',        label: 'Overview',        icon: FileSpreadsheet },
  { id: 'manage-clients',  label: 'Manage Clients',  icon: Users },
  { id: 'tag-wise-report', label: 'Tag-wise Report', icon: Tag },
];

interface DropdownItem { label: string; icon?: React.ReactNode; onClick: () => void; className?: string; }

function DropdownMenu({ items, onClose }: { items: DropdownItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 z-50 min-w-[240px] rounded-xl border border-slate-200/80 bg-white shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
      {items.map((item, idx) => (
        <button key={idx} onClick={() => { item.onClick(); onClose(); }}
          className={cn(
            'w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left',
            item.className
          )}>
          {item.icon && <span className="text-slate-400">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function QuotationsPage() {
  const [activeTab, setActiveTab]           = useState<'overview' | 'manage-clients' | 'tag-wise-report'>('overview');
  const [createOpen, setCreateOpen]         = useState(false);
  const [editId, setEditId]                 = useState<string | null>(null);
  const [previewId, setPreviewId]           = useState<string | null>(null);
  const [page, setPage]                     = useState(1);
  const [statusFilter, setStatusFilter]     = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [clientSearch, setClientSearch]     = useState('');
  const [dateFrom, setDateFrom]             = useState('');
  const [dateTo, setDateTo]                 = useState('');
  const [quotationType, setQuotationType]   = useState<'active' | 'deleted'>('active');
  const [dropOpen, setDropOpen]             = useState(false);
  const [addClientDropOpen, setAddClientDropOpen] = useState(false);

  const { tenantPathId: effectiveTenant } = useResolvedTenant();
  const { data, isLoading } = useQuotations(effectiveTenant, {
    page,
    limit: ITEMS_PER_PAGE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const quotations = data?.quotations ?? [];
  const total      = data?.total ?? 0;

  const clearAllFilters = () => {
    setStatusFilter('all');
    setClientSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const createDropItems: DropdownItem[] = [
    { label: 'Create New Proforma Invoice', onClick: () => {} },
    { label: 'Create New Invoice',          onClick: () => {} },
    { label: 'Bulk Upload Quotations',      onClick: () => {} },
  ];

  const addClientDropItems: DropdownItem[] = [
    { label: 'Import Clients (CSV)',   onClick: () => {} },
    { label: 'Add From CRM Contacts', onClick: () => {} },
  ];

  if (createOpen || editId) {
    return (
      <CreateQuotationView
        effectiveTenant={effectiveTenant}
        editId={editId ?? undefined}
        onClose={() => { setCreateOpen(false); setEditId(null); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Quick Preview panel — rendered over the page */}
      {previewId && (
        <QuotationPreview
          quotationId={previewId}
          tenant={effectiveTenant}
          onClose={() => setPreviewId(null)}
          onEdit={() => { setPreviewId(null); setEditId(previewId); }}
          onDuplicate={() => setPreviewId(null)}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <span className="hover:text-slate-600 cursor-pointer transition-colors capitalize">{effectiveTenant}</span>
          <span>/</span>
          <span className="text-slate-700 font-semibold">Quotations</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Quotations</h1>
          <div className="relative flex items-center shadow-md">
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-emphasis hover:bg-brand-dark rounded-l-lg transition-all">
              + Create New Quotation
            </button>
            <button onClick={() => setDropOpen(o => !o)}
              className="flex items-center px-2 py-2 text-white bg-brand-emphasis border-l border-brand-dark/40 rounded-r-lg hover:bg-brand-dark transition-all">
              ▾
            </button>
            {dropOpen && <DropdownMenu items={createDropItems} onClose={() => setDropOpen(false)} />}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-slate-200">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <QuotationStatsBlock tenant={effectiveTenant} />
            <FiltersPanel
              statusFilter={statusFilter}   onStatusChange={setStatusFilter}
              clientSearch={clientSearch}   onClientSearchChange={setClientSearch}
              dateFrom={dateFrom}           onDateFromChange={setDateFrom}
              dateTo={dateTo}               onDateToChange={setDateTo}
              onClearAll={clearAllFilters}
            />
            <QuotationList
              quotations={quotations}
              isLoading={isLoading}
              total={total}
              page={page}
              setPage={setPage}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              effectiveTenant={effectiveTenant}
              onCreateClick={() => setCreateOpen(true)}
              onPreview={setPreviewId}
              onEdit={setEditId}
              quotationType={quotationType}
              setQuotationType={setQuotationType}
            />
          </div>
        )}

        {activeTab === 'manage-clients' && (
          <ClientsTab
            onAddClient={() => {}}
            addClientDropOpen={addClientDropOpen}
            setAddClientDropOpen={setAddClientDropOpen}
            addClientDropItems={addClientDropItems}
            DropdownMenu={DropdownMenu}
          />
        )}

        {activeTab === 'tag-wise-report' && <TagReportTab />}
      </div>
    </div>
  );
}
