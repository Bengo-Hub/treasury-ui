'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useOrgBranding } from '@/hooks/use-org-branding';
import { useBills } from '@/hooks/use-bills';
import type { Bill } from '@/lib/api/bills';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronRight,
  Columns3,
  Download,
  Filter,
  Inbox,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

interface VendorSummary {
  name: string;
  industry: string;
  phone: string;
  email: string;
  country: string;
  billCount: number;
  totalAmount: number;
  outstanding: number;
  currency: string;
  lastCommunication: string;
  /** A vendor is archived when every one of its bills is cancelled. */
  archived: boolean;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  pending: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'outline',
};

type ColumnKey =
  | 'logo'
  | 'name'
  | 'industry'
  | 'phone'
  | 'email'
  | 'country'
  | 'status'
  | 'lastComm';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  /** Columns that cannot be hidden. */
  locked?: boolean;
  align?: 'left' | 'right' | 'center';
}

const COLUMNS: ColumnDef[] = [
  { key: 'logo', label: 'Logo', locked: true },
  { key: 'name', label: 'Name', locked: true },
  { key: 'industry', label: 'Industry' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'country', label: 'Country' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'lastComm', label: 'Last Communication Date', align: 'right' },
];

type SortKey = 'name' | 'total' | 'lastComm';

const EMPTY = '—';

