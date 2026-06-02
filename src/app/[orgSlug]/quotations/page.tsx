'use client';

import {
  useQuotations,
  useCreateQuotation,
  useSendQuotation,
  useAcceptQuotation,
  useDeclineQuotation,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type {
  Quotation,
  CreateQuotationRequest,
  LineRequest,
} from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowUp,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Columns3,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Pencil,
  Phone,
  Plus,
  Ruler,
  Search,
  Send,
  Settings,
  Tag,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

type Tab = 'overview' | 'clients' | 'tag-wise';
type View = 'list' | 'create';

const ITEMS_PER_PAGE = 20;

const emptyLine = (): LineRequest => ({
  description: '',
  quantity: 1,
  unit_price: 0,
});

export default function QuotationsPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [view, setView] = useState<View>('list');

  if (view === 'create') {
    return (
      <CreateQuotationForm
        tenant={effectiveTenant}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <ListView
      tenant={effectiveTenant}
      isPlatformOwner={isPlatformOwner}
      tenantQueryParam={tenantQueryParam}
      onCreate={() => setView('create')}
    />
  );
}

function ListView({
  tenant,
  isPlatformOwner,
  tenantQueryParam,
  onCreate,
}: {
  tenant: string;
  isPlatformOwner: boolean;
  tenantQueryParam: string | null | undefined;
  onCreate: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <span className="hover:text-slate-900 transition-colors">
            Codevertex IT Solutions
          </span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-900">Quotations</span>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Quotations
          </h1>
          <div className="flex items-center">
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-2 rounded-l-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Create New Quotation
            </button>
            <button
              type="button"
              className="rounded-r-lg border-l border-slate-700 bg-slate-900 px-3 py-2.5 text-white transition-colors hover:bg-slate-800"
              aria-label="More create options"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-6 border-b border-slate-200">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
            Overview
          </TabButton>
          <TabButton active={tab === 'clients'} onClick={() => setTab('clients')}>
            Manage Clients
          </TabButton>
          <TabButton active={tab === 'tag-wise'} onClick={() => setTab('tag-wise')}>
            Tag-wise Report
          </TabButton>
        </div>

        {isPlatformOwner && !tenantQueryParam && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Select a tenant from the filter above to view their quotations.
          </div>
        )}

        {tab === 'overview' && <OverviewTab tenant={tenant} />}
        {tab === 'clients' && <ClientsTab />}
        {tab === 'tag-wise' && <TagWiseTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors',
        active
          ? 'border-slate-900 text-slate-900'
          : 'border-transparent text-slate-500 hover:text-slate-900',
      )}
    >
      {children}
    </button>
  );
}

