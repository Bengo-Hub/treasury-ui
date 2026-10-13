'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { PayBillDialog } from '@/components/bills/PayBillDialog';
import { RaiseDebitNoteDialog } from '@/components/bills/RaiseDebitNoteDialog';
import { ViewBillPaymentsModal } from '@/components/bills/ViewBillPaymentsModal';
import { DocumentApprovalModal } from '@/components/documents/DocumentApprovalModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { billDocContext, billDocType, buildAgingColumns, buildBillColumns } from './bill-columns';
import { bindDocumentActions } from '@/hooks/use-document-actions';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useBills, useAPAging, useVoidBill } from '@/hooks/use-bills';
import { useTransmitVendorBill, useIsEtimsActive } from '@/hooks/use-tax';
import { isDebitNote, type Bill } from '@/lib/api/bills';
import { downloadBillPdf } from '@/lib/api/documents';
import { cn } from '@/lib/utils';
import {
  Ban,
  CreditCard,
  FileMinus,
  FileText,
  Filter,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

export default function BillsPage() {
  const router = useRouter();
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'bill' | 'credit_note'>('all');
  const [page, setPage] = useState(1);
  // Deep link from the dashboard payables list: /bills?pay=<billID> opens the Pay dialog on load.
  const searchParams = useSearchParams();
  const [payBillId, setPayBillId] = useState<string | null>(() => searchParams?.get('pay') ?? null);
  const [approvalFor, setApprovalFor] = useState<{ tenant: string; billId: string; billNumber: string } | null>(null);
  const [viewPaymentsBill, setViewPaymentsBill] = useState<Bill | null>(null);
  const [debitNoteBill, setDebitNoteBill] = useState<Bill | null>(null);
  const [voidTarget, setVoidTarget] = useState<Bill | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const voidBill = useVoidBill(effectiveTenant);
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });

  // Search/status/page all go straight to the backend — ListBills already runs this through
  // pagination.Parse with a true total, and now supports a real DB-level `search` (matches the
  // bill's own number or vendor name). Previously this only sent `status`, so the backend's own
  // default page size silently capped every load, and the on-screen search box + pager only ever
  // filtered/sliced that already-truncated set in memory, with a fake total from its length.
  const queryParams = useMemo(() => ({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
    page,
    limit: ITEMS_PER_PAGE,
  }), [statusFilter, searchQuery, page]);

  const { data, isLoading, error } = useBills(effectiveTenant, queryParams, !!effectiveTenant);
  const { data: agingData } = useAPAging(effectiveTenant, !!effectiveTenant);

  const list = useMemo(() => data?.data ?? [], [data]);
  const agingRows = agingData?.rows ?? [];

  // Note: the bills list endpoint does not support a document_type query filter (BillFilters has
  // no DocumentType), so type filtering narrows client-side, scoped to the current backend page
  // only — the same tradeoff this codebase's own Expenses page accepts for its funnel filters.
  const filtered = useMemo(() => {
    if (typeFilter === 'all') return list;
    return list.filter((bill: Bill) => (bill.document_type ?? 'bill') === typeFilter);
  }, [list, typeFilter]);

  const total = data?.total ?? filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));


  // The bill statuses the backend stores (ent vendor_bill.status); "cancelled" is a voided bill.
  const statusOptions = ['all', 'draft', 'received', 'approved', 'partial', 'paid', 'overdue', 'cancelled'];
  const typeOptions: { value: 'all' | 'bill' | 'credit_note'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'bill', label: 'Bills' },
    { value: 'credit_note', label: 'Credit / Debit Notes' },
  ];

  const transmit = useTransmitVendorBill();
  // Gate the per-row eTIMS action on the tenant actually having an active device — a tenant
  // that hasn't integrated with KRA yet should never see a "Transmit" button that can only fail.
  const { isActive: etimsActive } = useIsEtimsActive(effectiveTenant);

  // The bill the Pay dialog is settling, resolved from the loaded list (covers both the
  // row-level "Pay" click and the ?pay=<billID> deep link).
  const payTarget = useMemo(() => list.find((b: Bill) => b.id === payBillId) ?? null, [list, payBillId]);

  const goToNewPurchase = () => router.push(`/${orgSlug}/bills/new`);

  // Row actions, gated by the central policy (lib/documents/actions.ts, vendor_bill/vendor_credit)
  // and rendered in the same three-dot menu as the invoices list.
  const billActions = useMemo(
    () =>
      bindDocumentActions<Bill>(billDocType, (b) => billDocContext(b, etimsActive), {
        download_pdf: {
          label: 'View PDF',
          icon: <FileText className="h-4 w-4" />,
          onClick: (b) => {
            const name = b.bill_number || 'bill';
            openPreview(() => downloadBillPdf(effectiveTenant, b.id, name).then((r) => r.blob), {
              fileName: `${name}.pdf`,
              title: isDebitNote(b) ? `Debit note ${name}` : `Bill ${name}`,
            });
          },
        },
        submit_for_approval: {
          label: 'Submit for approval',
          icon: <ShieldCheck className="h-4 w-4" />,
          // Centralized approval (submit / approve / reject), the same DocumentApprovalModal
          // invoices use, module="vendor_bill".
          onClick: (b) => setApprovalFor({ tenant: effectiveTenant, billId: b.id, billNumber: b.bill_number }),
        },
        record_payment: { label: 'Pay', icon: <CreditCard className="h-4 w-4" />, onClick: (b) => setPayBillId(b.id) },
        view_payments: { label: 'View payments', icon: <Receipt className="h-4 w-4" />, onClick: (b) => setViewPaymentsBill(b) },
        transmit_etims: {
          label: 'Send to KRA eTIMS',
          icon: <Upload className="h-4 w-4" />,
          onClick: (b) => transmit.mutate({ tenantSlug: effectiveTenant, billId: b.id }),
        },
        create_debit_note: { label: 'Raise debit note', icon: <FileMinus className="h-4 w-4" />, onClick: (b) => setDebitNoteBill(b) },
        void: {
          label: 'Void',
          icon: <Ban className="h-4 w-4" />,
          destructive: true,
          onClick: (b) => {
            setVoidReason('');
            setVoidTarget(b);
          },
        },
      }),
    [effectiveTenant, etimsActive, openPreview, transmit],
  );
  const billColumns = useMemo(() => buildBillColumns(billActions), [billActions]);
  const agingColumns = useMemo(() => buildAgingColumns(), []);

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
            <div className="px-2 pb-2">
              <DataTable
                columns={agingColumns}
                rows={agingRows}
                rowKey={(r) => r.entity_id}
                storageKey="bills-aging-table"
              />
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
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
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
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
                onClick={() => {
                  setTypeFilter(t.value);
                  setPage(1);
                }}
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
          <div className="px-2 pb-2">
            <DataTable<Bill>
              columns={billColumns}
              rows={filtered}
              rowKey={(b) => b.id}
              loading={isLoading}
              loadingRows={8}
              storageKey="bills-table"
              showExportCsv
              exportFileName="bills"
              emptyText="No bills match your filters."
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
              pageSize={ITEMS_PER_PAGE}
            />
          </div>
        </CardContent>
      </Card>
      )}

      <PayBillDialog
        tenant={effectiveTenant}
        orgSlug={orgSlug}
        bill={payTarget}
        onClose={() => setPayBillId(null)}
      />

      {viewPaymentsBill && (
        <ViewBillPaymentsModal
          tenant={effectiveTenant}
          bill={viewPaymentsBill}
          onClose={() => setViewPaymentsBill(null)}
        />
      )}

      <PdfPreview {...previewProps} />

      <RaiseDebitNoteDialog key={debitNoteBill?.id ?? 'none'} tenant={effectiveTenant} bill={debitNoteBill} onClose={() => setDebitNoteBill(null)} />

      <ConfirmDialog
        open={!!voidTarget}
        onOpenChange={(o) => !o && !voidBill.isPending && setVoidTarget(null)}
        title={voidTarget ? `Void ${isDebitNote(voidTarget) ? 'debit note' : voidTarget.document_type === 'credit_note' ? 'credit note' : 'bill'} ${voidTarget.bill_number}?` : 'Void'}
        description="This reverses its journal and takes it off the supplier's balance. A bill already sent to KRA eTIMS cannot be voided; raise a debit note against it instead."
        confirmLabel="Void"
        destructive
        isPending={voidBill.isPending}
        onConfirm={() =>
          voidTarget &&
          voidBill.mutate({ billId: voidTarget.id, reason: voidReason.trim() || undefined }, { onSuccess: () => setVoidTarget(null) })
        }
      >
        <textarea
          className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none min-h-[64px]"
          placeholder="Reason (optional)"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
        />
      </ConfirmDialog>

      {approvalFor && (
        <DocumentApprovalModal
          open
          onClose={() => setApprovalFor(null)}
          tenant={approvalFor.tenant}
          module="vendor_bill"
          documentId={approvalFor.billId}
          documentReference={approvalFor.billNumber}
        />
      )}
    </div>
  );
}
