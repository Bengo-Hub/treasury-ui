'use client';

import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useARSummary, useARAging } from '@/hooks/use-invoices';
import { useAPSummary } from '@/hooks/use-arpa';
import { useAPAging } from '@/hooks/use-bills';
import { StatCard } from '@/components/charts/StatCard';
import { ReportTable, type ReportTableColumn, type ReportTableRow } from '@/components/reports/ReportTable';
import { money } from '@/components/charts/chart-theme';
import { Banknote, Clock, AlertTriangle, FileText } from 'lucide-react';

const agingColumns: ReportTableColumn[] = [
  { header: 'Party', align: 'left' },
  { header: 'Current', align: 'right' },
  { header: '1–30', align: 'right' },
  { header: '31–60', align: 'right' },
  { header: '61–90', align: 'right' },
  { header: '90+', align: 'right' },
  { header: 'Total', align: 'right' },
];

const n = (v: string | number | undefined) => {
  const x = typeof v === 'string' ? parseFloat(v) : v ?? 0;
  return Number.isFinite(x) ? x : 0;
};

interface AgingRowLike {
  entity_name: string; current: string; days_1_to_30: string; days_31_to_60: string;
  days_61_to_90: string; over_90: string; total: string;
}

function agingRows(rows: AgingRowLike[] | undefined): ReportTableRow[] {
  return (rows ?? []).map((r) => ({
    cells: [
      r.entity_name,
      money(n(r.current)), money(n(r.days_1_to_30)), money(n(r.days_31_to_60)),
      money(n(r.days_61_to_90)), money(n(r.over_90)), money(n(r.total)),
    ],
  }));
}

/**
 * Receivables & Payables — AR/AP summary KPIs + aging buckets in one place, wiring the existing
 * /ar/summary, /ar/aging, /ap/summary, /ap/aging endpoints (previously only shown inline on the
 * invoices/bills pages). Reuses StatCard + ReportTable.
 */
export default function ReceivablesPayablesPage() {
  const { tenantPathId } = useResolvedTenant();
  const ar = useARSummary(tenantPathId);
  const arAging = useARAging(tenantPathId);
  const ap = useAPSummary(tenantPathId);
  const apAging = useAPAging(tenantPathId);

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Accounts Receivable */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Accounts Receivable</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Receivable" value={money(n(ar.data?.total_receivable))} tone="primary" loading={ar.isLoading} icon={<Banknote className="h-5 w-5" />} />
          <StatCard label="Overdue" value={money(n(ar.data?.overdue))} tone="destructive" loading={ar.isLoading} icon={<AlertTriangle className="h-5 w-5" />} />
          <StatCard label="Due This Week" value={money(n(ar.data?.due_this_week))} tone="warning" loading={ar.isLoading} icon={<Clock className="h-5 w-5" />} />
          <StatCard label="Open Invoices" value={ar.data?.open_invoices ?? 0} hint={`${ar.data?.customer_count ?? 0} customers`} loading={ar.isLoading} icon={<FileText className="h-5 w-5" />} />
        </div>
        {arAging.isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        ) : (
          <ReportTable columns={agingColumns} sections={[{ title: 'AR Aging by customer', rows: agingRows(arAging.data?.rows) }]} />
        )}
      </section>

      {/* Accounts Payable */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Accounts Payable</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Payable" value={money(n(ap.data?.total_payable))} tone="primary" loading={ap.isLoading} icon={<Banknote className="h-5 w-5" />} />
          <StatCard label="Overdue" value={money(n(ap.data?.overdue))} tone="destructive" loading={ap.isLoading} icon={<AlertTriangle className="h-5 w-5" />} />
          <StatCard label="Due This Week" value={money(n(ap.data?.due_this_week))} tone="warning" loading={ap.isLoading} icon={<Clock className="h-5 w-5" />} />
          <StatCard label="Open Bills" value={ap.data?.open_bills ?? 0} hint={`${ap.data?.vendor_count ?? 0} vendors`} loading={ap.isLoading} icon={<FileText className="h-5 w-5" />} />
        </div>
        {apAging.isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        ) : (
          <ReportTable columns={agingColumns} sections={[{ title: 'AP Aging by vendor', rows: agingRows(apAging.data?.rows) }]} />
        )}
      </section>
    </div>
  );
}
