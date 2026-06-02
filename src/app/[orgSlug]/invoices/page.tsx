'use client';

import {
  useInvoices,
  useCreateInvoice,
  useSendInvoice,
  useVoidInvoice,
  useRecordPayment,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type {
  Invoice,
  CreateInvoiceRequest,
  LineRequest,
} from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import {
  ArchiveRestore,
  ArrowLeft,
  ArrowUp,
  Ban,
  Calendar,
  Camera,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Columns3,
  Copy,
  DollarSign,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Inbox,
  Info,
  Lightbulb,
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
  Star,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

type Tab =
  | 'overview'
  | 'suggested'
  | 'clients'
  | 'scanned'
  | 'online-payments';
type View = 'list' | 'create' | 'add-client';

type ReportType =
  | 'client'
  | 'tag-wise'
  | 'project-pnl'
  | 'payment'
  | 'tds'
  | 'tax'
  | 'line-item'
  | 'hsn';

const REPORT_LABELS: Record<ReportType, string> = {
  client: 'Client Report',
  'tag-wise': 'Tag Wise Report',
  'project-pnl': 'Project-wise P&L',
  payment: 'Payment Report',
  tds: 'TDS Report',
  tax: 'TAX Report',
  'line-item': 'Line Item Report',
  hsn: 'HSN Report',
};

const ITEMS_PER_PAGE = 20;

const emptyLine = (): LineRequest => ({
  description: '',
  quantity: 1,
  unit_price: 0,
});

export default function InvoicesPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [view, setView] = useState<View>('list');

  if (view === 'create') {
    return (
      <CreateInvoiceForm
        tenant={effectiveTenant}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'add-client') {
    return <AddClientForm onBack={() => setView('list')} />;
  }

  return (
    <ListView
      tenant={effectiveTenant}
      isPlatformOwner={isPlatformOwner}
      tenantQueryParam={tenantQueryParam}
      onCreate={() => setView('create')}
      onAddClient={() => setView('add-client')}
    />
  );
}

function ListView({
  tenant,
  isPlatformOwner,
  tenantQueryParam,
  onCreate,
  onAddClient,
}: {
  tenant: string;
  isPlatformOwner: boolean;
  tenantQueryParam: string | null | undefined;
  onCreate: () => void;
  onAddClient: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);

  const selectTab = (t: Tab) => {
    setActiveReport(null);
    setTab(t);
  };

  const selectReport = (r: ReportType) => {
    setActiveReport(r);
  };

  const sectionLabel = activeReport ? REPORT_LABELS[activeReport] : 'Invoices';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <span>Codevertex IT Solutions</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-900">{sectionLabel}</span>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Invoice
            </h1>
            <Lightbulb className="h-5 w-5 text-amber-500" />
          </div>
          {!activeReport && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                <Camera className="h-4 w-4" />
                Scan Invoice
              </button>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={onCreate}
                  className="inline-flex items-center gap-2 rounded-l-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                >
                  <Plus className="h-4 w-4" />
                  Create New Invoice
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
          )}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-6 border-b border-slate-200">
          <TabButton
            active={!activeReport && tab === 'overview'}
            onClick={() => selectTab('overview')}
          >
            Overview
          </TabButton>
          <TabButton
            active={!activeReport && tab === 'suggested'}
            onClick={() => selectTab('suggested')}
          >
            Suggested Invoice
          </TabButton>
          <TabButton
            active={!activeReport && tab === 'clients'}
            onClick={() => selectTab('clients')}
          >
            Manage Clients
          </TabButton>
          <TabButton
            active={!activeReport && tab === 'scanned'}
            onClick={() => selectTab('scanned')}
          >
            Scanned Documents
          </TabButton>
          <TabButton
            active={!activeReport && tab === 'online-payments'}
            onClick={() => selectTab('online-payments')}
          >
            Online Payments
          </TabButton>
          <ReportsDropdown
            activeReport={activeReport}
            onSelect={selectReport}
          />
        </div>

        {isPlatformOwner && !tenantQueryParam && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Select a tenant from the filter above to view their invoices.
          </div>
        )}

        {activeReport ? (
          <ReportView type={activeReport} />
        ) : (
          <>
            {tab === 'overview' && <OverviewTab tenant={tenant} />}
            {tab === 'suggested' && <SuggestedInvoiceTab />}
            {tab === 'clients' && <ManageClientsTab onAddClient={onAddClient} />}
            {tab === 'scanned' && <ScannedDocumentsTab />}
            {tab === 'online-payments' && <RefrensPaymentsTab />}
          </>
        )}
      </div>
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">Nothing to show here yet.</p>
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

  const [bucket, setBucket] = useState('Active Invoice');
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

  const { data, isLoading, error } = useInvoices(tenant, filters, !!tenant);
  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (inv: Invoice) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.customer_email?.toLowerCase().includes(q),
    );
  }, [invoices, search]);

  const sendMutation = useSendInvoice(tenant);
  const voidMutation = useVoidInvoice(tenant);
  const paymentMutation = useRecordPayment(tenant);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [paymentModalId, setPaymentModalId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  return (
    <div className="space-y-5">
      <CollapsibleCard
        title="Lifetime data"
        open={lifetimeOpen}
        onToggle={() => setLifetimeOpen((p) => !p)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Total Invoices" value={total.toString()} />
          <StatTile label="Total Billed" value="—" />
          <StatTile label="Total Paid" value="—" />
        </div>
      </CollapsibleCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            <option>Active Invoice</option>
            <option>All Invoices</option>
            <option>Draft</option>
            <option>Sent</option>
            <option>Paid</option>
            <option>Overdue</option>
            <option>Void</option>
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
          <FilterField label="Select Invoice Status">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="">Select</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="void">Void</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </FilterField>

          <FilterField label="Search client">
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

          <FilterField label="Select date range">
            <div className="relative">
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="Start date - End date"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
              />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </FilterField>
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-500">Applied Filters</p>
      </div>

      <CollapsibleCard
        title="Invoice Summary"
        open={summaryOpen}
        onToggle={() => setSummaryOpen((p) => !p)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatTile label="Draft" value="—" />
          <StatTile label="Sent" value="—" />
          <StatTile label="Paid" value="—" />
          <StatTile label="Overdue" value="—" />
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Invoice Graph"
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
            {total === 1 ? 'Invoice' : 'Invoices'}
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
                <Th sortable>Invoice</Th>
                <Th sortable>Billed To</Th>
                <Th sortable align="right">
                  Amount
                </Th>
                <Th>Status</Th>
                <Th sortable align="right">
                  Payment Date
                </Th>
                <Th>Acceptance Status</Th>
                <Th>Invoice Email</Th>
                <Th>Reverse Charge Applicable</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {error && (
                <tr>
                  <td colSpan={12} className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-red-600">
                      Failed to load invoices. Check your connection and try again.
                    </p>
                  </td>
                </tr>
              )}
              {!error && isLoading && (
                <tr>
                  <td colSpan={12} className="px-5 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading invoices…
                    </div>
                  </td>
                </tr>
              )}
              {!error && !isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-5 py-16 text-center">
                    <p className="text-sm font-semibold text-slate-900">
                      No invoices to display
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Create a new invoice to get started.
                    </p>
                  </td>
                </tr>
              )}
              {!error &&
                !isLoading &&
                filtered.map((inv: Invoice) => (
                  <tr key={inv.id} className="transition-colors hover:bg-slate-50">
                    <Td>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                    </Td>
                    <Td>
                      <span className="text-slate-900">
                        {new Date(inv.invoice_date).toLocaleDateString(undefined, {
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
                        {inv.invoice_number}
                      </span>
                    </Td>
                    <Td>
                      <div className="text-slate-900">{inv.customer_name || '--'}</div>
                      {inv.customer_email && (
                        <div className="text-[11px] text-slate-500">{inv.customer_email}</div>
                      )}
                    </Td>
                    <Td align="right">
                      <span className="font-semibold text-slate-900">
                        {inv.currency}{' '}
                        {Number(inv.total_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </Td>
                    <Td>
                      <StatusPill status={inv.payment_status || inv.status} />
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
                          onClick={() => sendMutation.mutate(inv.id)}
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
                        <IconButton
                          aria-label="Record payment"
                          onClick={() => {
                            setPaymentModalId(inv.id);
                            setPaymentAmount(inv.total_amount);
                          }}
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton aria-label="Duplicate">
                          <Copy className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          aria-label="More actions"
                          onClick={() =>
                            setActionMenuId(actionMenuId === inv.id ? null : inv.id)
                          }
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </IconButton>
                        {actionMenuId === inv.id && (
                          <div className="absolute right-0 top-9 z-20 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            {inv.status === 'draft' && (
                              <MenuItem
                                icon={Send}
                                onClick={() => {
                                  sendMutation.mutate(inv.id);
                                  setActionMenuId(null);
                                }}
                              >
                                Send Invoice
                              </MenuItem>
                            )}
                            {inv.status !== 'void' && inv.status !== 'paid' && (
                              <MenuItem
                                icon={Ban}
                                destructive
                                onClick={() => {
                                  voidMutation.mutate(inv.id);
                                  setActionMenuId(null);
                                }}
                              >
                                Void Invoice
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

      {paymentModalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPaymentModalId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">Record Payment</h3>
            <p className="mt-2 text-sm text-slate-500">
              Enter the amount received for this invoice.
            </p>
            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Amount Received
              </label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentModalId(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  paymentMutation.mutate({
                    invoiceId: paymentModalId,
                    amount: paymentAmount,
                  });
                  setPaymentModalId(null);
                }}
                disabled={paymentMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {paymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
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
    paid: {
      label: 'Paid',
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      dot: 'bg-emerald-600',
    },
    partial: {
      label: 'Partial',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      dot: 'bg-amber-600',
    },
    unpaid: {
      label: 'Unpaid',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      dot: 'bg-amber-600',
    },
    overdue: {
      label: 'Overdue',
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-600',
    },
    void: {
      label: 'Void',
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-600',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-600',
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

function CreateInvoiceForm({
  tenant,
  onBack,
}: {
  tenant: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('Invoice');
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('A00002');
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shipping, setShipping] = useState(false);
  const [currency, setCurrency] = useState('KES');
  const [lines, setLines] = useState<LineRequest[]>([emptyLine()]);
  const [summariseQty, setSummariseQty] = useState(false);
  const [showTotalInWords, setShowTotalInWords] = useState(true);
  const [showTotalInPdf, setShowTotalInPdf] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(true);

  const [adv, setAdv] = useState({
    displayUnitAs: 'Merge with quantity',
    showTaxSummary: 'Do not show',
    hidePlaceOfSupply: false,
    addOriginalImages: false,
    showThumbnails: false,
    showDescriptionFullWidth: false,
    hideSubtotalGroup: false,
    showSkuInInvoice: false,
    showSerialNumbers: false,
    displayBatchDetails: false,
  });

  const setAdvField = <K extends keyof typeof adv>(k: K, v: (typeof adv)[K]) =>
    setAdv((p) => ({ ...p, [k]: v }));

  const createMutation = useCreateInvoice(tenant);

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
      const taxRate = Number(l.tax_rate || 0);
      const amount = qty * rate;
      const tax = amount * (taxRate / 100);
      return { ...l, amount, tax, total: amount + tax };
    });
  }, [lines]);

  const totals = useMemo(() => {
    const amount = computed.reduce((s, l) => s + l.amount, 0);
    const tax = computed.reduce((s, l) => s + l.tax, 0);
    return { amount, tax, total: amount + tax };
  }, [computed]);

  const fmt = (n: number) =>
    `Ksh ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSave = useCallback(() => {
    if (!tenant) return;
    const body: CreateInvoiceRequest = {
      invoice_date: invoiceDate,
      due_date: showDueDate ? dueDate : invoiceDate,
      currency,
      lines: lines.filter((l) => l.description.trim()),
      metadata: {
        customer_name: customerName,
        customer_email: customerEmail,
        recurring,
      },
    };
    createMutation.mutate(body, {
      onSuccess: () => onBack(),
    });
  }, [
    tenant,
    invoiceDate,
    showDueDate,
    dueDate,
    currency,
    lines,
    customerName,
    customerEmail,
    recurring,
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
            Create New Invoice
          </h1>
          <ol className="mt-5 flex items-center justify-center gap-3">
            {[
              { n: 1, label: 'Add Invoice Details' },
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
                  Invoice No<span className="text-red-600">*</span>
                </label>
                <div>
                  <input
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full border-b border-slate-300 bg-transparent py-1 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Last No: A00001 (May 22, 2026)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="border-b border-dashed border-slate-300 pb-1 text-sm font-bold text-slate-900">
                  Invoice Date<span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full border-b border-slate-300 bg-transparent py-1 pr-7 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                  <Calendar className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {showDueDate ? (
                <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <label className="border-b border-dashed border-slate-300 pb-1 text-sm font-bold text-slate-900">
                    Due Date
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full border-b border-slate-300 bg-transparent py-1 pr-7 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                      <Calendar className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDueDate(false)}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove due date"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDueDate(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
                >
                  <Plus className="h-4 w-4" />
                  Add due date
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
            <PartyCard title="Billed By" subtitle="Your Details">
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

            <PartyCard title="Billed To" subtitle="Client's Details">
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
                        value={Number(l.tax_rate ?? 0)}
                        onChange={(e) => updateLine(idx, 'tax_rate', Number(e.target.value))}
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
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 transition-colors hover:text-slate-900"
                    >
                      Select Sales Ledger
                      <ChevronDown className="h-3 w-3" />
                    </button>
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

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ExtraAction icon={Pencil} label="Add Terms & Conditions" />
            <ExtraAction icon={Pencil} label="Add Notes" />
            <ExtraAction icon={Paperclip} label="Add Attachments" />
            <ExtraAction icon={Pencil} label="Add Additional Info" />
            <ExtraAction icon={Phone} label="Add Contact Details" />
          </div>

          <div className="mt-8 flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5">
            <button
              type="button"
              role="switch"
              aria-checked={recurring}
              onClick={() => setRecurring((p) => !p)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2',
                recurring ? 'bg-slate-900' : 'bg-slate-300',
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  recurring ? 'translate-x-5' : 'translate-x-0.5',
                )}
              />
            </button>
            <div>
              <p className="text-sm font-bold text-slate-900">
                This is a Recurring invoice
              </p>
              <p className="mt-1 text-xs text-slate-500">
                A draft invoice will be created with the same details every next period.
              </p>
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
                    label="Show SKU in Invoice"
                    checked={adv.showSkuInInvoice}
                    onChange={(v) => setAdvField('showSkuInInvoice', v)}
                  />
                  <AdvancedCheckbox
                    label="Show Serial Numbers in Invoice"
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
              onClick={() => setStep(2)}
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
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

function ManageClientsTab({ onAddClient }: { onAddClient: () => void }) {
  const [subTab, setSubTab] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
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
              onClick={onAddClient}
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
          <span className="-mb-px border-b-2 border-slate-900 px-1 py-3 text-sm font-semibold text-slate-900">
            All Clients
          </span>
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
            <button
              type="button"
              onClick={() => setSubTab('active')}
              className={cn(
                'border-b-2 pb-2 text-sm font-semibold transition-colors',
                subTab === 'active'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              )}
            >
              Active Clients
            </button>
            <button
              type="button"
              onClick={() => setSubTab('archived')}
              className={cn(
                'border-b-2 pb-2 text-sm font-semibold transition-colors',
                subTab === 'archived'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              )}
            >
              Archived Clients
            </button>
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
                  <button
                    type="button"
                    onClick={onAddClient}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add Client
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="hidden text-xs text-slate-500">
        <Star className="h-3 w-3" />
        <ArchiveRestore className="h-3 w-3" />
      </div>
    </div>
  );
}

function AddClientForm({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState({
    basic: true,
    tax: true,
    address: true,
    linked: true,
    shipping: true,
    additional: true,
    attachments: true,
    account: true,
  });
  type SectionKey = keyof typeof open;
  const toggle = (k: SectionKey) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  const [logo, setLogo] = useState<File | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [city, setCity] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [addrCountry, setAddrCountry] = useState('Kenya');
  const [stateProv, setStateProv] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [businessAlias, setBusinessAlias] = useState('');
  const [uniqueKey] = useState(() => String(Date.now()).padStart(13, '0'));
  const [email, setEmail] = useState('');
  const [showEmailInInvoice, setShowEmailInInvoice] = useState(false);
  const [phone, setPhone] = useState('');
  const [showPhoneInInvoice, setShowPhoneInInvoice] = useState(false);
  const [defaultDueDate, setDefaultDueDate] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');

  const [shipName, setShipName] = useState('');
  const [shipCountry, setShipCountry] = useState('');
  const [shipState, setShipState] = useState('');
  const [shipCity, setShipCity] = useState('');
  const [shipPostal, setShipPostal] = useState('');
  const [shipStreet, setShipStreet] = useState('');

  const copyFromBilling = () => {
    setShipCountry(addrCountry);
    setShipState(stateProv);
    setShipCity(addrCity);
    setShipPostal(postalCode);
    setShipStreet(streetAddress);
  };

  const logoUrl = useMemo(
    () => (logo ? URL.createObjectURL(logo) : null),
    [logo],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-200"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-slate-900 transition-colors"
            >
              Your Clients
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900">New</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Basic Information"
            open={open.basic}
            onToggle={() => toggle('basic')}
          />
          {open.basic && (
            <div className="mt-4 space-y-5">
              <label className="flex aspect-[7/1] min-h-[140px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition-colors hover:border-slate-400 hover:bg-slate-100">
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoUrl}
                    alt="Uploaded logo"
                    className="max-h-32 object-contain"
                  />
                ) : (
                  <>
                    <Plus className="h-7 w-7 text-slate-500" />
                    <p className="mt-2 text-sm font-bold text-slate-900">Upload Logo</p>
                    <p className="mt-1 text-xs text-slate-500">
                      JPG or PNG, Dimensions 1080x1080px and file size up to 20MB
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                />
              </label>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FieldRow label="Business Name" required>
                  <Input
                    placeholder="Business Name (Required)"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Client Industry">
                  <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    <option value="">-Select an Industry-</option>
                    <option>Agriculture</option>
                    <option>Construction</option>
                    <option>Education</option>
                    <option>Financial Services</option>
                    <option>Healthcare</option>
                    <option>IT Services</option>
                    <option>Manufacturing</option>
                    <option>Non-profit</option>
                    <option>Retail</option>
                    <option>Other</option>
                  </Select>
                </FieldRow>
                <FieldRow label="Select Country" required>
                  <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option>Kenya</option>
                    <option>Uganda</option>
                    <option>Tanzania</option>
                    <option>Rwanda</option>
                    <option>South Africa</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                  </Select>
                </FieldRow>
                <FieldRow label="City/Town">
                  <Input
                    placeholder="City/Town Name"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </FieldRow>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Tax Information"
            optional
            open={open.tax}
            onToggle={() => toggle('tax')}
          />
          {open.tax && (
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
              <span className="border-b border-dashed border-slate-300 pb-1 text-sm font-bold text-slate-900">
                VAT Number
              </span>
              <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Address"
            optional
            open={open.address}
            onToggle={() => toggle('address')}
          />
          {open.address && (
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldRow label="Select Country">
                <Select
                  value={addrCountry}
                  onChange={(e) => setAddrCountry(e.target.value)}
                >
                  <option>Kenya</option>
                  <option>Uganda</option>
                  <option>Tanzania</option>
                </Select>
              </FieldRow>
              <FieldRow label="State / Province">
                <Input
                  placeholder="Select State / Province"
                  value={stateProv}
                  onChange={(e) => setStateProv(e.target.value)}
                />
              </FieldRow>
              <FieldRow label="City/Town">
                <Input
                  placeholder="City/Town Name"
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Postal Code / Zip Code">
                <Input
                  placeholder="Postal Code / Zip Code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </FieldRow>
              <div className="md:col-span-2">
                <FieldRow label="Street Address">
                  <Input
                    placeholder="Street Address"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                  />
                </FieldRow>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <button
            type="button"
            onClick={() => toggle('linked')}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">Linked Contacts</span>
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-700">
                0
              </span>
            </div>
            <ChevronDown
              className={cn(
                'h-5 w-5 text-slate-500 transition-transform',
                open.linked && 'rotate-180',
              )}
            />
          </button>
          {open.linked && (
            <div className="mt-4 space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 transition-colors hover:text-slate-700"
                >
                  <Plus className="h-4 w-4" />
                  Link Contact
                </button>
              </div>
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No contacts linked yet
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Shipping Details"
            optional
            open={open.shipping}
            onToggle={() => toggle('shipping')}
          />
          {open.shipping && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-700">
                Add a primary Shipping Detail for this service
              </p>
              <button
                type="button"
                onClick={copyFromBilling}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 transition-colors hover:text-slate-700"
              >
                <Copy className="h-4 w-4" />
                Copy From Billing Address
              </button>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FieldRow label="Name">
                  <Input
                    placeholder="Name"
                    value={shipName}
                    onChange={(e) => setShipName(e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Select Country">
                  <Select
                    value={shipCountry}
                    onChange={(e) => setShipCountry(e.target.value)}
                  >
                    <option value="">Select Shipping Country</option>
                    <option>Kenya</option>
                    <option>Uganda</option>
                    <option>Tanzania</option>
                  </Select>
                </FieldRow>
                <FieldRow label="State">
                  <Input
                    placeholder="State"
                    value={shipState}
                    onChange={(e) => setShipState(e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="City/Town">
                  <Input
                    placeholder="City/Town Name"
                    value={shipCity}
                    onChange={(e) => setShipCity(e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Postal Code / Zip Code">
                  <Input
                    placeholder="Postal Code / Zip Code"
                    value={shipPostal}
                    onChange={(e) => setShipPostal(e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Street Address">
                  <Input
                    placeholder="Street Address"
                    value={shipStreet}
                    onChange={(e) => setShipStreet(e.target.value)}
                  />
                </FieldRow>
              </div>
              <p className="pt-2 text-sm text-slate-700">
                Have multiple Shipping Addresses? Add here
              </p>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                Add Shipping Detail
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Additional Details"
            optional
            open={open.additional}
            onToggle={() => toggle('additional')}
          />
          {open.additional && (
            <div className="mt-4 space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FieldRow label="Business Alias">
                  <Input
                    placeholder="Business Alias"
                    value={businessAlias}
                    onChange={(e) => setBusinessAlias(e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Unique Key">
                  <Input value={uniqueKey} readOnly />
                </FieldRow>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Email</label>
                  <p className="text-[11px] text-slate-500">
                    Add to directly email documents from Refrens
                  </p>
                  <Input
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={showEmailInInvoice}
                      onChange={(e) => setShowEmailInInvoice(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    Show Email in Invoice
                  </label>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Phone No.
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Add to directly WhatsApp documents from Refrens
                  </p>
                  <Input
                    placeholder="+254"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={showPhoneInInvoice}
                      onChange={(e) => setShowPhoneInInvoice(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    Show Phone in Invoice
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Default Due Date (Days)
                </label>
                <p className="text-[11px] text-slate-500">
                  Documents for this client/vendor will default to this due date unless
                  manually changed
                </p>
                <Input
                  placeholder="e.g., 30"
                  value={defaultDueDate}
                  onChange={(e) => setDefaultDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Payment Account
                </label>
                <p className="text-[11px] text-slate-500">
                  Default account displayed on invoices for this client
                </p>
                <Select
                  value={paymentAccount}
                  onChange={(e) => setPaymentAccount(e.target.value)}
                >
                  <option value="">Select Payment Account</option>
                </Select>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
              >
                <Plus className="h-4 w-4" />
                Add Custom Fields
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Attachments"
            optional
            open={open.attachments}
            onToggle={() => toggle('attachments')}
          />
          {open.attachments && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Add Attachments</p>
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-100">
                <Plus className="h-6 w-6" />
                <input type="file" className="hidden" multiple />
              </label>
              <p className="text-[11px] text-slate-500">
                <Upload className="mr-1 inline h-3 w-3 rotate-180" />
                Click to attach files
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            title="Account Details"
            optional
            open={open.account}
            onToggle={() => toggle('account')}
          />
          {open.account && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Enable Advanced Accounting to create or link ledger.{' '}
              <button
                type="button"
                className="font-semibold text-slate-900 underline transition-colors hover:text-slate-700"
              >
                Enable Now
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={!businessName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  optional,
  open,
  onToggle,
}: {
  title: string;
  optional?: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between text-left"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-base font-bold text-slate-900">{title}</span>
        {optional && (
          <span className="text-xs font-medium text-slate-500">(optional)</span>
        )}
      </div>
      <ChevronDown
        className={cn(
          'h-5 w-5 text-slate-500 transition-transform',
          open && 'rotate-180',
        )}
      />
    </button>
  );
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-900">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900',
        props.className,
      )}
    />
  );
}

function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          'w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900',
          props.className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

function ScannedDocumentsTab() {
  const [docType, setDocType] = useState<'all' | 'invoices' | 'purchases'>('all');
  const [status, setStatus] = useState<'all' | 'scanned' | 'failed' | 'added'>(
    'all',
  );
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Codevertex IT Solutions</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Scanned Documents</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-slate-900">Scanned Documents</h2>
          <Lightbulb className="h-5 w-5 text-amber-500" />
        </div>
        <div className="mt-4 flex items-center gap-6 border-b border-slate-200">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'invoices', label: 'Invoices' },
              { key: 'purchases', label: 'Purchases' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setDocType(t.key)}
              className={cn(
                '-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors',
                docType === t.key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-6">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'scanned', label: 'Scanned' },
                { key: 'failed', label: 'Failed' },
                { key: 'added', label: 'Added' },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStatus(s.key)}
                className={cn(
                  'border-b-2 pb-2 text-sm font-semibold transition-colors',
                  status === s.key
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-900',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="Search by source"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500">
          <span>
            <span className="font-bold text-slate-900">No</span> Document{' '}
            <span className="font-bold text-slate-900">Found</span>
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
                <Th sortable>Source File</Th>
                <Th>Document Number</Th>
                <Th>Uploaded By</Th>
                <Th sortable>Uploaded On</Th>
                <Th>Document Type</Th>
                <Th>Status</Th>
                <Th>Action</Th>
                <Th>Linked To</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-5 py-20 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Inbox className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">No Data</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          <span>
            <span className="font-bold text-slate-900">No</span> Document{' '}
            <span className="font-bold text-slate-900">Found</span>
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            <Columns3 className="h-4 w-4" />
            Show/Hide Columns
          </button>
        </div>
      </div>
    </div>
  );
}

function SuggestedInvoiceTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Codevertex IT Solutions</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Invoice Suggestion</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          Please verify email to unlock invoice suggestions.
        </p>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mr-1 inline h-4 w-4 align-text-bottom" />
          Your email is currently blocked and will no longer be used to send
          emails.{' '}
          <button
            type="button"
            className="font-semibold text-amber-900 underline transition-colors hover:text-amber-700"
          >
            Re-verify your email to resume sending &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportsDropdown({
  activeReport,
  onSelect,
}: {
  activeReport: ReportType | null;
  onSelect: (r: ReportType) => void;
}) {
  const [open, setOpen] = useState(false);
  const options: { key: ReportType; label: string }[] = [
    { key: 'client', label: 'Client Report' },
    { key: 'tag-wise', label: 'Tag Wise Report' },
    { key: 'project-pnl', label: 'Project-wise P&L' },
    { key: 'payment', label: 'Payment Report' },
    { key: 'tds', label: 'TDS Report' },
    { key: 'tax', label: 'TAX Report' },
    { key: 'line-item', label: 'Line Item Report' },
    { key: 'hsn', label: 'HSN Report' },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          '-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors',
          activeReport
            ? 'border-slate-900 text-slate-900'
            : 'border-transparent text-slate-500 hover:text-slate-900',
        )}
      >
        Reports & More
        <ChevronDown
          className={cn(
            'ml-1 inline h-3.5 w-3.5 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  onSelect(o.key);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium transition-colors',
                  activeReport === o.key
                    ? 'bg-slate-900/5 text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReportView({ type }: { type: ReportType }) {
  switch (type) {
    case 'client':
      return <ClientReportTab />;
    case 'tag-wise':
      return <TagWiseReportTab />;
    case 'project-pnl':
      return <ProjectPnlReportTab />;
    case 'payment':
      return <PaymentReportTab />;
    case 'tds':
      return <TdsReportTab />;
    case 'tax':
      return <TaxReportTab />;
    case 'line-item':
      return <LineItemReportTab />;
    case 'hsn':
      return <HsnReportTab />;
  }
}

function ReportCard({
  title,
  withLightbulb,
  filters,
  tableHeaders,
  tableEmptyMessage = 'No Records Found',
}: {
  title: string;
  withLightbulb?: boolean;
  filters?: React.ReactNode;
  tableHeaders: { label: string; sortable?: boolean; align?: 'left' | 'right' }[];
  tableEmptyMessage?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        {withLightbulb && <Lightbulb className="h-5 w-5 text-amber-500" />}
      </div>

      {filters && <div className="mt-5">{filters}</div>}

      <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
        <span>
          <span className="font-bold text-slate-900">No</span> Records{' '}
          <span className="font-bold text-slate-900">Found</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            <Columns3 className="h-4 w-4" />
            Show/Hide Columns
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              {tableHeaders.map((h, i) => (
                <Th key={i} sortable={h.sortable} align={h.align ?? 'left'}>
                  {h.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={tableHeaders.length} className="px-5 py-20 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Inbox className="h-7 w-7" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {tableEmptyMessage}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DateRangeField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
      )}
      <div className="relative w-72">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  );
}

function StatusPills({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
            value === s
              ? 'border-slate-900 bg-slate-900/5 text-slate-900'
              : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50',
          )}
        >
          {value === s && <ChevronRight className="hidden h-3 w-3" aria-hidden />}
          {value === s && <span className="text-slate-900">✓</span>}
          {s}
        </button>
      ))}
    </div>
  );
}

function TypeToggle({
  value,
  onChange,
}: {
  value: 'all' | 'invoices' | 'proforma';
  onChange: (v: 'all' | 'invoices' | 'proforma') => void;
}) {
  const options: { key: 'all' | 'invoices' | 'proforma'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'proforma', label: 'Proforma Invoice' },
  ];
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            value === o.key
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:text-slate-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ClientReportTab() {
  const [date, setDate] = useState('Feb 26, 2026 - May 26, 2026');
  return (
    <ReportCard
      title="Clients Report"
      filters={<DateRangeField label="Date" value={date} onChange={setDate} />}
      tableHeaders={[
        { label: '' },
        { label: 'Client' },
        { label: 'Last Invoice Date' },
        { label: 'Total Invoices' },
        { label: 'Total Invoiced Amount', align: 'right' },
        { label: 'Pending Amount', align: 'right' },
        { label: 'Net Due Amount', align: 'right' },
        { label: 'Total Used Credit', align: 'right' },
        { label: 'Total Available Credit', align: 'right' },
        { label: 'TDS Deducted', align: 'right' },
        { label: 'Total TAX', align: 'right' },
        { label: 'Avg Paying Date' },
      ]}
    />
  );
}

function TagWiseReportTab() {
  const [date, setDate] = useState('Feb 26, 2026 - May 26, 2026');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState<'all' | 'invoices' | 'proforma'>('invoices');
  return (
    <ReportCard
      title="Tag Wise Report"
      filters={
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <DateRangeField label="Invoice Date" value={date} onChange={setDate} />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Type</label>
              <TypeToggle value={type} onChange={setType} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Select Invoice Status
            </label>
            <div className="mt-2">
              <StatusPills
                options={['All', 'Paid', 'Unpaid', 'Overdue', 'Partial', 'Canceled']}
                value={status}
                onChange={setStatus}
              />
            </div>
          </div>
        </div>
      }
      tableHeaders={[
        { label: 'Tag Name', sortable: true },
        { label: 'Last Invoice Date', sortable: true },
        { label: 'Total Invoice', sortable: true, align: 'right' },
        { label: 'Total Invoice Amount', sortable: true, align: 'right' },
        { label: 'Total Amount Due', sortable: true, align: 'right' },
        { label: 'TDS Deducted', sortable: true, align: 'right' },
        { label: 'Total GST', sortable: true, align: 'right' },
      ]}
      tableEmptyMessage="No Data"
    />
  );
}

function ProjectPnlReportTab() {
  const [date, setDate] = useState('Feb 26, 2026 - May 26, 2026');
  const [status, setStatus] = useState('All');
  const [graphOpen, setGraphOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-bold text-slate-900">Project-wise P&L Report</h3>
        <Lightbulb className="h-5 w-5 text-amber-500" />
      </div>

      <div className="mt-5 space-y-5">
        <DateRangeField label="Date" value={date} onChange={setDate} />
        <div>
          <label className="block text-xs font-semibold text-slate-700">Select Status</label>
          <div className="mt-2">
            <StatusPills
              options={['All', 'Paid', 'Unpaid', 'Overdue', 'Partial', 'Canceled']}
              value={status}
              onChange={setStatus}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setGraphOpen((p) => !p)}
          className="flex w-full items-center gap-2 bg-slate-50 px-5 py-3 text-left transition-colors hover:bg-slate-100"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 text-slate-500 transition-transform',
              graphOpen && 'rotate-90',
            )}
          />
          <span className="text-sm font-bold text-slate-900">Graph</span>
        </button>
        {graphOpen && (
          <div className="flex h-48 items-center justify-center border-t border-slate-200 bg-white text-sm text-slate-500">
            Chart will render here
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
        <span>
          <span className="font-bold text-slate-900">No</span> Records{' '}
          <span className="font-bold text-slate-900">Found</span>
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
        >
          <Columns3 className="h-4 w-4" />
          Show/Hide Columns
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <Th>
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" />
              </Th>
              <Th sortable>Tag Name</Th>
              <Th sortable>Last Invoice Date</Th>
              <Th sortable>Last Expenditure Date</Th>
              <Th sortable align="right">
                Total Invoices
              </Th>
              <Th sortable align="right">
                Total Expenditures
              </Th>
              <Th sortable align="right">
                Total Invoice Amount
              </Th>
              <Th sortable align="right">
                Total Expenditure Amount
              </Th>
              <Th sortable align="right">
                Total Sales Gst
              </Th>
              <Th sortable align="right">
                Total Purchase Gst
              </Th>
              <Th sortable align="right">
                Amount Due to be Received
              </Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={11} className="px-5 py-20 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Inbox className="h-7 w-7" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">No Data</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentReportTab() {
  const [client, setClient] = useState('All Clients');
  const [date, setDate] = useState('February 26, 2026 - May 26, 2026');

  return (
    <ReportCard
      title="Payment Report"
      filters={
        <div className="space-y-5">
          <div className="relative w-80">
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              <option>All Clients</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
          <DateRangeField label="Payment Date" value={date} onChange={setDate} />
        </div>
      }
      tableHeaders={[
        { label: 'Date', sortable: true },
        { label: 'Client' },
        { label: 'Payment ID' },
        { label: 'Invoice', sortable: true },
        { label: 'Payment Mode', sortable: true },
        { label: 'Status', sortable: true },
        { label: 'Payment Received', sortable: true, align: 'right' },
        { label: 'Payment Received in KES', sortable: true, align: 'right' },
        { label: 'Notes' },
      ]}
      tableEmptyMessage="No Data"
    />
  );
}

function TdsReportTab() {
  const [client, setClient] = useState('All Clients');
  const [date, setDate] = useState('Feb 26, 2026 - May 26, 2026');
  const [type, setType] = useState<'all' | 'invoices' | 'proforma'>('all');

  return (
    <ReportCard
      title="TDS Report"
      filters={
        <div className="space-y-5">
          <div className="relative w-80">
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              <option>All Clients</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <DateRangeField label="Invoice Date" value={date} onChange={setDate} />
            <TypeToggle value={type} onChange={setType} />
          </div>
        </div>
      }
      tableHeaders={[
        { label: 'Date', sortable: true },
        { label: 'Invoice', sortable: true },
        { label: 'Billed To', sortable: true },
        { label: 'PAN Number', sortable: true },
        { label: 'Status', sortable: true },
        { label: 'Invoiced Amount', sortable: true, align: 'right' },
        { label: 'TDS', sortable: true, align: 'right' },
        { label: 'TDS Certificate' },
      ]}
      tableEmptyMessage="No Data"
    />
  );
}

function TaxReportTab() {
  const [client, setClient] = useState('All Clients');
  const [date, setDate] = useState('Feb 26, 2026 - May 26, 2026');
  const [type, setType] = useState<'all' | 'invoices' | 'proforma'>('all');
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-slate-900">TAX Report</h3>
        <div className="flex items-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-l-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Download As
          </button>
          <button
            type="button"
            className="rounded-r-lg border border-l-0 border-slate-300 bg-white px-3 py-2 text-slate-900 transition-colors hover:bg-slate-50"
            aria-label="More download options"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setFiltersOpen((p) => !p)}
          className="flex w-full items-center gap-2 px-5 py-3 text-left transition-colors hover:bg-slate-100"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-500 transition-transform',
              !filtersOpen && '-rotate-90',
            )}
          />
          <span className="text-sm font-bold text-slate-900">Filters</span>
        </button>
        {filtersOpen && (
          <div className="space-y-4 border-t border-slate-200 bg-white px-5 py-5">
            <div className="relative w-80">
              <select
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option>All Clients</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <DateRangeField label="Invoice Date" value={date} onChange={setDate} />
              <TypeToggle value={type} onChange={setType} />
            </div>
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              TAX chart will render here
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <span className="font-bold text-slate-900">0</span> of{' '}
          <span className="font-bold text-slate-900">0</span> Records
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50"
        >
          <Columns3 className="h-4 w-4" />
          Show/Hide Columns
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <Th sortable>Date</Th>
              <Th sortable>Invoice</Th>
              <Th sortable>Billed To</Th>
              <Th sortable align="right">
                Invoiced Amount
              </Th>
              <Th>Currency</Th>
              <Th align="right">TAX</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-5 py-20 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Inbox className="h-7 w-7" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">No Data</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LineItemReportTab() {
  const [date, setDate] = useState('Feb 26, 2026 - May 26, 2026');
  const [type, setType] = useState<'all' | 'invoices' | 'proforma'>('invoices');

  return (
    <ReportCard
      title="Line Item Report"
      filters={
        <div className="flex flex-wrap items-end justify-between gap-4">
          <DateRangeField label="Invoice Date" value={date} onChange={setDate} />
          <TypeToggle value={type} onChange={setType} />
        </div>
      }
      tableHeaders={[
        { label: '' },
        { label: 'Item Name' },
        { label: 'Invoices', sortable: true, align: 'right' },
        { label: 'Sold Quantity', sortable: true, align: 'right' },
        { label: 'Unit' },
        { label: 'Average Rate', sortable: true, align: 'right' },
        { label: 'Total Amount', sortable: true, align: 'right' },
        { label: 'Tax Amount', align: 'right' },
        { label: 'Total Amount (With Tax)', sortable: true, align: 'right' },
      ]}
      tableEmptyMessage="No Data"
    />
  );
}

function HsnReportTab() {
  const [date, setDate] = useState('Feb 26, 2026 - May 26, 2026');
  const [type, setType] = useState<'all' | 'invoices' | 'proforma'>('all');

  return (
    <ReportCard
      title="HSN Report"
      filters={
        <div className="flex flex-wrap items-end justify-between gap-4">
          <DateRangeField label="Invoice Date" value={date} onChange={setDate} />
          <TypeToggle value={type} onChange={setType} />
        </div>
      }
      tableHeaders={[
        { label: 'HSN Code', sortable: true },
        { label: 'Description' },
        { label: 'Total Invoices', sortable: true, align: 'right' },
        { label: 'Total Quantity', sortable: true, align: 'right' },
        { label: 'Total Value', sortable: true, align: 'right' },
        { label: 'Total Tax', sortable: true, align: 'right' },
      ]}
      tableEmptyMessage="No Data"
    />
  );
}

function RefrensPaymentsTab() {
  const subTabs = [
    'All Payment Accounts',
    'Bank Accounts',
    'Employee Accounts',
    'Bank Reconciliation',
    'Refrens Payments',
  ];
  const [active, setActive] = useState('Refrens Payments');

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Codevertex IT Solutions</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Refrens Payments</span>
        </div>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">Refrens Payments</h2>
        <div className="mt-4 flex flex-wrap items-center gap-6 border-b border-slate-200">
          {subTabs.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setActive(label)}
              className={cn(
                '-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors',
                active === label
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">
          Codevertex IT Solutions Bank and Online Transactions
        </h3>
        <div className="mt-6">
          <p className="text-3xl font-bold text-slate-900">--</p>
          <p className="mt-1 text-sm text-slate-500">Last settlement date</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="border-b border-dashed border-slate-300 pb-1 text-base font-bold text-slate-900 inline-block">
            Invoices with payments
          </h3>
        </div>

        <div className="bg-slate-50 px-6 py-3 text-xs text-slate-500">
          <span className="font-bold text-slate-900">No</span> Records{' '}
          <span className="font-bold text-slate-900">Found</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-white text-slate-500">
                <Th>Invoice</Th>
                <Th>Payment date</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Amount in KES</Th>
                <Th>Status</Th>
                <Th>
                  <span className="inline-flex items-center gap-1 text-slate-900">
                    <Plus className="h-3.5 w-3.5" />
                    Payment Breakdown
                  </span>
                </Th>
                <Th>Settlement</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-5 py-20 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Inbox className="h-7 w-7" />
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