export default function VendorsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const { data: brand } = useOrgBranding(orgSlug);
  const orgName = brand?.orgName || brand?.name || 'Workspace';

  const [topTab, setTopTab] = useState<'all' | 'reports'>('all');
  const [archivedTab, setArchivedTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  const { data, isLoading, error } = useBills(effectiveTenant, {}, !!effectiveTenant);
  const bills = useMemo(() => data?.bills ?? [], [data]);

  // Derive vendors from bill history (no dedicated vendor service yet).
  const vendors = useMemo(() => {
    const map = new Map<string, VendorSummary & { _allCancelled: boolean }>();
    bills.forEach((bill: Bill) => {
      const name = bill.vendor_name || 'Unknown Vendor';
      const amount = parseFloat(bill.total_amount) || 0;
      const isCancelled = bill.status === 'cancelled';
      const isOutstanding = ['pending', 'overdue', 'draft'].includes(bill.status);
      const meta = bill.metadata ?? {};
      const existing = map.get(name);
      if (existing) {
        existing.billCount += 1;
        existing.totalAmount += amount;
        if (isOutstanding) existing.outstanding += amount;
        existing._allCancelled = existing._allCancelled && isCancelled;
        if (bill.created_at > existing.lastCommunication) {
          existing.lastCommunication = bill.created_at;
        }
      } else {
        map.set(name, {
          name,
          industry: (meta.industry as string) || '',
          phone: (meta.vendor_phone as string) || '',
          email: (meta.vendor_email as string) || '',
          country: (meta.country as string) || '',
          billCount: 1,
          totalAmount: amount,
          outstanding: isOutstanding ? amount : 0,
          currency: bill.currency || 'KES',
          lastCommunication: bill.created_at,
          archived: false,
          _allCancelled: isCancelled,
        });
      }
    });
    return Array.from(map.values()).map(({ _allCancelled, ...v }) => ({
      ...v,
      archived: _allCancelled,
    }));
  }, [bills]);

  const currencies = useMemo(
    () => Array.from(new Set(vendors.map((v) => v.currency))).sort(),
    [vendors],
  );

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) + (currencyFilter !== 'all' ? 1 : 0);

  const filteredVendors = useMemo(() => {
    let list = vendors.filter((v) =>
      archivedTab === 'archived' ? v.archived : !v.archived,
    );

    if (currencyFilter !== 'all') {
      list = list.filter((v) => v.currency === currencyFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.industry.toLowerCase().includes(q),
      );
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortKey === 'lastComm') {
        return (a.lastCommunication < b.lastCommunication ? -1 : 1) * dir;
      }
      return (a.totalAmount - b.totalAmount) * dir;
    });
  }, [vendors, archivedTab, currencyFilter, searchQuery, sortKey, sortDir]);

  const visibleColumns = COLUMNS.filter((c) => !hiddenColumns.has(c.key));

  const toggleColumn = (key: ColumnKey) =>
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setCurrencyFilter('all');
  };

  const downloadCSV = () => {
    const headers = ['Name', 'Industry', 'Phone', 'Email', 'Country', 'Bills', 'Total Billed', 'Currency', 'Status', 'Last Communication'];
    const rows = filteredVendors.map((v) => [
      v.name,
      v.industry || '',
      v.phone || '',
      v.email || '',
      v.country || '',
      String(v.billCount),
      v.totalAmount.toFixed(2),
      v.currency,
      v.archived ? 'Archived' : 'Active',
      v.lastCommunication ? new Date(v.lastCommunication).toLocaleDateString() : '',
    ]);
    const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors-${orgSlug || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Vendor detail (bill history) ----
  const vendorBills = useMemo(() => {
    if (!selectedVendor) return [];
    return bills.filter(
      (b: Bill) => (b.vendor_name || 'Unknown Vendor') === selectedVendor,
    );
  }, [bills, selectedVendor]);

  if (selectedVendor) {
    const vendor = vendors.find((v) => v.name === selectedVendor);
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{selectedVendor}</h1>
            <p className="text-muted-foreground mt-1">Bill history for this vendor.</p>
          </div>
        </div>

        {vendor && (
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Total Billed', value: formatCurrency(vendor.totalAmount, vendor.currency) },
              { label: 'Outstanding', value: formatCurrency(vendor.outstanding, vendor.currency) },
              { label: 'Bills', value: String(vendor.billCount) },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">{label}</p>
                  <p className="text-2xl font-black">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Bill #</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Due Date</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendorBills.map((bill: Bill) => (
                    <tr key={bill.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{bill.bill_number}</td>
                      <td className="px-6 py-4 text-right font-bold text-xs">{bill.currency} {bill.total_amount}</td>
                      <td className="px-6 py-4 text-xs">{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusVariant[bill.status] ?? 'outline'}>{bill.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vendorBills.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">No bills found for this vendor.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalBilled = vendors.reduce((sum, v) => sum + v.totalAmount, 0);
  const totalOutstanding = vendors.reduce((sum, v) => sum + v.outstanding, 0);
  const reportCurrency = vendors[0]?.currency ?? 'KES';

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="truncate max-w-[200px]">{orgName}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-foreground">Manage Vendors</span>
      </nav>

      {/* Title + primary action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Manage Vendors</h1>
        <Button variant="primary" onClick={() => router.push(`/${orgSlug}/vendors/new`)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Vendor
        </Button>
      </div>

      {/* Top tabs */}
      <div className="flex items-center gap-6 border-b border-border">
        {([
          { key: 'all', label: 'All Vendors' },
          { key: 'reports', label: 'Reports and More' },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTopTab(t.key)}
            className={cn(
              'relative -mb-px py-2.5 text-sm font-medium transition-colors',
              topTab === t.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-10 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above to view their vendors.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load vendors. Check your connection and try again.
        </div>
      )}

      {topTab === 'reports' ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Vendors', value: String(vendors.length) },
            { label: 'Total Billed', value: formatCurrency(totalBilled, reportCurrency) },
            { label: 'Outstanding', value: formatCurrency(totalOutstanding, reportCurrency) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Active / Archived sub-tabs */}
            <div className="flex items-center gap-6 px-6 pt-4 border-b border-border">
              {([
                { key: 'active', label: 'Active Vendors' },
                { key: 'archived', label: 'Archived Vendors' },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setArchivedTab(t.key)}
                  className={cn(
                    'relative -mb-px py-2.5 text-sm font-medium transition-colors',
                    archivedTab === t.key
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Toolbar: CSV + search */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end px-6 py-4">
              <Button variant="outline" size="sm" onClick={downloadCSV} disabled={filteredVendors.length === 0}>
                <Download className="h-4 w-4 mr-1.5" />
                Download CSV
              </Button>
              <div className="relative w-full sm:max-w-xs group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  placeholder="Search Vendors"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-4 px-6 pb-2">
              <button
                type="button"
                onClick={() => setShowFilters((s) => !s)}
                className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <ChevronRight className={cn('h-4 w-4 transition-transform', showFilters && 'rotate-90')} />
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <X className="h-3.5 w-3.5" />
                Clear All Filters
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap items-end gap-4 px-6 pb-4 pt-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Currency
                  </span>
                  <select
                    value={currencyFilter}
                    onChange={(e) => setCurrencyFilter(e.target.value)}
                    className="bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="all">All currencies</option>
                    {currencies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {/* Count + Show/Hide columns */}
            <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{filteredVendors.length}</span>{' '}
                Vendor{filteredVendors.length !== 1 ? 's' : ''} Found
              </p>
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setShowColumnMenu((s) => !s)}>
                  <Columns3 className="h-4 w-4 mr-1.5" />
                  Show/Hide Columns
                </Button>
                {showColumnMenu && (
                  <>
                    <button
                      type="button"
                      aria-label="Close column menu"
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setShowColumnMenu(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg p-2">
                      {COLUMNS.map((col) => (
                        <label
                          key={col.key}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm',
                            col.locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/40 cursor-pointer',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={!hiddenColumns.has(col.key)}
                            disabled={col.locked}
                            onChange={() => toggleColumn(col.key)}
                            className="accent-primary"
                          />
                          {col.label}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    {visibleColumns.map((col) => {
                      const sortable = col.key === 'name' || col.key === 'lastComm';
                      const sortFor: SortKey | null =
                        col.key === 'name' ? 'name' : col.key === 'lastComm' ? 'lastComm' : null;
                      return (
                        <th
                          key={col.key}
                          className={cn(
                            'px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center',
                            (!col.align || col.align === 'left') && 'text-left',
                          )}
                        >
                          {sortable && sortFor ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(sortFor)}
                              className={cn(
                                'inline-flex items-center gap-1 hover:text-foreground transition-colors',
                                col.align === 'right' && 'flex-row-reverse',
                              )}
                            >
                              {col.label}
                              <ArrowUpDown className={cn('h-3 w-3', sortKey === sortFor && 'text-primary')} />
                            </button>
                          ) : (
                            col.label
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!isLoading &&
                    filteredVendors.map((vendor) => (
                      <tr
                        key={vendor.name}
                        onClick={() => setSelectedVendor(vendor.name)}
                        className="hover:bg-accent/5 transition-colors cursor-pointer group"
                      >
                        {visibleColumns.map((col) => {
                          switch (col.key) {
                            case 'logo':
                              return (
                                <td key={col.key} className="px-6 py-3">
                                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-sm">
                                    {vendor.name.charAt(0).toUpperCase()}
                                  </div>
                                </td>
                              );
                            case 'name':
                              return (
                                <td key={col.key} className="px-6 py-3">
                                  <span className="font-bold group-hover:text-primary transition-colors">{vendor.name}</span>
                                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                                    {vendor.billCount} bill{vendor.billCount !== 1 ? 's' : ''} · {formatCurrency(vendor.totalAmount, vendor.currency)}
                                  </span>
                                </td>
                              );
                            case 'industry':
                              return <td key={col.key} className="px-6 py-3 text-muted-foreground">{vendor.industry || EMPTY}</td>;
                            case 'phone':
                              return <td key={col.key} className="px-6 py-3 text-muted-foreground">{vendor.phone || EMPTY}</td>;
                            case 'email':
                              return <td key={col.key} className="px-6 py-3 text-muted-foreground">{vendor.email || EMPTY}</td>;
                            case 'country':
                              return <td key={col.key} className="px-6 py-3 text-muted-foreground">{vendor.country || EMPTY}</td>;
                            case 'status':
                              return (
                                <td key={col.key} className="px-6 py-3 text-center">
                                  <Badge variant={vendor.archived ? 'outline' : 'success'}>
                                    {vendor.archived ? 'Archived' : 'Active'}
                                  </Badge>
                                </td>
                              );
                            case 'lastComm':
                              return (
                                <td key={col.key} className="px-6 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                                  {vendor.lastCommunication ? new Date(vendor.lastCommunication).toLocaleDateString() : EMPTY}
                                </td>
                              );
                            default:
                              return null;
                          }
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading vendors...
                </div>
              )}

              {!isLoading && filteredVendors.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-16 w-16 rounded-full bg-accent/40 flex items-center justify-center mb-4">
                    <Inbox className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">No Data</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {archivedTab === 'archived'
                      ? 'No archived vendors found.'
                      : 'No vendors found. They appear here once you record bills.'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
