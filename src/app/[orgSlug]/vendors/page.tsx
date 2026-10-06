'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useOrgBranding } from '@/hooks/use-org-branding';
import { useBills } from '@/hooks/use-bills';
import { useAPSummary, useVendorBillStats } from '@/hooks/use-arpa';
import { useVendors } from '@/hooks/use-inventory';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getBills, type Bill } from '@/lib/api/bills';
import { getVendorBillStats, type VendorBillStats } from '@/lib/api/arpa';
import { listVendors, vendorKraPin, type Vendor } from '@/lib/api/inventory';
import { StatementDialog } from '@/components/statement-dialog';
import { OpeningBalanceDialog } from '@/components/opening-balance-dialog';
import { VendorRefundDialog } from '@/components/vendor-refund-dialog';
import { PayoutVendorCreditDialog } from '@/components/payout-vendor-credit-dialog';
import { PayBillDialog } from '@/components/bills/PayBillDialog';
import { VendorOpenBillsDialog } from '@/components/bills/VendorOpenBillsDialog';
import { SettleVendorDialog } from '@/components/bills/SettleVendorDialog';
import { VendorFormDialog } from '@/components/vendors/VendorFormDialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildVendorColumns, type VendorSummary } from './vendor-columns';
import { ArrowLeft, Banknote, ChevronRight, Inbox, Loader2, Plus, Search } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  received: 'warning',
  approved: 'warning',
  partial: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'outline',
};

/** Supplier master row + its AP balance (attached by inventory-api) + bill activity (treasury). */
function toSummary(v: Vendor, stats?: VendorBillStats): VendorSummary {
  return {
    vendorId: v.id,
    name: v.business_name,
    kraPin: vendorKraPin(v),
    industry: v.industry ?? '',
    phone: v.phone ?? '',
    email: v.email ?? '',
    country: v.country ?? '',
    billCount: stats?.bill_count ?? 0,
    totalAmount: Number(stats?.total_billed ?? 0) || 0,
    outstanding: Number(stats?.open_amount ?? 0) || 0,
    currency: v.balance_currency || v.account_details?.currency || 'KES',
    lastCommunication: stats?.last_bill_date ?? '',
    archived: !!v.is_archived,
    balanceOwed: v.balance_owed,
    payableBillCount: stats?.open_bill_count ?? 0,
  };
}

const EXPORT_PAGE = 100;
const STATS_CHUNK = 200;

