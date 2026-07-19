'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import { PayBillDialog } from '@/components/bills/PayBillDialog';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useBills, useAPAging } from '@/hooks/use-bills';
import { useTransmitVendorBill } from '@/hooks/use-tax';
import type { Bill, AgingRow } from '@/lib/api/bills';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  CreditCard,
  Filter,
  Loader2,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Upload,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  pending: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'outline',
};

export default function BillsPage() {
  const router = useRouter();
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'bill' | 'credit_note'>('all');
  const [page, setPage] = useState(1);
  const [payBillId, setPayBillId] = useState<string | null>(null);
  // Deep link from the dashboard payables list: /bills?pay=<billID> opens the Pay dialog.
  const searchParams = useSearchParams();
  useEffect(() => {
    const payParam = searchParams?.get('pay');
    if (payParam) setPayBillId(payParam);
  }, [searchParams]);

  const queryParams = useMemo(() => ({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }), [statusFilter]);

  const { data, isLoading, error } = useBills(effectiveTenant, queryParams, !!effectiveTenant);
  const { data: agingData } = useAPAging(effectiveTenant, !!effectiveTenant);

  const list = data?.data ?? [];
  const agingRows = agingData?.rows ?? [];

  // Note: the bills list endpoint does not support a document_type query filter
  // (BillFilters has no DocumentType), so type filtering is done client-side here.
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return list.filter((bill: Bill) => {
      if (typeFilter !== 'all' && (bill.document_type ?? 'bill') !== typeFilter) return false;
      if (!q) return true;
      return (
        bill.bill_number?.toLowerCase().includes(q) ||
        bill.vendor_name?.toLowerCase().includes(q)
      );
    });
  }, [list, searchQuery, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useMemo(() => { setPage(1); }, [searchQuery, statusFilter, typeFilter]);

  const statusOptions = ['all', 'draft', 'pending', 'paid', 'overdue'];
  const typeOptions: { value: 'all' | 'bill' | 'credit_note'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'bill', label: 'Bills' },
    { value: 'credit_note', label: 'Credit Notes' },
  ];

  const transmit = useTransmitVendorBill();

  // The bill the Pay dialog is settling, resolved from the loaded list (covers both the
  // row-level "Pay" click and the ?pay=<billID> deep link).
  const payTarget = useMemo(() => list.find((b: Bill) => b.id === payBillId) ?? null, [list, payBillId]);

  const goToNewPurchase = () => router.push(`/${orgSlug}/bills/new`);

  // The Refrens-style landing only shows before any bills exist — i.e. no bills
  // returned with the default (unfiltered) view.
  const showEmptyLanding =
    !isLoading &&
    !error &&
    !!effectiveTenant &&
    list.length === 0 &&
    statusFilter === 'all' &&
    typeFilter === 'all' &&
    !searchQuery.trim();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground mt-1">Manage vendor bills and accounts payable.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={goToNewPurchase}>
          <Plus className="h-4 w-4" /> New Purchase
        </Button>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s bills. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load bills. Check your connection and try again.
        </div>
      )}

      {showEmptyLanding && (
        <div className="flex justify-center py-10">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 px-8 text-center space-y-5">
              <div>
                <h2 className="text-xl font-black">Purchases and Expenses</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Create, Manage, Track &amp; Optimize Your Purchases and Expenses Instantly. Get
                  essential purchase and expense reports within seconds.
                </p>
              </div>
              <div className="mx-auto flex h-36 w-full max-w-[260px] items-center justify-center rounded-xl bg-accent/30">
                <Receipt className="h-14 w-14 text-primary/60" />
              </div>
              <div className="space-y-3">
                <Button className="w-full" onClick={goToNewPurchase}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> Create First Purchase
                </Button>
                <button
                  type="button"
                  onClick={() => router.push(`/${orgSlug}/expenses/new`)}
                  className="block w-full text-sm font-semibold text-primary hover:underline"
                >
                  Create New Expenditure
                </button>
                <button
                  type="button"
                  onClick={goToNewPurchase}
                  className="inline-flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Upload className="h-4 w-4" /> Upload Purchases
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AP Aging Summary */}
      {agingRows.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold">AP Aging Summary</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Vendor</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Current</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">1-30</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">31-60</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">61-90</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">90+</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agingRows.map((row: AgingRow) => (
                    <tr key={row.entity_id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-3 text-xs font-medium">{row.entity_name}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{formatCurrency(Number(row.current))}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{formatCurrency(Number(row.days_1_to_30))}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{formatCurrency(Number(row.days_31_to_60))}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{formatCurrency(Number(row.days_61_to_90))}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{formatCurrency(Number(row.over_90))}</td>
                      <td className="px-6 py-3 text-right text-xs font-bold tabular-nums">{formatCurrency(Number(row.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bills Table */}
      {!showEmptyLanding && (
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by bill number or vendor..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">Status:</span>
            </div>
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">Type:</span>
            </div>
            {typeOptions.map((t) => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold transition-all",
                  typeFilter === t.value ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading bills...
              </div>
            )}
            {!isLoading && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Bill #</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Vendor</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Due Date</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Created</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.map((bill: Bill) => (
                    <tr key={bill.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span>{bill.bill_number}</span>
                          {bill.document_type === 'credit_note' ? (
                            <Badge variant="warning">Credit Note</Badge>
                          ) : (
                            <Badge variant="outline">Bill</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">{bill.vendor_name || '---'}</td>
                      <td className="px-6 py-4 text-right font-bold text-xs tabular-nums">{formatCurrency(Number(bill.total_amount), bill.currency)}</td>
                      <td className="px-6 py-4 text-xs">{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusVariant[bill.status] ?? 'outline'}>
                          {bill.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {(bill.status === 'pending' || bill.status === 'overdue') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => setPayBillId(bill.id)}
                            >
                              <CreditCard className="h-3 w-3" /> Pay
                            </Button>
                          )}
                          {bill.status !== 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              title="Transmit this purchase to KRA eTIMS (buyer-initiated / self-billed for non-eTIMS suppliers)"
                              disabled={transmit.isPending}
                              onClick={() => transmit.mutate({ tenantSlug: effectiveTenant, billId: bill.id })}
                            >
                              {transmit.isPending && transmit.variables?.billId === bill.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Upload className="h-3 w-3" />} eTIMS
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No bills match your filters.</div>
            )}
          </div>
          {!isLoading && filtered.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>
      )}

      <PayBillDialog
        tenant={effectiveTenant}
        orgSlug={orgSlug}
        bill={payTarget}
        onClose={() => setPayBillId(null)}
      />
    </div>
  );
}