function OverviewTab({ tenant }: { tenant: string }) {
  const [lifetimeOpen, setLifetimeOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);

  const [bucket, setBucket] = useState('Active Quotation');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      ...(statusFilter ? { status: statusFilter } : {}),
      page,
      limit: ITEMS_PER_PAGE,
    }),
    [statusFilter, page],
  );

  const { data, isLoading, error } = useQuotations(tenant, filters, !!tenant);
  const quotations = data?.quotations ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const filtered = useMemo(() => {
    if (!search.trim()) return quotations;
    const q = search.toLowerCase();
    return quotations.filter(
      (qt: Quotation) =>
        qt.quote_number?.toLowerCase().includes(q) ||
        qt.customer_name?.toLowerCase().includes(q) ||
        qt.customer_email?.toLowerCase().includes(q),
    );
  }, [quotations, search]);

  const sendMutation = useSendQuotation(tenant);
  const acceptMutation = useAcceptQuotation(tenant);
  const declineMutation = useDeclineQuotation(tenant);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <CollapsibleCard
        title="Lifetime Data"
        open={lifetimeOpen}
        onToggle={() => setLifetimeOpen((p) => !p)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Total Quotations" value={total.toString()} />
          <StatTile label="Total Value" value="—" />
          <StatTile label="Acceptance Rate" value="—" />
        </div>
      </CollapsibleCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            <option>Active Quotation</option>
            <option>All Quotations</option>
            <option>Draft</option>
            <option>Accepted</option>
            <option>Declined</option>
            <option>Expired</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>

        <div className="flex items-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-l-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Download As
          </button>
          <button
            type="button"
            className="rounded-r-lg border border-l-0 border-slate-300 bg-white px-3 py-2.5 text-slate-900 transition-colors hover:bg-slate-50"
            aria-label="More download options"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ChevronDown className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-900">Filters</span>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
              setClientFilter('');
              setDateRange('');
            }}
            className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" />
            Clear All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FilterField label="Select Quotation Status">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="">Select</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
                <option value="converted">Converted</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </FilterField>

          <FilterField label="Search Client">
            <div className="relative">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="">All Clients</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </FilterField>

          <FilterField label="Select Date Range">
            <div className="relative">
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="Start Date - End Date"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </FilterField>
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-500">Applied Filters</p>
      </div>

      <CollapsibleCard
        title="Quotation Summary"
        open={summaryOpen}
        onToggle={() => setSummaryOpen((p) => !p)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatTile label="Created" value="—" />
          <StatTile label="Sent" value="—" />
          <StatTile label="Accepted" value="—" />
          <StatTile label="Declined" value="—" />
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Quotation Graph"
        open={graphOpen}
        onToggle={() => setGraphOpen((p) => !p)}
      >
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
          Chart will render here
        </div>
      </CollapsibleCard>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="text-xs font-semibold text-slate-500">
            Showing <span className="font-bold text-slate-900">{filtered.length}</span> of{' '}
            <span className="font-bold text-slate-900">{total}</span>{' '}
            {total === 1 ? 'Quotation' : 'Quotations'}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              <Columns3 className="h-4 w-4" />
              Show/Hide Columns
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-slate-500">
                <Th>
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" />
                </Th>
                <Th sortable>Date</Th>
                <Th>Expand Line Items</Th>
                <Th sortable>Quotation</Th>
                <Th sortable>Quoted To</Th>
                <Th sortable align="right">
                  Amount
                </Th>
                <Th>Status</Th>
                <Th sortable align="right">
                  Payment Date
                </Th>
                <Th>Acceptance Status</Th>
                <Th>Quotation Email</Th>
                <Th>Reverse Charge Applicable</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {error && (
                <tr>
                  <td colSpan={12} className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-red-600">
                      Failed to load quotations. Check your connection and try again.
                    </p>
                  </td>
                </tr>
              )}
              {!error && isLoading && (
                <tr>
                  <td colSpan={12} className="px-5 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading quotations…
                    </div>
                  </td>
                </tr>
              )}
              {!error && !isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-5 py-16 text-center">
                    <p className="text-sm font-semibold text-slate-900">
                      No quotations to display
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Create a new quotation to get started.
                    </p>
                  </td>
                </tr>
              )}
              {!error &&
                !isLoading &&
                filtered.map((qt: Quotation) => (
                  <tr key={qt.id} className="transition-colors hover:bg-slate-50">
                    <Td>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                    </Td>
                    <Td>
                      <span className="text-slate-900">
                        {new Date(qt.quote_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Expand line items"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {qt.quote_number}
                      </span>
                    </Td>
                    <Td>
                      <div className="text-slate-900">{qt.customer_name || '--'}</div>
                      {qt.customer_email && (
                        <div className="text-[11px] text-slate-500">{qt.customer_email}</div>
                      )}
                    </Td>
                    <Td align="right">
                      <span className="font-semibold text-slate-900">
                        {qt.currency}{' '}
                        {Number(qt.total_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </Td>
                    <Td>
                      <StatusPill status={qt.status} />
                    </Td>
                    <Td align="right">
                      <span className="text-slate-500">—</span>
                    </Td>
                    <Td>
                      <span className="text-slate-500">—</span>
                    </Td>
                    <Td>
                      <span className="text-xs font-semibold text-slate-700">
                        Not Sent{' '}
                        <button
                          type="button"
                          onClick={() => sendMutation.mutate(qt.id)}
                          className="ml-1 text-slate-900 underline transition-colors hover:text-slate-700"
                        >
                          (Send)
                        </button>
                      </span>
                    </Td>
                    <Td>
                      <span className="text-slate-700">No</span>
                    </Td>
                    <Td align="right">
                      <div className="relative inline-flex items-center justify-end gap-1">
                        <IconButton aria-label="View">
                          <Eye className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton aria-label="Open in new tab">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton aria-label="Duplicate">
                          <Copy className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          aria-label="More actions"
                          onClick={() =>
                            setActionMenuId(actionMenuId === qt.id ? null : qt.id)
                          }
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </IconButton>
                        {actionMenuId === qt.id && (
                          <div className="absolute right-0 top-9 z-20 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            {qt.status === 'draft' && (
                              <MenuItem
                                icon={Send}
                                onClick={() => {
                                  sendMutation.mutate(qt.id);
                                  setActionMenuId(null);
                                }}
                              >
                                Send Quotation
                              </MenuItem>
                            )}
                            {(qt.status === 'sent' || qt.status === 'draft') && (
                              <MenuItem
                                icon={Check}
                                onClick={() => {
                                  acceptMutation.mutate(qt.id);
                                  setActionMenuId(null);
                                }}
                              >
                                Accept (Convert to Invoice)
                              </MenuItem>
                            )}
                            {qt.status !== 'declined' && qt.status !== 'converted' && (
                              <MenuItem
                                icon={X}
                                destructive
                                onClick={() => {
                                  declineMutation.mutate(qt.id);
                                  setActionMenuId(null);
                                }}
                              >
                                Decline
                              </MenuItem>
                            )}
                            <MenuItem icon={X} onClick={() => setActionMenuId(null)}>
                              Close
                            </MenuItem>
                          </div>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
            <span>
              Page <span className="font-bold text-slate-900">{page}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors enabled:hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors enabled:hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsTab() {
  const [subTab, setSubTab] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Codevertex IT Solutions</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Your Clients</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Your Clients</h2>
          <div className="flex items-center">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-l-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Client
            </button>
            <button
              type="button"
              className="rounded-r-lg border-l border-slate-700 bg-slate-900 px-3 py-2.5 text-white transition-colors hover:bg-slate-800"
              aria-label="More add options"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-6 border-b border-slate-200">
          <TabButton active onClick={() => undefined}>
            All Clients
          </TabButton>
          <button
            type="button"
            className="-mb-px border-b-2 border-transparent px-1 py-3 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            Reports & More
            <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-6">
            <SubTabButton
              active={subTab === 'active'}
              onClick={() => setSubTab('active')}
            >
              Active Clients
            </SubTabButton>
            <SubTabButton
              active={subTab === 'archived'}
              onClick={() => setSubTab('archived')}
            >
              Archived Clients
            </SubTabButton>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Search Clients"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500">
          <span>
            Showing <span className="font-bold text-slate-900">0</span> of{' '}
            <span className="font-bold text-slate-900">0</span> Clients
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            <Columns3 className="h-4 w-4" />
            Show/Hide Columns
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-slate-500">
                <Th>
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" />
                </Th>
                <Th>Logo</Th>
                <Th sortable>Name</Th>
                <Th>Select Clients/Prospects</Th>
                <Th sortable>Industry</Th>
                <Th>Added to Portfolio</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th sortable>Country</Th>
                <Th>Status</Th>
                <Th sortable>Last Communication Date</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={12} className="px-5 py-16 text-center">
                  <p className="text-sm font-semibold text-slate-900">No clients yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Add a client to start tracking your portfolio.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TagWiseTab() {
  const [status, setStatus] = useState('all');

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Codevertex IT Solutions</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Tag-wise Report</span>
        </div>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">Invoice</h2>

        <div className="mt-4 flex items-center gap-6 border-b border-slate-200">
          {['Overview', 'Suggested Invoice', 'Manage Clients', 'Scanned Documents', 'Online Payments'].map(
            (s, i) => (
              <button
                key={s}
                type="button"
                className={cn(
                  '-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors',
                  i === 0
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-900',
                )}
              >
                {s}
              </button>
            ),
          )}
          <button
            type="button"
            className="-mb-px border-b-2 border-transparent px-1 py-3 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            Reports & More
            <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">Tag Wise Report</h3>

        <div className="mt-5">
          <label className="block text-xs font-semibold text-slate-700">Invoice Date</label>
          <div className="relative mt-1.5 w-72">
            <input
              type="text"
              defaultValue="Feb 26, 2026 - May 26, 2026"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-semibold text-slate-700">
            Select Invoice Status
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {['all', 'draft', 'sent', 'accepted', 'declined', 'expired'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  status === s
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                {status === s && <Check className="h-3 w-3" />}
                <span className="capitalize">{s}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <span className="text-sm font-semibold text-slate-500">
            <span className="font-bold text-slate-900">No Records</span> Found
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              <Columns3 className="h-4 w-4" />
              Show/Hide Columns
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <Th>
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" />
                </Th>
                <Th sortable>Tag Name</Th>
                <Th sortable>Last Quotation Date</Th>
                <Th sortable align="right">
                  Total Quotation
                </Th>
                <Th sortable align="right">
                  Total Quotation Amount
                </Th>
                <Th sortable align="right">
                  Total GST
                </Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-5 py-20 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Filter className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">No Data</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; bg: string; text: string; dot: string }
  > = {
    draft: {
      label: 'Draft',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      dot: 'bg-slate-500',
    },
    sent: {
      label: 'Sent',
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-600',
    },
    accepted: {
      label: 'Accepted',
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      dot: 'bg-emerald-600',
    },
    declined: {
      label: 'Declined',
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-600',
    },
    expired: {
      label: 'Expired',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      dot: 'bg-amber-600',
    },
    converted: {
      label: 'Converted',
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      dot: 'bg-emerald-600',
    },
    created: {
      label: 'Created',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      dot: 'bg-amber-600',
    },
  };
  const v = map[status] ?? {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        v.bg,
        v.text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', v.dot)} />
      {v.label}
    </span>
  );
}

function CollapsibleCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <span className="text-base font-bold text-slate-900">{title}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500" />
        )}
      </button>
      {open && <div className="border-t border-slate-200 px-5 py-5">{children}</div>}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function Th({
  children,
  sortable,
  align = 'left',
}: {
  children: React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wider',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
      )}
    >
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'justify-end')}>
        {children}
        {sortable && <ArrowUp className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}

function Td({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-5 py-3 text-sm',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
      )}
    >
      {children}
    </td>
  );
}

function IconButton({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  'aria-label': string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function SubTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-b-2 pb-2 text-sm font-semibold transition-colors',
        active
          ? 'border-slate-900 text-slate-900'
          : 'border-transparent text-slate-500 hover:text-slate-900',
      )}
    >
      {children}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors',
        destructive
          ? 'text-red-600 hover:bg-red-50'
          : 'text-slate-700 hover:bg-slate-50',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function CreateQuotationForm({
  tenant,
  onBack,
}: {
  tenant: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('Quotation');
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('A00023');
  const [quoteDate, setQuoteDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [showValidTill, setShowValidTill] = useState(true);
  const [validTill, setValidTill] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shipping, setShipping] = useState(false);
  const [currency, setCurrency] = useState('KES');
  const [lines, setLines] = useState<LineRequest[]>([emptyLine()]);
  const [summariseQty, setSummariseQty] = useState(true);
  const [showTotalInWords, setShowTotalInWords] = useState(true);
  const [showTotalInPdf, setShowTotalInPdf] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [terms, setTerms] = useState<string[]>(['Thanks for doing business with us']);
  const [notes, setNotes] = useState('');

  const [adv, setAdv] = useState({
    displayUnitAs: 'Merge with quantity',
    showTaxSummary: 'Do not show',
    hidePlaceOfSupply: false,
    addOriginalImages: false,
    showThumbnails: false,
    showDescriptionFullWidth: false,
    hideSubtotalGroup: false,
    showSkuInQuotation: false,
    showSerialNumbers: false,
    displayBatchDetails: false,
  });

  const setAdvField = <K extends keyof typeof adv>(k: K, v: (typeof adv)[K]) =>
    setAdv((p) => ({ ...p, [k]: v }));

  const createMutation = useCreateQuotation(tenant);

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));
  const duplicateLine = (idx: number) =>
    setLines((p) => {
      const target = p[idx];
      if (!target) return p;
      return [...p, { ...target }];
    });
  const updateLine = (
    idx: number,
    field: keyof LineRequest,
    value: string | number,
  ) =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));

  const computed = useMemo(() => {
    return lines.map((l) => {
      const qty = Number(l.quantity || 0);
      const rate = Number(l.unit_price || 0);
      const amount = qty * rate;
      return { ...l, amount, tax: 0, total: amount };
    });
  }, [lines]);

  const totals = useMemo(() => {
    const amount = computed.reduce((s, l) => s + l.amount, 0);
    return { amount, tax: 0, total: amount };
  }, [computed]);

  const fmt = (n: number) =>
    `Ksh ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSave = useCallback(() => {
    if (!tenant) return;
    const body: CreateQuotationRequest = {
      customer_name: customerName,
      customer_email: customerEmail,
      quote_date: quoteDate,
      valid_until: showValidTill ? validTill : quoteDate,
      currency,
      notes,
      terms: terms.filter(Boolean).join('\n'),
      lines: lines.filter((l) => l.description.trim()),
    };
    createMutation.mutate(body, {
      onSuccess: () => onBack(),
    });
  }, [
    tenant,
    customerName,
    customerEmail,
    quoteDate,
    validTill,
    showValidTill,
    currency,
    notes,
    terms,
    lines,
    createMutation,
    onBack,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-200"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h1 className="text-center text-xl font-bold text-slate-900">
            Create New Quotation
          </h1>
          <ol className="mt-5 flex items-center justify-center gap-3">
            {[
              { n: 1, label: 'Quotation Details' },
              { n: 2, label: 'Design & Share (optional)' },
            ].map((s, i, arr) => (
              <li key={s.n} className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    step >= s.n ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500',
                  )}
                >
                  {s.n}
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold transition-colors',
                    step >= s.n ? 'text-slate-900' : 'text-slate-500',
                  )}
                >
                  {s.label}
                </span>
                {i < arr.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-b-2 border-dashed border-slate-300 bg-transparent text-center text-3xl font-bold tracking-tight text-slate-900 focus:border-slate-900 focus:outline-none"
              />
              <Pencil className="h-4 w-4 text-slate-500" />
            </div>
            {!showSubtitle ? (
              <button
                type="button"
                onClick={() => setShowSubtitle(true)}
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
              >
                <Plus className="h-4 w-4" />
                Add Subtitle
              </button>
            ) : (
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subtitle"
                className="border-b border-dashed border-slate-300 bg-transparent text-center text-sm text-slate-700 focus:border-slate-900 focus:outline-none"
              />
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
            <div className="space-y-5">
              <div className="grid grid-cols-[160px_1fr] items-start gap-4">
                <label className="border-b border-dashed border-slate-300 pb-1 pt-2 text-sm font-bold text-slate-900">
                  Quotation No<span className="text-red-600">*</span>
                </label>
                <div>
                  <input
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    className="w-full border-b border-slate-300 bg-transparent py-1 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Last No: A00022 (May 16, 2026)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="border-b border-dashed border-slate-300 pb-1 text-sm font-bold text-slate-900">
                  Quotation Date<span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                    className="w-full border-b border-slate-300 bg-transparent py-1 pr-7 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                  <Calendar className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {showValidTill ? (
                <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <label className="border-b border-dashed border-slate-300 pb-1 text-sm font-bold text-slate-900">
                    Valid Till Date
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={validTill}
                        onChange={(e) => setValidTill(e.target.value)}
                        className="w-full border-b border-slate-300 bg-transparent py-1 pr-7 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                      <Calendar className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Valid till settings"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowValidTill(false)}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove valid till date"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowValidTill(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
                >
                  <Plus className="h-4 w-4" />
                  Add Valid Till Date
                </button>
              )}

              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
              >
                <Plus className="h-4 w-4" />
                Add Custom Fields
              </button>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex h-32 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-sm font-semibold text-slate-700">
                Business Logo
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-slate-700 transition-colors hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-slate-700 transition-colors hover:text-slate-900"
                >
                  <Pencil className="h-3.5 w-3.5" /> change
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PartyCard title="Quotation From" subtitle="Your Details">
              <SelectField label="Codevertex IT Solutions" value="default" />
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Business details</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition-colors hover:text-slate-900"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                </div>
                <BusinessDetailRow label="Business Name" value="Codevertex IT Solutions" />
                <BusinessDetailRow
                  label="Address"
                  value="OGINGA STREET, PIONEER HSE, 2ND FLOOR, Kisumu, Kenya - 40100"
                />
                <BusinessDetailRow label="Email" value="codevertexitsolutions@gmail.com" />
                <BusinessDetailRow label="Phone" value="+254 743 793901" />
              </div>
            </PartyCard>

            <PartyCard title="Quotation For" subtitle="Client's Details">
              <div className="space-y-3">
                <SelectField label="Select a Client" value="" />
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Client name"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Client email"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm text-slate-700">Select Client/Business from the list</p>
                <p className="my-3 text-xs font-semibold text-slate-500">OR</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Add New Client
                </button>
              </div>
            </PartyCard>
          </div>

          <label className="mt-6 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900">
            <input
              type="checkbox"
              checked={shipping}
              onChange={(e) => setShipping(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            Add Shipping Details
          </label>

          <div className="mt-8">
            <div className="text-center">
              <span className="border-b border-dashed border-slate-300 pb-1 text-sm font-bold text-slate-900">
                Currency<span className="text-red-600">*</span>
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <ToolbarButton icon={Tag} label="Configure TAX" />
              <div className="rounded-lg border border-slate-300 bg-white">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full appearance-none rounded-lg bg-transparent px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="KES">Kenyan Shilling(KES, Ksh)</option>
                  <option value="USD">US Dollar (USD, $)</option>
                  <option value="EUR">Euro (EUR, €)</option>
                  <option value="GBP">British Pound (GBP, £)</option>
                </select>
              </div>
              <ToolbarButton label="Number and Currency Format" prefix="123" />
              <ToolbarButton icon={Ruler} label="Edit Columns/Formulas" />
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[2fr_90px_90px_90px_110px_90px_110px_40px] gap-2 bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white">
              <span>Item</span>
              <span className="text-right">TAX Rate</span>
              <span className="text-right">Quantity</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
              <span className="text-right">TAX</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            <div className="divide-y divide-slate-200 bg-white">
              {computed.map((l, idx) => (
                <div key={idx} className="px-4 py-3">
                  <div className="grid grid-cols-[2fr_90px_90px_90px_110px_90px_110px_40px] items-center gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">{idx + 1}.</span>
                      <input
                        placeholder="Item Name / SKU Id"
                        value={l.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        className="w-full rounded border-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-slate-50 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={0}
                        defaultValue={0}
                        className="w-12 rounded border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={l.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.unit_price}
                      onChange={(e) => updateLine(idx, 'unit_price', Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    <span className="text-right text-sm font-medium text-slate-900">{fmt(l.amount)}</span>
                    <span className="text-right text-sm text-slate-700">{fmt(l.tax)}</span>
                    <span className="text-right text-sm font-bold text-slate-900">{fmt(l.total)}</span>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateLine(idx)}
                        className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Duplicate line"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove line"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 pl-6 text-xs">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 transition-colors hover:text-slate-900"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Description
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 transition-colors hover:text-slate-900"
                    >
                      <ImageIcon className="h-3.5 w-3.5" /> Add Image
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 transition-colors hover:text-slate-900"
                    >
                      <Ruler className="h-3.5 w-3.5" /> Add Unit
                    </button>
                    <div className="relative">
                      <select
                        defaultValue="Product"
                        className="appearance-none rounded border border-slate-200 bg-white px-3 py-1 pr-7 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                      >
                        <option value="Product">Product</option>
                        <option value="Service">Service</option>
                        <option value="Hour">Hour</option>
                        <option value="Day">Day</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2">
              <button
                type="button"
                onClick={addLine}
                className="flex items-center justify-center gap-2 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Add New Line
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Add New Group
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div />
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Show Total in PDF</span>
                  <button
                    type="button"
                    onClick={() => setShowTotalInPdf((p) => !p)}
                    className="text-slate-500 transition-colors hover:text-slate-900"
                    aria-label="Toggle show total in PDF"
                  >
                    {showTotalInPdf ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Amount</span>
                  <span className="font-bold text-slate-900">{fmt(totals.amount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">TAX</span>
                  <span className="font-bold text-slate-900">{fmt(totals.tax)}</span>
                </div>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 self-start font-semibold text-slate-700 transition-colors hover:text-slate-900"
                  >
                    <Tag className="h-3.5 w-3.5" /> Add Discounts
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 self-start font-semibold text-slate-700 transition-colors hover:text-slate-900"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Additional Charges
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 self-start text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={summariseQty}
                      onChange={(e) => setSummariseQty(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    Summarise Total Quantity
                  </label>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
                  <span className="border-b border-dashed border-slate-300 pb-0.5 font-bold text-slate-900">
                    Total <span className="text-slate-500">({currency})</span>
                  </span>
                  <span className="text-base font-bold text-slate-900">{fmt(totals.total)}</span>
                </div>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition-colors hover:text-slate-900"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Custom Fields
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Show Total In Words</span>
                  <button
                    type="button"
                    onClick={() => setShowTotalInWords((p) => !p)}
                    className="text-slate-500 transition-colors hover:text-slate-900"
                    aria-label="Toggle show total in words"
                  >
                    {showTotalInWords ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {showTotalInWords && (
                  <div className="mt-3 text-sm">
                    <span className="border-b border-dashed border-slate-300 pb-0.5 font-semibold text-slate-500">
                      Total (in words)
                    </span>
                    <p className="mt-2 border-b border-dashed border-slate-300 pb-1 text-slate-700">
                      One Shilling Only
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <PenLine className="h-4 w-4 text-slate-700" />
                Add Signature
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ExtraAction icon={Pencil} label="Add Notes" onClick={() => undefined} />
            <ExtraAction icon={Paperclip} label="Add Attachments" />
            <ExtraAction icon={Pencil} label="Add Additional Info" />
            <ExtraAction icon={Phone} label="Add Contact Details" />
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="border-b border-dashed border-slate-300 pb-0.5 text-base font-bold text-slate-900">
                Terms and Conditions
              </span>
              <button
                type="button"
                onClick={() => setTerms([])}
                className="text-slate-500 transition-colors hover:text-red-600"
                aria-label="Remove all terms"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {terms.map((t, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <input
                    value={t}
                    onChange={(e) =>
                      setTerms((p) => p.map((v, j) => (j === i ? e.target.value : v)))
                    }
                    className="flex-1 border-b border-dashed border-slate-300 bg-transparent py-1 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setTerms((p) => p.filter((_, j) => j !== i))}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove term"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => setTerms((p) => [...p, ''])}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
              >
                <Plus className="h-4 w-4" /> Add New Term
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
              >
                <Plus className="h-4 w-4" /> Add New Group
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setAdvancedOpen((p) => !p)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
            >
              <span className="text-base font-bold text-slate-900">Advanced options</span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-slate-500 transition-transform',
                  advancedOpen && 'rotate-180',
                )}
              />
            </button>
            {advancedOpen && (
              <div className="space-y-5 border-t border-slate-200 px-5 py-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Display unit as
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      value={adv.displayUnitAs}
                      onChange={(e) => setAdvField('displayUnitAs', e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option>Merge with quantity</option>
                      <option>Separate column</option>
                      <option>Hide</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Show tax summary in invoice
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      value={adv.showTaxSummary}
                      onChange={(e) => setAdvField('showTaxSummary', e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option>Do not show</option>
                      <option>Show grouped by rate</option>
                      <option>Show per line</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <AdvancedCheckbox
                    label="Hide place/country of supply"
                    checked={adv.hidePlaceOfSupply}
                    onChange={(v) => setAdvField('hidePlaceOfSupply', v)}
                  />
                  <AdvancedCheckbox
                    label="Add original images in line items"
                    checked={adv.addOriginalImages}
                    onChange={(v) => setAdvField('addOriginalImages', v)}
                  />
                  <AdvancedCheckbox
                    label="Show thumbnails in separate column"
                    checked={adv.showThumbnails}
                    onChange={(v) => setAdvField('showThumbnails', v)}
                  />
                  <AdvancedCheckbox
                    label="Show description in full width"
                    checked={adv.showDescriptionFullWidth}
                    onChange={(v) => setAdvField('showDescriptionFullWidth', v)}
                  />
                  <AdvancedCheckbox
                    label="Hide subtotal for group items"
                    checked={adv.hideSubtotalGroup}
                    onChange={(v) => setAdvField('hideSubtotalGroup', v)}
                  />
                  <AdvancedCheckbox
                    label="Show SKU in Quotation"
                    checked={adv.showSkuInQuotation}
                    onChange={(v) => setAdvField('showSkuInQuotation', v)}
                  />
                  <AdvancedCheckbox
                    label="Show Serial Numbers in Quotation"
                    checked={adv.showSerialNumbers}
                    onChange={(v) => setAdvField('showSerialNumbers', v)}
                  />
                  <AdvancedCheckbox
                    label="Display Batch Details in columns"
                    checked={adv.displayBatchDetails}
                    onChange={(v) => setAdvField('displayBatchDetails', v)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || !lines.some((l) => l.description.trim())}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & Continue
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-900 bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Save & Create New
            </button>
            <button
              type="button"
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Save As Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartyCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="border-b border-dashed border-slate-300 pb-1 text-base font-bold text-slate-900">
          {title}
        </h3>
        <span className="text-xs text-slate-500">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function SelectField({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-900 transition-colors hover:border-slate-400"
      >
        <span className={cn(!value && 'text-slate-400')}>{label}</span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>
    </div>
  );
}

function BusinessDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 py-1 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  prefix,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  prefix?: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
    >
      {prefix && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
          {prefix}
        </span>
      )}
      {Icon && <Icon className="h-4 w-4 text-slate-700" />}
      {label}
    </button>
  );
}

function ExtraAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 text-slate-700" />
      {label}
    </button>
  );
}

function AdvancedCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
      />
      {label}
    </label>
  );
}
