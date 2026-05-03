'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useTransactions } from '@/hooks/use-analytics';
import { usePlatformTransactions, getTransactionsExportURL } from '@/hooks/use-platform-analytics';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { exportTransactionsCSV, type TransactionItem } from '@/lib/api/analytics';
import { Pagination } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import {
    ArrowUpRight,
    Calendar,
    Download,
    Filter,
    Loader2,
    Search
} from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

const SERVICE_OPTIONS = [
  { value: 'all', label: 'All Services' },
  { value: 'ordering', label: 'Ordering (Food/Delivery)' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'pos', label: 'Point of Sale (POS)' },
  { value: 'logistics', label: 'Logistics / Dispatch' },
  { value: 'inventory', label: 'Inventory Management' },
  { value: 'treasury', label: 'Treasury (Finance)' },
  { value: 'cafe', label: 'Cafe & Hospitality' },
  { value: 'isp_billing', label: 'ISP Billing' },
  { value: 'marketflow', label: 'MarketFlow (AI Marketing)' },
  { value: 'notifications', label: 'Notifications Service' },
  { value: 'projects', label: 'Projects & Invoicing' },
  { value: 'erp', label: 'ERP / Accounting' },
  { value: 'truload', label: 'Axle Load' },
  { value: 'auth', label: 'Auth & Identity' },
];

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function TransactionsPage() {
  const { tenantPathId, tenantIdsParam, isPlatformOwner } = useResolvedTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const dateRange = useMemo(() => defaultDateRange(), []);

  // Platform admins: use platform endpoint (all tenants by default; tenant_ids filter optional)
  // Regular tenants: use tenant-scoped endpoint
  const platformParams = useMemo(() => ({
    from: dateRange.from,
    to: dateRange.to,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(typeFilter !== 'all' ? { payment_method: typeFilter } : {}),
    ...(serviceFilter !== 'all' ? { source_service: serviceFilter } : {}),
    ...(tenantIdsParam ? { tenant_ids: tenantIdsParam } : {}),
  }), [dateRange, statusFilter, typeFilter, serviceFilter, tenantIdsParam]);

  const tenantParams = useMemo(() => ({
    from: dateRange.from,
    to: dateRange.to,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(typeFilter !== 'all' ? { payment_method: typeFilter } : {}),
    ...(serviceFilter !== 'all' ? { source_service: serviceFilter } : {}),
  }), [dateRange, statusFilter, typeFilter, serviceFilter]);

  const platformResult = usePlatformTransactions(isPlatformOwner ? platformParams : undefined);
  const tenantResult = useTransactions(tenantPathId, tenantParams, !isPlatformOwner && !!tenantPathId);

  const isLoading = isPlatformOwner ? platformResult.isLoading : tenantResult.isLoading;
  const error = isPlatformOwner ? platformResult.error : tenantResult.error;
  const list: TransactionItem[] = isPlatformOwner
    ? (platformResult.data?.data ?? [])
    : (tenantResult.data?.transactions ?? []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (txn: TransactionItem) =>
        txn.reference_id?.toLowerCase().includes(q) ||
        txn.source_service?.toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useMemo(() => { setPage(1); }, [searchQuery, statusFilter, typeFilter, serviceFilter]);

  const statusOptions = ['all', 'succeeded', 'pending', 'processing', 'failed', 'cancelled'];
  const methodOptions = ['all', 'mpesa', 'card', 'cash', 'bank_transfer', 'cod'];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            {isPlatformOwner
              ? 'All payment transactions across all tenants and gateways.'
              : 'View and filter all payment transactions across gateways.'}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            if (isPlatformOwner) {
              const url = getTransactionsExportURL(
                dateRange.from, dateRange.to,
                statusFilter !== 'all' ? statusFilter : undefined,
                serviceFilter !== 'all' ? serviceFilter : undefined,
                tenantIdsParam || undefined,
              );
              window.open(url, '_blank');
            } else if (tenantPathId) {
              exportTransactionsCSV(tenantPathId, tenantParams);
            }
          }}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load transactions. Check your connection and try again.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by reference or source..."
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
              onChange={(e) => { setServiceFilter(e.target.value); setPage(1); }}
              className="h-7 rounded-full border border-border bg-accent/30 px-3 text-xs font-bold text-muted-foreground focus:text-foreground focus:outline-none"
            >
              {SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
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
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Reference</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Source</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Method</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Fee</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.map((txn: TransactionItem) => (
                    <tr key={txn.id} className="hover:bg-accent/5 transition-colors cursor-pointer">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{txn.reference_id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                          <span className="capitalize text-xs font-medium">{txn.reference_type || 'payment'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">{txn.source_service || '—'}</td>
                      <td className="px-6 py-4 text-xs">{txn.payment_method}</td>
                      <td className="px-6 py-4 text-right font-bold text-xs">{txn.currency} {txn.amount}</td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">{txn.transaction_cost && parseFloat(txn.transaction_cost) > 0 ? `${txn.currency} ${txn.transaction_cost}` : '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={txn.status === 'succeeded' ? 'success' : txn.status === 'pending' || txn.status === 'processing' ? 'warning' : 'error'}>
                          {txn.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No transactions match your filters.</div>
            )}
          </div>
          {!isLoading && filtered.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