export default function VendorsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data: brand } = useOrgBranding(orgSlug);
  const orgName = brand?.orgName || brand?.name || 'Workspace';

  const [topTab, setTopTab] = useState<'all' | 'reports'>('all');
  // Add Vendor dialog; ?add=1 (the old /vendors/new route redirects here) opens it on arrival.
  const [addOpen, setAddOpen] = useState(searchParams?.get('add') === '1');
  const [archivedTab, setArchivedTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const search = useDebouncedValue(searchQuery.trim(), 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedVendor, setSelectedVendor] = useState<VendorSummary | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [statementVendor, setStatementVendor] = useState<{ id: string; name: string } | null>(null);
  const [openingVendor, setOpeningVendor] = useState<{ id?: string; name: string } | null>(null);
  const [refundVendor, setRefundVendor] = useState<{ id?: string; name: string } | null>(null);
  const [payoutVendor, setPayoutVendor] = useState<{ id?: string; name: string; creditAvailable: number; currency: string } | null>(null);
  // One supplier's live payables, loaded on demand when Pay is clicked.
  const [openBills, setOpenBills] = useState<{ vendor: VendorSummary; bills: Bill[] } | null>(null);
  const [payPickerOpen, setPayPickerOpen] = useState(false);
  const [payBill, setPayBill] = useState<Bill | null>(null);
  const [settleVendor, setSettleVendor] = useState<{ id?: string; name: string } | null>(null);
  const [loadingPayFor, setLoadingPayFor] = useState<string | null>(null);

  // Back to page 1 whenever the tab, search or page size changes (adjusted during render, the
  // pattern the other list pages use; setState in an effect is flagged by the linter).
  const filterKey = JSON.stringify([archivedTab, search, pageSize]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  // The vendor master: one server page, searched and filtered by status on the server, so the
  // cost follows the page size, not the number of suppliers or bills the tenant has.
  const listParams = useMemo(
    () => ({
      q: search || undefined,
      status: archivedTab === 'archived' ? ('inactive' as const) : ('active' as const),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    [search, archivedTab, page, pageSize],
  );
  const { data: vendorPage, isLoading, isFetching, error } = useVendors(effectiveTenant, listParams, !!effectiveTenant);
  const pageVendors = useMemo(() => vendorPage?.vendors ?? [], [vendorPage]);
  const total = vendorPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Bill activity for just the suppliers on this page (one grouped query).
  const pageIds = useMemo(() => pageVendors.map((v) => v.id), [pageVendors]);
  const { data: billStats } = useVendorBillStats(effectiveTenant, pageIds, !!effectiveTenant);
  const rows = useMemo(() => {
    const byId = new Map((billStats ?? []).map((s) => [s.vendor_id, s]));
    return pageVendors.map((v) => toSummary(v, byId.get(v.id)));
  }, [pageVendors, billStats]);

  // AP headline (total payable / overdue / due this week / open bills) and the vendor counts.
  const { data: apSummary } = useAPSummary(effectiveTenant, !!effectiveTenant);
  const { data: activeCount } = useVendors(effectiveTenant, { status: 'active', limit: 1 }, !!effectiveTenant && topTab === 'reports');
  const { data: archivedCount } = useVendors(effectiveTenant, { status: 'inactive', limit: 1 }, !!effectiveTenant && topTab === 'reports');

  // Vendor detail: that supplier's bill history, paged on the server.
  const { data: detailBills, isLoading: detailLoading } = useBills(
    effectiveTenant,
    selectedVendor ? { vendor_id: selectedVendor.vendorId, page: detailPage, limit: 20 } : undefined,
    !!effectiveTenant && !!selectedVendor,
  );

  const startPay = async (vendor: VendorSummary) => {
    setLoadingPayFor(vendor.vendorId);
    try {
      const res = await getBills(effectiveTenant, { vendor_id: vendor.vendorId, open: true, limit: 100 });
      const bills = [...(res.data ?? [])].sort((a, b) => (a.due_date || a.bill_date).localeCompare(b.due_date || b.bill_date));
      if (bills.length === 0) {
        toast.info(`${vendor.name} has no open bills to pay.`);
        return;
      }
      // Credit the bills don't reflect yet (e.g. a purchase return): the supplier balance is lower
      // than what its open bills add up to. Offer the consolidated settle so that credit is
      // applied instead of paying the full bill in cash.
      const billsOpen = bills.reduce((sum, b) => sum + (Number(b.balance_due ?? b.total_amount) || 0), 0);
      const hasCredit = vendor.balanceOwed !== undefined && billsOpen - vendor.balanceOwed > 0.009;
      setOpenBills({ vendor, bills });
      if (bills.length === 1 && !hasCredit) setPayBill(bills[0]);
      else setPayPickerOpen(true);
    } catch {
      toast.error('Could not load this vendor\'s open bills. Please try again.');
    } finally {
      setLoadingPayFor(null);
    }
  };

  const vendorColumns = buildVendorColumns({
    onPay: (vendor) => {
      if (!loadingPayFor) void startPay(vendor);
    },
    onPayoutCredit: (vendor) =>
      setPayoutVendor({
        id: vendor.vendorId,
        name: vendor.name,
        creditAvailable: -(vendor.balanceOwed ?? 0),
        currency: vendor.currency,
      }),
    onOpeningBalance: (vendor) => setOpeningVendor({ id: vendor.vendorId, name: vendor.name }),
    onRefund: (vendor) => setRefundVendor({ id: vendor.vendorId, name: vendor.name }),
    onStatement: (vendor) => setStatementVendor({ id: vendor.vendorId, name: vendor.name }),
  });

  // CSV export of every vendor matching the current tab + search: pages through the master, then
  // joins bill activity in chunks, instead of downloading the tenant's bill history.
  const exportAll = async (): Promise<VendorSummary[]> => {
    const all: Vendor[] = [];
    for (let offset = 0; ; offset += EXPORT_PAGE) {
      const res = await listVendors(effectiveTenant, { ...listParams, limit: EXPORT_PAGE, offset });
      all.push(...res.vendors);
      if (res.vendors.length < EXPORT_PAGE || all.length >= res.total) break;
    }
    const stats = new Map<string, VendorBillStats>();
    for (let i = 0; i < all.length; i += STATS_CHUNK) {
      const chunk = await getVendorBillStats(effectiveTenant, all.slice(i, i + STATS_CHUNK).map((v) => v.id));
      chunk.forEach((s) => stats.set(s.vendor_id, s));
    }
    return all.map((v) => toSummary(v, stats.get(v.id)));
  };

  // ---- Vendor detail (bill history) ----
  if (selectedVendor) {
    const vendor = selectedVendor;
    const bills = detailBills?.data ?? [];
    const detailTotal = detailBills?.total ?? bills.length;
    const detailPages = Math.max(1, Math.ceil(detailTotal / 20));
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{vendor.name}</h1>
            <p className="text-muted-foreground mt-1">
              {vendor.kraPin ? `KRA PIN ${vendor.kraPin} · ` : ''}Bill history for this vendor.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Billed', value: formatCurrency(vendor.totalAmount, vendor.currency) },
            { label: 'Open Bills Owe', value: formatCurrency(vendor.outstanding, vendor.currency) },
            { label: 'Balance Owed', value: vendor.balanceOwed !== undefined ? formatCurrency(vendor.balanceOwed, vendor.currency) : '—' },
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
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Bill Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bills.map((bill: Bill) => (
                    <tr key={bill.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{bill.bill_number}</td>
                      <td className="px-6 py-4 text-right font-bold text-xs">{bill.currency} {bill.total_amount}</td>
                      <td className="px-6 py-4 text-xs">{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusVariant[bill.status] ?? 'outline'}>{bill.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(bill.bill_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detailLoading && (
                <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              )}
              {!detailLoading && bills.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">No bills recorded for this vendor yet.</div>
              )}
            </div>
            {detailPages > 1 && (
              <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border text-sm">
                <Button variant="outline" size="sm" disabled={detailPage <= 1} onClick={() => setDetailPage((p) => p - 1)}>Previous</Button>
                <span className="text-muted-foreground">Page {detailPage} of {detailPages}</span>
                <Button variant="outline" size="sm" disabled={detailPage >= detailPages} onClick={() => setDetailPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <Button variant="primary" onClick={() => setAddOpen(true)}>
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

      {/* AP summary strip: total payable / overdue / due this week from /ap/summary. */}
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
            { label: 'Active Vendors', value: activeCount ? String(activeCount.total) : '…' },
            { label: 'Archived Vendors', value: archivedCount ? String(archivedCount.total) : '…' },
            { label: 'Total Payable', value: formatCurrency(parseFloat(apSummary?.total_payable ?? '0') || 0) },
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

            {/* Toolbar: server-side search (CSV export lives in the DataTable toolbar below) */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end px-6 py-4">
              <div className="relative w-full sm:max-w-xs group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  placeholder="Search name, email, phone or KRA PIN"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 pl-10 pr-9 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isFetching && !isLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Table: shared DataTable, rows are one server page of the vendor master. */}
            <div className="px-6 py-4 border-t border-border">
              <DataTable<VendorSummary>
                columns={vendorColumns}
                rows={rows}
                rowKey={(v) => v.vendorId}
                loading={isLoading}
                loadingRows={8}
                onRowClick={(v) => {
                  setDetailPage(1);
                  setSelectedVendor(v);
                }}
                rowClassName={() => 'group'}
                emptyState={
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-16 w-16 rounded-full bg-accent/40 flex items-center justify-center mb-4 mx-auto">
                      <Inbox className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">No Data</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {search
                        ? 'No vendors match your search.'
                        : archivedTab === 'archived'
                          ? 'No archived vendors.'
                          : 'No vendors yet. Add one with the Add Vendor button.'}
                    </p>
                  </div>
                }
                storageKey="vendors-table"
                showExportCsv
                exportFileName={`vendors-${orgSlug || 'export'}`}
                onExportAll={exportAll}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                total={total}
                toolbar={
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{total}</span> Vendor{total !== 1 ? 's' : ''} Found
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

      {payPickerOpen && openBills && (
        <VendorOpenBillsDialog
          vendorName={openBills.vendor.name}
          bills={openBills.bills}
          onPick={(bill) => { setPayPickerOpen(false); setPayBill(bill); }}
          onSettleAll={() => {
            setPayPickerOpen(false);
            setSettleVendor({ id: openBills.vendor.vendorId, name: openBills.vendor.name });
          }}
          onClose={() => setPayPickerOpen(false)}
        />
      )}

      <SettleVendorDialog
        key={settleVendor?.name ?? 'none'}
        tenant={effectiveTenant}
        orgSlug={orgSlug}
        vendor={settleVendor}
        bills={settleVendor ? openBills?.bills ?? [] : []}
        onClose={() => setSettleVendor(null)}
      />

      <VendorFormDialog
        open={addOpen}
        tenant={effectiveTenant}
        description="Saved to your supplier list, shared with Inventory and POS."
        onClose={() => setAddOpen(false)}
        onCreated={() => setAddOpen(false)}
      />

      <PayBillDialog
        tenant={effectiveTenant}
        orgSlug={orgSlug}
        bill={payBill}
        onClose={() => setPayBill(null)}
      />
    </div>
  );
}
