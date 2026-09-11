'use client';

import { useMemo, useState } from 'react';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { useVendorStatement, useCustomerStatement } from '@/hooks/use-arpa';
import { downloadCustomerStatement } from '@/lib/api/arpa';
import { buildStatementColumns, type StatementLineRow } from '@/components/statement-columns';
import { formatCurrency } from '@/lib/utils/currency';
import { downloadBlob } from '@/lib/utils/download-blob';
import { Loader2, FileDown, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface BaseProps {
  open: boolean;
  onClose: () => void;
  tenant: string;
  /** The CRM contact / vendor UUID used by the statement endpoint. */
  entityId: string;
  /** Display name shown in the dialog header. */
  name?: string;
}

type StatementDialogProps =
  | (BaseProps & { kind: 'vendor' })
  | (BaseProps & { kind: 'customer' });

const num = (v?: string) => (v ? parseFloat(v) || 0 : 0);
const PAGE_SIZE = 10;

/**
 * StatementDialog renders an AR (customer) or AP (vendor) period statement: opening balance, the
 * dated transaction lines with running balance (shared-ui-lib DataTable, paginated), and the
 * closing balance. Defaults to the backend's last-90-days window.
 *
 * Customer statements page server-side (the backend, treasury-api arpa/statements.go, supports
 * page/limit) and offer PDF/CSV export via the branded backend document (.../statement/export) —
 * see [[boi-treasury-pos-recurring-discrepancy-root-audit-2026-09-11]]/the 2026-09-12 statement
 * pagination+export work. Vendor statements have no backend pagination/export yet, so they still
 * load every line and page CLIENT-side — same DataTable, same visual treatment, just a different
 * data source, so the UI stays uniform even though the vendor side wasn't in scope for the
 * backend change.
 */
export function StatementDialog(props: StatementDialogProps) {
  const { open, onClose, tenant, entityId, name, kind } = props;
  const isVendor = kind === 'vendor';
  const [page, setPage] = useState(1);

  const vendorQuery = useVendorStatement(tenant, entityId, undefined, open && isVendor);
  const customerQuery = useCustomerStatement(
    tenant,
    entityId,
    undefined,
    isVendor ? undefined : { page, limit: PAGE_SIZE },
    open && !isVendor,
  );
  const query = isVendor ? vendorQuery : customerQuery;
  const { data, isLoading, isFetching, isError } = query;

  const rows: StatementLineRow[] = useMemo(
    () => (data?.lines ?? []).map((l, i) => ({ ...l, _key: `${l.reference}-${l.date}-${i}` })),
    [data?.lines],
  );
  const allLines = data?.lines ?? [];
  // Customer: the backend already returned just this page. Vendor: slice client-side (no backend
  // pagination for AP yet) — either way, DataTable renders `rows` the same way.
  const pagedRows = isVendor ? rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : rows;
  const totalCount = isVendor
    ? rows.length
    : ((data as { total_lines?: number } | undefined)?.total_lines ?? rows.length);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const closingBalance = num(data?.closing_balance);
  const currency = 'KES'; // Statement DTOs carry no currency field; treasury defaults to KES.
  const columns = useMemo(() => buildStatementColumns(currency), [currency]);

  const heading = isVendor ? 'Vendor Statement' : 'Customer Statement';
  const total = isVendor
    ? num((data as { total_billed?: string } | undefined)?.total_billed)
    : num((data as { total_invoiced?: string } | undefined)?.total_invoiced);
  const totalLabel = isVendor ? 'Total billed' : 'Total invoiced';

  // Customer: the backend computes opening_balance from the FULL (pre-pagination) line set —
  // never re-derive it from `allLines`, which is just the current page once paginated.
  // Vendor has no backend field yet (no pagination there either), so it still derives locally
  // from the full (always-unpaginated) lines array — safe only because vendor never pages
  // server-side.
  const vendorNetMovement = allLines.reduce((sum, l) => sum + num(l.debit) - num(l.credit), 0);
  const openingBalance = isVendor
    ? closingBalance - vendorNetMovement
    : num((data as { opening_balance?: string } | undefined)?.opening_balance);

  const { openPreview, previewProps } = useDocumentPreview({
    onError: (m) => toast.error(m),
  });
  const [exportingCsv, setExportingCsv] = useState(false);
  const exportPdf = () => {
    openPreview(
      () => downloadCustomerStatement(tenant, entityId, 'pdf').then((r) => r.blob),
      { fileName: `${name || 'customer'}-statement.pdf`, title: heading },
    );
  };
  const exportCsv = async () => {
    setExportingCsv(true);
    try {
      const { blob, fileName } = await downloadCustomerStatement(tenant, entityId, 'csv');
      downloadBlob(blob, fileName);
    } catch {
      toast.error('Failed to export the statement as CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={heading}
        description={name || data?.from ? `${name ?? ''}` : undefined}
        onClose={onClose}
        className="max-w-3xl"
      >
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading statement...
          </div>
        )}

        {!isLoading && isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load the statement. Please try again.
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              {/* Period + summary strip */}
              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-accent/5 px-3 py-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Opening</p>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(openingBalance, currency)}</p>
                </div>
                <div className="rounded-lg border border-border bg-accent/5 px-3 py-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{totalLabel}</p>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(total, currency)}</p>
                </div>
                <div className="rounded-lg border border-border bg-primary/5 px-3 py-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Closing</p>
                  <p className="text-sm font-bold tabular-nums text-primary">{formatCurrency(closingBalance, currency)}</p>
                </div>
                <div className="rounded-lg border border-border bg-accent/5 px-3 py-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Lines</p>
                  <p className="text-sm font-bold tabular-nums">{totalCount}</p>
                </div>
              </div>

              {!isVendor && (
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="outline" size="sm" onClick={exportPdf} title="Download as PDF">
                    <FileDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportCsv} disabled={exportingCsv} title="Download as CSV">
                    {exportingCsv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
            </div>

            {data.from && data.to && (
              <p className="text-xs text-muted-foreground">
                Period: {new Date(data.from).toLocaleDateString()} – {new Date(data.to).toLocaleDateString()}
              </p>
            )}

            <DataTable<StatementLineRow>
              columns={columns}
              rows={pagedRows}
              rowKey={(l) => l._key}
              loading={isLoading}
              loadingRows={5}
              emptyText="No transactions in this period."
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
              total={totalCount}
              maxBodyHeight="360px"
            />
            {isFetching && !isLoading && (
              <p className="text-right text-[11px] text-muted-foreground">Refreshing…</p>
            )}

            {/* Closing footer */}
            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3 font-bold border border-primary/20">
              <span className="text-sm uppercase tracking-tight">Closing Balance</span>
              <span className="text-lg tabular-nums">{formatCurrency(closingBalance, currency)}</span>
            </div>
          </div>
        )}
      </DialogContent>
      <PdfPreview {...previewProps} />
    </Dialog>
  );
}
