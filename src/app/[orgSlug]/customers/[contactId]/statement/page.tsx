'use client';

import { useParams, useRouter } from 'next/navigation';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useCustomerStatement } from '@/hooks/use-arpa';
import type { StatementLine } from '@/lib/api/arpa';
import { ReportDocument, type ReportKpi } from '@/components/reports/ReportDocument';
import {
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/reports/ReportTable';
import { Button } from '@/components/ui/base';
import { money } from '@/components/charts/chart-theme';
import { ArrowLeft, Loader2 } from 'lucide-react';

const num = (v?: string) => (v ? parseFloat(v) || 0 : 0);

const columns: ReportTableColumn[] = [
  { header: 'Date', align: 'left' },
  { header: 'Type', align: 'left' },
  { header: 'Reference', align: 'left' },
  { header: 'Debit', align: 'right' },
  { header: 'Credit', align: 'right' },
  { header: 'Balance', align: 'right' },
  { header: 'Status', align: 'left' },
];

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '—');

function statementRows(lines: StatementLine[]): ReportTableRow[] {
  return lines.map((l, i) => ({
    key: `${l.reference}-${i}`,
    cells: [
      fmtDate(l.date),
      l.doc_type || '—',
      l.reference || '—',
      num(l.debit) ? money(num(l.debit)) : '—',
      num(l.credit) ? money(num(l.credit)) : '—',
      money(num(l.balance)),
      l.status || '—',
    ],
  }));
}

/**
 * Customer statement — full-page AR statement for a single CRM contact, rendered
 * through the shared ReportDocument (branded header + KPI strip + print/CSV) and
 * ReportTable (the dated debit/credit lines with running balance). Mirrors the
 * StatementDialog data shape; defaults to the backend's last-90-days window.
 */
export default function CustomerStatementPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const contactId = (params?.contactId as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data, isLoading, isError } = useCustomerStatement(
    effectiveTenant,
    contactId,
    undefined,
    !!effectiveTenant && !!contactId,
  );

  const lines = data?.lines ?? [];
  const closingBalance = num(data?.closing_balance);
  const totalInvoiced = num(data?.total_invoiced);
  // Opening = closing minus the net movement of the period's lines.
  const netMovement = lines.reduce((sum, l) => sum + num(l.debit) - num(l.credit), 0);
  const openingBalance = closingBalance - netMovement;

  const periodLabel =
    data?.from && data?.to ? `${fmtDate(data.from)} – ${fmtDate(data.to)}` : 'Last 90 days';

  const title = `Customer Statement${data?.customer_name ? ` — ${data.customer_name}` : ''}`;

  const rows = statementRows(lines);

  const kpis: ReportKpi[] = [
    { label: 'Opening Balance', value: money(openingBalance) },
    { label: 'Total Invoiced', value: money(totalInvoiced) },
    { label: 'Closing Balance', value: money(closingBalance), tone: 'primary' },
    { label: 'Transactions', value: lines.length },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="print-hidden">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${orgSlug}/customers`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Customers
        </Button>
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
        <ReportDocument
          title={title}
          periodLabel={periodLabel}
          kpis={kpis}
          csv={{
            filename: `customer-statement-${contactId}.csv`,
            title,
            periodLabel,
            columns,
            sections: [{ rows }],
          }}
        >
          <ReportTable
            columns={columns}
            sections={[{ title: 'Transactions', rows }]}
            grandTotal={{
              cells: ['', '', 'Closing Balance', '', '', money(closingBalance), ''],
            }}
          />
          {lines.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions in this period.
            </p>
          )}
        </ReportDocument>
      )}
    </div>
  );
}
