'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useTransactions } from '@/hooks/use-analytics';
import { usePlatformTransactions, getTransactionsExportURL } from '@/hooks/use-platform-analytics';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useAuthStore } from '@/store/auth';
import { exportTransactionsCSV, type TransactionItem } from '@/lib/api/analytics';
import { apiClient } from '@/lib/api/client';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildTransactionColumns } from './transaction-columns';
import { cn } from '@/lib/utils';
import {
    Calendar,
    Download,
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
import { useTransmitPosSaleNow } from '@/hooks/use-tax';
import { DocPreview } from '@/components/documents/DocPreview';
import { EtimsResponseModal, type EtimsResponseRow } from '@/components/tax/etims-response-modal';
import { StatementDialog } from '@/components/statement-dialog';
import { ManualConfirmModal } from '@/components/transactions/manual-confirm-modal';
import { toast } from 'sonner';

const MARKETFLOW_UI_URL = process.env.NEXT_PUBLIC_MARKETFLOW_UI_URL ?? 'https://marketflow.codevertexafrica.com';

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
  const { tenantPathId, tenantIdsParam, isPlatformOwner, isAllTenants, tenantQueryParam, orgSlug } = useResolvedTenant();
  // Aggregate only when the platform owner explicitly picks "All Tenants".
  const isAggregate = isPlatformOwner && isAllTenants;
  // Own-tenant scope: selected tenant (drill-down) or the owner's org by default.
  const txnTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  // Receipt generation uses the resolved tenant: own org by default, or the drilled-in tenant.
  // (Empty in the explicit All-Tenants aggregate, where a tenant must be picked first.)
  const receiptTenant = isAggregate ? (tenantQueryParam ?? '') : txnTenant;
  // Tenant UUID for the ?tenantId= query param on generate-receipt.
  // Platform owners pass the selected tenant UUID so the backend resolves cross-tenant correctly.
  // Regular tenants pass their own UUID (from JWT) to bypass slug→UUID lookup.
  const receiptTenantId: string | undefined = isPlatformOwner
    ? (tenantQueryParam ?? undefined)
    : ((user as any)?.tenantId ?? (user as any)?.tenant_id ?? undefined);
  const generateReceiptMutation = useGenerateReceiptFromIntent(receiptTenant, receiptTenantId);
  // Manual "Generate ETR Receipt" — fiscalises a POS sale's already-queued eTIMS record now,
  // regardless of the tenant's automatic-sync setting (an explicit user action).
  const transmitPosSaleMutation = useTransmitPosSaleNow(receiptTenant);
  const [etrResult, setEtrResult] = useState<{ rows: EtimsResponseRow[]; payload: unknown } | null>(null);
  const [previewReceiptId, setPreviewReceiptId] = useState<string | null>(null);
  const [detailTxn, setDetailTxn] = useState<TransactionItem | null>(null);
  // The AR statement is keyed on the CRM contact UUID (see StatementDialog / ClientsManager's
  // identical pattern) — tenant resolves from the TRANSACTION's own tenant_id when present (the
  // platform-owner all-tenants aggregate lists rows across many tenants) so a row for tenant B
  // never queries tenant A's (the viewer's own org) AR data. Falls back to the page's resolved
  // tenant for the ordinary single-tenant view, where tenant_id may be absent.
  const [statementTxn, setStatementTxn] = useState<{ id: string; name: string; tenant: string } | null>(null);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [manualConfirmTxn, setManualConfirmTxn] = useState<TransactionItem | null>(null);
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

  const platformResult = usePlatformTransactions(isAggregate ? platformParams : undefined);
  const tenantResult = useTransactions(txnTenant, tenantParams, !isAggregate && !!txnTenant);

  const isLoading = isAggregate ? platformResult.isLoading : tenantResult.isLoading;
  const error = isAggregate ? platformResult.error : tenantResult.error;
  const list: TransactionItem[] = isAggregate
    ? (platformResult.data?.data ?? [])
    : (tenantResult.data?.transactions ?? []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (txn: TransactionItem) =>
        txn.reference_id?.toLowerCase().includes(q) ||
        txn.source_service?.toLowerCase().includes(q) ||
        txn.provider_reference?.toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const handleCheckStatus = async (txn: TransactionItem) => {
    const tenantId = txn.tenant_id;
    if (!tenantId) { toast.error('Tenant ID not available for this transaction'); return; }
    setCheckingStatusId(txn.id);
    try {
      // The public /pay/{tenant}/intents/... namespace (used by the buyer-facing checkout page)
      // has no check-status route at all — this admin action needs the JWT-authenticated
      // treasury.payments.* route instead, the same one live-verified against real M-Pesa
      // transactions this session (Daraja Transaction Status Query, keyed by the intent's own
      // stored receipt/provider reference).
      const res = await apiClient.post<{ success: boolean; error?: string }>(
        `/api/v1/${tenantId}/payments/intents/${txn.id}/check-status`,
        {},
      );
      if (!res.success) {
        toast.error(res.error || 'Status check failed');
        return;
      }
      toast.success('Status query sent to Daraja — the transaction status will update shortly via webhook');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Status check failed');
    } finally {
      setCheckingStatusId(null);
    }
  };

  // Opens ManualConfirmModal, which tries the real Transaction Status Query with a
  // staff-provided code FIRST, and only offers the unverified manual override as a fallback.
  const handleConfirmManual = (txn: TransactionItem) => {
    if (!txn.tenant_id) { toast.error('Tenant ID not available for this transaction'); return; }
    setManualConfirmTxn(txn);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useMemo(() => { setPage(1); }, [searchQuery, statusFilter, typeFilter, serviceFilter]);

  const columns = useMemo(
    () =>
      buildTransactionColumns({
        orgSlug,
        onViewDetail: (txn) => setDetailTxn(txn),
        onCheckStatus: (txn) => void handleCheckStatus(txn),
        onConfirmManual: (txn) => void handleConfirmManual(txn),
        onStatementClick: (txn) => {
          if (txn.crm_contact_id) {
            setStatementTxn({
              id: txn.crm_contact_id,
              name: txn.customer_name || 'Customer',
              tenant: txn.tenant_id || txnTenant || '',
            });
          }
        },
        checkingStatusId,
      }),
    [orgSlug, txnTenant, checkingStatusId],
  );

  const statusOptions = ['all', 'succeeded', 'pending', 'processing', 'failed', 'cancelled'];
  const methodOptions = ['all', 'mpesa', 'card', 'cash', 'bank_transfer', 'cod'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            {isAggregate
              ? 'All payment transactions across all tenants and gateways.'
              : 'View and filter all payment transactions across gateways.'}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            if (isAggregate) {
              const url = getTransactionsExportURL(
                dateRange.from, dateRange.to,
                statusFilter !== 'all' ? statusFilter : undefined,
                serviceFilter !== 'all' ? serviceFilter : undefined,
                tenantIdsParam || undefined,
              );
              window.open(url, '_blank');
            } else if (txnTenant) {
              exportTransactionsCSV(txnTenant, tenantParams);
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
          <div className="px-2 pb-2">
            <DataTable<TransactionItem>
              columns={columns}
              rows={paginatedItems}
              rowKey={(txn) => txn.id}
              loading={isLoading}
              loadingRows={8}
              storageKey="transactions-table"
              showExportCsv
              exportFileName="transactions"
              emptyText="No transactions match your filters."
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={filtered.length}
              pageSize={ITEMS_PER_PAGE}
            />
          </div>
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

      {/* Confirm M-Pesa payment — verify-first, manual-override-fallback modal */}
      {manualConfirmTxn && manualConfirmTxn.tenant_id && (
        <ManualConfirmModal
          open={!!manualConfirmTxn}
          onClose={() => setManualConfirmTxn(null)}
          tenant={manualConfirmTxn.tenant_id}
          intentId={manualConfirmTxn.id}
          onConfirmed={() => setManualConfirmTxn(null)}
        />
      )}

      {/* Customer AR statement — opened from the Customer column, keyed on crm_contact_id */}
      {statementTxn && statementTxn.tenant && (
        <StatementDialog
          kind="customer"
          open={!!statementTxn}
          onClose={() => setStatementTxn(null)}
          tenant={statementTxn.tenant}
          entityId={statementTxn.id}
          name={statementTxn.name}
        />
      )}

      {/* ETR receipt result — KRA eTIMS fiscal evidence for a manually-generated POS receipt */}
      {etrResult && (
        <EtimsResponseModal
          open={!!etrResult}
          onClose={() => setEtrResult(null)}
          title="ETR Receipt (KRA eTIMS)"
          rows={etrResult.rows}
          payload={etrResult.payload}
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

            {detailTxn.provider_reference && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {detailTxn.payment_method?.includes('mpesa') ? 'M-Pesa Receipt No.' : 'Provider Reference'}
                </p>
                <p className="text-sm font-mono font-medium text-green-700 dark:text-green-400">{detailTxn.provider_reference}</p>
              </div>
            )}

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

          {/* Generate ETR Receipt (KRA eTIMS) — manual, on-demand, POS sales only. Works
              regardless of the tenant's automatic-sync setting; reuses the same queued eTIMS
              record the sale created (or would have created) at checkout. */}
          {(detailTxn.status === 'succeeded' || detailTxn.status === 'refunded') &&
            detailTxn.source_service === 'pos' && detailTxn.reference_id && receiptTenant && (
            <div className="border-t border-border p-4">
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={transmitPosSaleMutation.isPending}
                onClick={() => {
                  transmitPosSaleMutation.mutate(detailTxn.reference_id, {
                    onSuccess: (info) => {
                      setDetailTxn(null);
                      setEtrResult({
                        rows: [
                          { label: 'CU Invoice No.', value: info.cu_invoice_no, mono: true },
                          { label: 'Receipt No.', value: info.receipt_no, mono: true },
                          { label: 'KRA PIN', value: info.kra_pin, mono: true },
                          { label: 'Branch', value: info.branch_id, mono: true },
                          { label: 'Device Serial', value: info.device_serial, mono: true },
                          { label: 'Signature', value: info.signature, mono: true },
                          { label: 'Transmitted at', value: info.transmitted_at },
                        ],
                        payload: info,
                      });
                    },
                    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to generate ETR receipt'),
                  });
                }}
              >
                {transmitPosSaleMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <FileText className="h-4 w-4" />}
                {transmitPosSaleMutation.isPending ? 'Generating…' : 'Generate ETR Receipt'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
