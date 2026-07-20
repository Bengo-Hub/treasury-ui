'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useOrgBranding } from '@/hooks/use-org-branding';
import { useBills } from '@/hooks/use-bills';
import { useAPSummary, useVendorBalances } from '@/hooks/use-arpa';
import type { Bill } from '@/lib/api/bills';
import type { VendorBalance } from '@/lib/api/arpa';
import { StatementDialog } from '@/components/statement-dialog';
import { OpeningBalanceDialog } from '@/components/opening-balance-dialog';
import { VendorRefundDialog } from '@/components/vendor-refund-dialog';
import { PayoutVendorCreditDialog } from '@/components/payout-vendor-credit-dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  DataTable,
  compareValues,
  type FilterMap,
  type SortState,
} from '@bengo-hub/shared-ui-lib/data-table';
import { buildVendorColumns, VENDOR_ACCESSORS, type VendorSummary } from './vendor-columns';
import {
  ArrowLeft,
  Banknote,
  ChevronRight,
  Filter,
  Inbox,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  pending: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'outline',
};

export default function VendorsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data: brand } = useOrgBranding(orgSlug);
  const orgName = brand?.orgName || brand?.name || 'Workspace';

  const [topTab, setTopTab] = useState<'all' | 'reports'>('all');
  const [archivedTab, setArchivedTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState('all');
  // DataTable header state — controlled so sort/funnel run over the whole vendor
  // list before client pagination. Default order: biggest vendors (total billed) first.
  const [sort, setSort] = useState<SortState | null>(null);
  const [funnel, setFunnel] = useState<FilterMap>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [statementVendor, setStatementVendor] = useState<{ id: string; name: string } | null>(null);
  const [openingVendor, setOpeningVendor] = useState<{ id?: string; name: string } | null>(null);
  const [refundVendor, setRefundVendor] = useState<{ id?: string; name: string } | null>(null);
  const [payoutVendor, setPayoutVendor] = useState<{ id?: string; name: string; creditAvailable: number; currency: string } | null>(null);

  const { data, isLoading, error } = useBills(effectiveTenant, {}, !!effectiveTenant);
  const bills = useMemo(() => data?.data ?? [], [data]);

  // AP balances + summary (the operational AP ledger — opening/advance + owed per supplier).
  const { data: apSummary } = useAPSummary(effectiveTenant, !!effectiveTenant);
  const { data: vendorBalances } = useVendorBalances(effectiveTenant, !!effectiveTenant);

  // name -> VendorBalance, so the derived (bill-history) vendor rows can surface a real
  // balance_owed and a vendor_id (needed for the statement drill-down endpoint).
  const balanceByName = useMemo(() => {
    const m = new Map<string, VendorBalance>();
    (vendorBalances ?? []).forEach((b) => {
      if (b.vendor_name) m.set(b.vendor_name, b);
    });
    return m;
  }, [vendorBalances]);

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
    return Array.from(map.values()).map(({ _allCancelled, ...v }) => {
      const bal = balanceByName.get(v.name);
      return {
        ...v,
        archived: _allCancelled,
        vendorId: bal?.vendor_id,
        balanceOwed: bal ? parseFloat(bal.balance_owed) || 0 : undefined,
      };
    });
  }, [bills, balanceByName]);

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

    // Funnel filters from the DataTable headers.
    for (const [key, st] of Object.entries(funnel)) {
      const acc = VENDOR_ACCESSORS[key];
      if (!acc || !st) continue;
      const values = st.values ?? [];
      const query = st.query?.trim().toLowerCase();
      if (values.length === 0 && !query) continue;
      list = list.filter((v) => {
        const text = String(acc(v) ?? '');
        if (values.length > 0 && !values.includes(text)) return false;
        if (query && !text.toLowerCase().includes(query)) return false;
        return true;
      });
    }

    const acc = sort ? VENDOR_ACCESSORS[sort.key] : undefined;
    if (sort && acc) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      return [...list].sort((a, b) => dir * compareValues(acc(a), acc(b)));
    }
    // Default order: biggest vendors first.
    return [...list].sort((a, b) => b.totalAmount - a.totalAmount);
  }, [vendors, archivedTab, currencyFilter, searchQuery, funnel, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / pageSize));
  const pagedVendors = filteredVendors.slice((page - 1) * pageSize, page * pageSize);

  useMemo(() => { setPage(1); }, [archivedTab, currencyFilter, searchQuery, funnel, pageSize]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setCurrencyFilter('all');
  };

  // Funnel checklists derived from the whole vendor set (controlled-filter mode
  // would otherwise only see the current page slice).
  const industryOptions = [...new Set(vendors.map((v) => v.industry || ''))]
    .sort()
    .map((v) => ({ value: v, label: v || '(none)' }));

  const vendorColumns = buildVendorColumns(industryOptions, {
    onPayoutCredit: (vendor) =>
      setPayoutVendor({
        id: vendor.vendorId,
        name: vendor.name,
        creditAvailable: -(vendor.balanceOwed ?? 0),
        currency: vendor.currency,
      }),
    onOpeningBalance: (vendor) => setOpeningVendor({ id: vendor.vendorId, name: vendor.name }),
    onRefund: (vendor) => setRefundVendor({ id: vendor.vendorId, name: vendor.name }),
    onStatement: (vendor) => {
      if (vendor.vendorId) setStatementVendor({ id: vendor.vendorId, name: vendor.name });
    },
  });

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
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s vendors. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load vendors. Check your connection and try again.
        </div>
      )}

      {/* AP summary strip — total payable / overdue / due-this-week from /ap/summary. */}
      {apSummary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Total Payable', value: formatCurrency(parseFloat(apSummary.total_payable) || 0), tone: 'default' as const },
            { label: 'Overdue', value: formatCurrency(parseFloat(apSummary.overdue) || 0), tone: 'destructive' as const },
            { label: 'Due This Week', value: formatCurrency(parseFloat(apSummary.due_this_week) || 0), tone: 'default' as const },
            { label: 'Open Bills', value: String(apSummary.open_bills), tone: 'default' as const },
          ].map(({ label, value, tone }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Banknote className={cn('h-3.5 w-3.5', tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground')} />
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</p>
                </div>
                <p className={cn('text-xl font-black', tone === 'destructive' && 'text-destructive')}>{value}</p>
              </CardContent>
            </Card>
          ))}
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

            {/* Toolbar: search (CSV export lives in the DataTable toolbar below) */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end px-6 py-4">
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

            {/* Table — shared DataTable: sortable headers, funnel filters, column
                visibility (storageKey), CSV export, entries selector + pagination. */}
            <div className="px-6 py-4 border-t border-border">
              <DataTable<VendorSummary>
                columns={vendorColumns}
                rows={pagedVendors}
                rowKey={(v) => v.name}
                loading={isLoading}
                onRowClick={(v) => setSelectedVendor(v.name)}
                rowClassName={() => 'group'}
                emptyState={
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-16 w-16 rounded-full bg-accent/40 flex items-center justify-center mb-4 mx-auto">
                      <Inbox className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">No Data</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {archivedTab === 'archived'
                        ? 'No archived vendors found.'
                        : 'No vendors found. They appear here once you record bills.'}
                    </p>
                  </div>
                }
                sort={sort}
                onSortChange={setSort}
                filters={funnel}
                onFiltersChange={setFunnel}
                storageKey="vendors-table"
                showExportCsv
                exportFileName={`vendors-${orgSlug || 'export'}`}
                onExportAll={() => Promise.resolve(filteredVendors)}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                total={filteredVendors.length}
                toolbar={
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{filteredVendors.length}</span>{' '}
                    Vendor{filteredVendors.length !== 1 ? 's' : ''} Found
                  </p>
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {statementVendor && (
        <StatementDialog
          kind="vendor"
          open={!!statementVendor}
          onClose={() => setStatementVendor(null)}
          tenant={effectiveTenant}
          entityId={statementVendor.id}
          name={statementVendor.name}
        />
      )}

      {openingVendor && (
        <OpeningBalanceDialog
          kind="vendor"
          open={!!openingVendor}
          onClose={() => setOpeningVendor(null)}
          tenant={effectiveTenant}
          name={openingVendor.name}
          vendorId={openingVendor.id}
          vendorIdentifier={openingVendor.name}
        />
      )}

      {refundVendor && (
        <VendorRefundDialog
          open={!!refundVendor}
          onClose={() => setRefundVendor(null)}
          tenant={effectiveTenant}
          name={refundVendor.name}
          vendorId={refundVendor.id}
          vendorIdentifier={refundVendor.name}
        />
      )}

      {payoutVendor && (
        <PayoutVendorCreditDialog
          open={!!payoutVendor}
          onClose={() => setPayoutVendor(null)}
          tenant={effectiveTenant}
          name={payoutVendor.name}
          vendorId={payoutVendor.id}
          vendorIdentifier={payoutVendor.name}
          creditAvailable={payoutVendor.creditAvailable}
          currency={payoutVendor.currency}
        />
      )}
    </div>
  );
}
