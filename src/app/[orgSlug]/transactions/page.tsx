'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useTransactions } from '@/hooks/use-analytics';
import { usePlatformTransactions, getTransactionsExportURL } from '@/hooks/use-platform-analytics';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useAuthStore } from '@/store/auth';
import { exportTransactionsCSV, type TransactionItem } from '@/lib/api/analytics';
import { Pagination } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import {
    ArrowUpRight,
    Calendar,
    Download,
    Eye,
    FileText,
    Filter,
    Loader2,
    Receipt,
    Search,
    UserRound,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useGenerateReceiptFromIntent } from '@/hooks/use-invoices';
import { DocPreview } from '@/components/documents/DocPreview';
import { toast } from 'sonner';

const MARKETFLOW_UI_URL = process.env.NEXT_PUBLIC_MARKETFLOW_UI_URL ?? 'https://marketflow.codevertexitsolutions.com';

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
  { value: 'codevertex-website', label: 'Codevertex Website (Digitika)' },
];

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function TransactionsPage() {
  const user = useAuthStore((s) => s.user);
  const { tenantPathId, tenantIdsParam, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  // Receipt generation uses the resolved tenant: platform admins need a tenant selected.
  const receiptTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  // Tenant UUID for the ?tenantId= query param on generate-receipt.
  // Platform owners pass the selected tenant UUID so the backend resolves cross-tenant correctly.
  // Regular tenants pass their own UUID (from JWT) to bypass slug→UUID lookup.
  const receiptTenantId: string | undefined = isPlatformOwner
    ? (tenantQueryParam ?? undefined)
    : ((user as any)?.tenantId ?? (user as any)?.tenant_id ?? undefined);
  const generateReceiptMutation = useGenerateReceiptFromIntent(receiptTenant, receiptTenantId);
  const [previewReceiptId, setPreviewReceiptId] = useState<string | null>(null);
  const [detailTxn, setDetailTxn] = useState<TransactionItem | null>(null);
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
    <div className="p-6 space-y-6">
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
                    <th className="text-center px-3 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
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
                      <td className="px-3 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View details — all transactions */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="View transaction details"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDetailTxn(txn); }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {/* CRM contact link */}
                          {txn.crm_contact_id && (
                            <a
                              href={`${MARKETFLOW_UI_URL}/${orgSlug}/contacts/${txn.crm_contact_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View CRM contact"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                            >
                              <UserRound className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
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

      {/* Receipt DocPreview */}
      {previewReceiptId && receiptTenant && (
        <DocPreview
          docId={previewReceiptId}
          docType="payment_receipt"
          tenant={receiptTenant}
          onClose={() => setPreviewReceiptId(null)}
        />
      )}

      {/* Transaction detail drawer */}
      {detailTxn && (
        <div className="fixed inset-y-0 right-0 z-50 w-[380px] bg-card shadow-2xl border-l border-border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Transaction</p>
              <p className="text-sm font-mono font-bold truncate max-w-[280px]">{detailTxn.reference_id}</p>
            </div>
            <button
              onClick={() => setDetailTxn(null)}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Details */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                <Badge variant={detailTxn.status === 'succeeded' ? 'success' : detailTxn.status === 'pending' || detailTxn.status === 'processing' ? 'warning' : 'error'}>
                  {detailTxn.status}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Type</p>
                <p className="text-sm font-medium capitalize">{detailTxn.reference_type || 'payment'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
                <p className="text-sm font-bold">{detailTxn.currency} {detailTxn.amount}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fee</p>
                <p className="text-sm text-muted-foreground">
                  {detailTxn.transaction_cost && parseFloat(detailTxn.transaction_cost) > 0
                    ? `${detailTxn.currency} ${detailTxn.transaction_cost}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Method</p>
                <p className="text-sm capitalize">{detailTxn.payment_method}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Source</p>
                <p className="text-sm text-muted-foreground">{detailTxn.source_service || '—'}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date</p>
              <p className="text-sm">{new Date(detailTxn.created_at).toLocaleString()}</p>
            </div>

            {detailTxn.crm_contact_id && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">CRM Contact</p>
                <a
                  href={`${MARKETFLOW_UI_URL}/${orgSlug}/contacts/${detailTxn.crm_contact_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-2"
                >
                  <UserRound className="h-3.5 w-3.5" />
                  View CRM Contact
                </a>
              </div>
            )}
          </div>

          {/* Generate Receipt — only for succeeded or refunded */}
          {(detailTxn.status === 'succeeded' || detailTxn.status === 'refunded') && receiptTenant && (
            <div className="border-t border-border p-4">
              <Button
                className="w-full gap-2"
                disabled={generateReceiptMutation.isPending}
                onClick={() => {
                  generateReceiptMutation.mutate(detailTxn.id, {
                    onSuccess: (receipt) => {
                      setDetailTxn(null);
                      setPreviewReceiptId(receipt.id);
                    },
                    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to generate receipt'),
                  });
                }}
              >
                {generateReceiptMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Receipt className="h-4 w-4" />}
                {generateReceiptMutation.isPending ? 'Generating…' : 'Generate & View Receipt'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
