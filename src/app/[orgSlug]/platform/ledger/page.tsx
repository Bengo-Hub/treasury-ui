'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { usePlatformTransactions } from '@/hooks/use-platform-analytics';
import { useMe } from '@/hooks/useMe';
import type { TransactionItem } from '@/lib/api/analytics';
import { cn } from '@/lib/utils';
import { useTenantFilterStore } from '@/store/tenant-filter';
import {
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Search,
  Shield,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';


const SERVICE_OPTIONS = [
  { value: 'all', label: 'All Services' },
  { value: 'ordering', label: 'Ordering (Food/Delivery)' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'pos', label: 'Point of Sale (POS)' },
  { value: 'logistics', label: 'Logistics / Dispatch' },
  { value: 'inventory', label: 'Inventory Management' },
  { value: 'treasury', label: 'Treasury (Finance)' },
  { value: 'ticketing', label: 'Ticketing' },
  { value: 'cafe', label: 'Cafe & Hospitality' },
  { value: 'isp_billing', label: 'ISP Billing' },
  { value: 'marketflow', label: 'Marketing & CRM' },
  { value: 'notifications', label: 'Notifications Service' },
  { value: 'projects', label: 'Projects & Invoicing' },
  { value: 'erp', label: 'ERP / Accounting' },
  { value: 'truload', label: 'Transport & Axle Load' },
  { value: 'auth', label: 'Auth & Identity' },
];

const NULL_UUID = '00000000-0000-0000-0000-000000000000';

function formatTenantId(id: string | undefined): string {
  if (!id || id === NULL_UUID) return '—';
  // Show first segment + partial second: e.g. "a1b2c3d4-e5f6…"
  const parts = id.split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}…` : id.slice(0, 13) + '…';
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const PAGE_SIZE = 50;

export default function GlobalLedgerPage() {
  const { data: user } = useMe();
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const tenantIds = useTenantFilterStore((s) => s.tenantIdsParam)();
  const selectedTenantCount = useTenantFilterStore((s) => s.selectedTenants.length);
  const clearTenants = useTenantFilterStore((s) => s.clearTenants);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const dateRange = useMemo(() => defaultDateRange(), []);

  useEffect(() => {
    if (user && orgSlug !== 'codevertex') {
      router.replace(`/${orgSlug}`);
    }
  }, [user, orgSlug, router]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => { setPage(1); }, [statusFilter, typeFilter, serviceFilter, tenantIds, dateRange]);

  const queryParams = useMemo(() => ({
    from: dateRange.from,
    to: dateRange.to,
    limit: PAGE_SIZE,
    page,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(typeFilter !== 'all' ? { payment_method: typeFilter } : {}),
    ...(serviceFilter !== 'all' ? { source_service: serviceFilter } : {}),
    ...(tenantIds ? { tenant_ids: tenantIds } : {}),
  }), [dateRange, statusFilter, typeFilter, serviceFilter, tenantIds, page]);

  const { data, isLoading, error } = usePlatformTransactions(queryParams);
  const list: TransactionItem[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (txn) =>
        txn.reference_id?.toLowerCase().includes(q) ||
        txn.source_service?.toLowerCase().includes(q) ||
        txn.tenant_id?.toLowerCase().includes(q),
    );
  }, [list, searchQuery]);

  const statusOptions = ['all', 'succeeded', 'pending', 'processing', 'failed', 'cancelled'];
  const methodOptions = ['all', 'mpesa', 'card', 'cash', 'bank_transfer', 'cod'];

  if (orgSlug !== 'codevertex') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">This section requires Platform Owner privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="warning">Platform Admin</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Global Ledger</h1>
          <p className="text-muted-foreground mt-1">
            All financial transactions across all tenants.
            {total > 0 && <span className="ml-2 font-semibold text-foreground">{total.toLocaleString()} total</span>}
          </p>
        </div>
        <Button variant="outline" className="gap-2" disabled>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load global transactions. Check your connection and try again.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 py-4">
          {/* Row 1: search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                placeholder="Search reference, source, or tenant UUID…"
                className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: status + method + service filters */}
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
            <div className="w-px h-5 bg-border mx-2" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">Method:</span>
            </div>
            {methodOptions.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                  typeFilter === t ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
            <div className="w-px h-5 bg-border mx-2" />
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="h-7 rounded-full border border-border bg-accent/30 px-3 text-xs font-bold text-muted-foreground focus:text-foreground focus:outline-none"
            >
              {SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Active tenant filter badge — driven by top-nav TenantFilter */}
          {selectedTenantCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtered by:</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                {selectedTenantCount === 1 ? '1 tenant' : `${selectedTenantCount} tenants`}
              </span>
              <button onClick={clearTenants} className="text-xs text-muted-foreground hover:text-foreground underline">
                Clear
              </button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading transactions…
              </div>
            )}
            {!isLoading && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Tenant</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Reference</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Source</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Method</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((txn: TransactionItem) => (
                    <tr key={txn.id} className="hover:bg-accent/5 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        {txn.tenant_id && txn.tenant_id !== NULL_UUID ? (
                          <span
                            className="font-mono text-xs text-muted-foreground"
                            title={txn.tenant_id}
                          >
                            {formatTenantId(txn.tenant_id)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold">{txn.reference_id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                          <span className="capitalize text-xs font-medium">{txn.reference_type || 'payment'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">{txn.source_service || '—'}</td>
                      <td className="px-6 py-4 text-xs capitalize">{txn.payment_method?.replace(/_/g, ' ') || '—'}</td>
                      <td className="px-6 py-4 text-right font-bold text-xs tabular-nums">{txn.currency} {txn.amount}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={txn.status === 'succeeded' ? 'success' : txn.status === 'pending' || txn.status === 'processing' ? 'warning' : 'error'}>
                          {txn.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground tabular-nums">{new Date(txn.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No transactions match your filters.</div>
            )}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total.toLocaleString()} transactions
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-border bg-accent/30 disabled:opacity-40 hover:bg-accent/60 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={!hasMore && page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-border bg-accent/30 disabled:opacity-40 hover:bg-accent/60 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
