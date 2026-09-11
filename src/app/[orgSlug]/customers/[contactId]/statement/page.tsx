'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useCustomerStatement } from '@/hooks/use-arpa';
import { downloadCustomerStatement } from '@/lib/api/arpa';
import { buildStatementColumns, type StatementLineRow } from '@/components/statement-columns';
import { ReportDocument, type ReportKpi } from '@/components/reports/ReportDocument';
import { Button } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import { money } from '@/components/charts/chart-theme';
import { downloadBlob } from '@/lib/utils/download-blob';
import { ArrowLeft, Loader2, RefreshCw, FileDown, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const num = (v?: string) => (v ? parseFloat(v) || 0 : 0);
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—');
const PAGE_SIZE = 25;

/**
 * Customer statement — full-page AR statement for a single CRM contact: the branded
 * ReportDocument header/KPI strip (unchanged), the dated debit/credit lines rendered through the
 * shared-ui-lib DataTable with real server-side pagination, and PDF/CSV export wired to the
 * backend's branded document (.../statement/export) instead of window.print()/client-CSV — see
 * [[boi-treasury-pos-recurring-discrepancy-root-audit-2026-09-11]]/the 2026-09-12 statement
 * pagination+export work. Mirrors StatementDialog's data shape.
 */
export default function CustomerStatementPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const contactId = (params?.contactId as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isFetching } = useCustomerStatement(
    effectiveTenant,
    contactId,
    undefined,
    { page, limit: PAGE_SIZE },
    !!effectiveTenant && !!contactId,
  );

  const rows: StatementLineRow[] = useMemo(
    () => (data?.lines ?? []).map((l, i) => ({ ...l, _key: `${l.reference}-${l.date}-${i}` })),
    [data?.lines],
  );
  const columns = useMemo(() => buildStatementColumns('KES'), []);
  const totalCount = data?.total_lines ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const closingBalance = num(data?.closing_balance);
  const openingBalance = num(data?.opening_balance);
  const totalInvoiced = num(data?.total_invoiced);

  const periodLabel =
    data?.from && data?.to ? `${fmtDate(data.from)} – ${fmtDate(data.to)}` : 'Last 90 days';
  const title = `Customer Statement${data?.customer_name ? ` — ${data.customer_name}` : ''}`;

  const kpis: ReportKpi[] = [
    { label: 'Opening Balance', value: money(openingBalance) },
    { label: 'Total Invoiced', value: money(totalInvoiced) },
    { label: 'Closing Balance', value: money(closingBalance), tone: 'primary' },
    { label: 'Transactions', value: totalCount },
  ];

  const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });
  const [exportingCsv, setExportingCsv] = useState(false);
  const exportPdf = () => {
    if (!effectiveTenant) return;
    openPreview(
      () => downloadCustomerStatement(effectiveTenant, contactId, 'pdf').then((r) => r.blob),
      { fileName: `${data?.customer_name || 'customer'}-statement.pdf`, title },
    );
  };
  const exportCsv = async () => {
    if (!effectiveTenant) return;
    setExportingCsv(true);
    try {
      const { blob, fileName } = await downloadCustomerStatement(effectiveTenant, contactId, 'csv');
      downloadBlob(blob, fileName);
    } catch {
      toast.error('Failed to export the statement as CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="print-hidden flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${orgSlug}/customers`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Customers
        </Button>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exportingCsv}>
            {exportingCsv ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            )}
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => refetch()}
            title="Refresh — pulls the latest statement if a payment made elsewhere hasn't shown up yet"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading statement...
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load the statement. Please try again.
        </div>
      )}

      {!isLoading && !isError && data && (
        <ReportDocument title={title} periodLabel={periodLabel} kpis={kpis}>
          <DataTable<StatementLineRow>
            columns={columns}
            rows={rows}
            rowKey={(l) => l._key}
            loading={isLoading}
            loadingRows={8}
            emptyText="No transactions in this period."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            total={totalCount}
            storageKey="customer-statement-table"
          />
        </ReportDocument>
      )}
    </div>
  );
}
