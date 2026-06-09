'use client';

import { BarChart3, Download, TrendingUp, Clock, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useInvoiceStats, useInvoiceGraph, useInvoiceSummary, useARSummary, useARAging } from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { listInvoices } from '@/lib/api/invoices';
import { useState } from 'react';

interface ReportsAndMoreProps {
  effectiveTenant: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted-foreground/40',
  sent: 'bg-blue-500',
  paid: 'bg-emerald-500',
  partial: 'bg-amber-500',
  overdue: 'bg-rose-500',
  void: 'bg-muted-foreground/30',
  cancelled: 'bg-muted-foreground/30',
};

export function ReportsAndMore({ effectiveTenant }: ReportsAndMoreProps) {
  const { orgSlug } = useResolvedTenant();
  const enabled = !!effectiveTenant;
  const { data: stats } = useInvoiceStats(effectiveTenant, 'standard,pos_receipt,subscription', enabled);
  const { data: graph } = useInvoiceGraph(effectiveTenant, enabled);
  const { data: summary } = useInvoiceSummary(effectiveTenant, enabled);
  const { data: ar } = useARSummary(effectiveTenant, enabled);
  const { data: aging } = useARAging(effectiveTenant, enabled);
  const [exporting, setExporting] = useState(false);

  if (!effectiveTenant) return null;

  const currency = stats?.currency ?? 'KES';
  const fmt = (n: number | string | undefined) =>
    n != null ? `${currency} ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  const kpis = [
    { label: 'Total Invoices', value: String(stats?.total_count ?? 0) },
    { label: 'Total Billed', value: fmt(stats?.total_amount) },
    { label: 'Amount Paid', value: fmt(stats?.amount_paid) },
    { label: 'Amount Due', value: fmt(stats?.amount_due), danger: true },
  ];

  const graphPoints = graph?.graph ?? [];
  const maxRev = Math.max(1, ...graphPoints.map(p => Number(p.total_amount)));
  const statusRows = (summary?.summary ?? []).filter(s => s.count > 0);
  const maxStatus = Math.max(1, ...statusRows.map(s => s.count));

  // Aggregate aging buckets across all customers.
  const agingTotals = (aging?.rows ?? []).reduce(
    (acc, r) => ({
      current: acc.current + Number(r.current),
      d30: acc.d30 + Number(r.days_1_to_30),
      d60: acc.d60 + Number(r.days_31_to_60),
      d90: acc.d90 + Number(r.days_61_to_90),
      over90: acc.over90 + Number(r.over_90),
    }),
    { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 },
  );
  const agingBuckets = [
    { label: 'Current', value: agingTotals.current, color: 'bg-emerald-500' },
    { label: '1–30 days', value: agingTotals.d30, color: 'bg-amber-400' },
    { label: '31–60 days', value: agingTotals.d60, color: 'bg-amber-500' },
    { label: '61–90 days', value: agingTotals.d90, color: 'bg-orange-500' },
    { label: '90+ days', value: agingTotals.over90, color: 'bg-rose-500' },
  ];
  const agingMax = Math.max(1, ...agingBuckets.map(b => b.value));
  const hasAging = agingBuckets.some(b => b.value > 0);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await listInvoices(effectiveTenant, { types: 'standard,pos_receipt,subscription', limit: 1000 });
      const rows = res.invoices ?? [];
      const header = ['Invoice #', 'Date', 'Due Date', 'Customer', 'Status', 'Payment', 'Currency', 'Total'];
      const csv = [
        header.join(','),
        ...rows.map(r =>
          [r.invoice_number, r.invoice_date?.slice(0, 10), r.due_date?.slice(0, 10), `"${(r.customer_name ?? '').replace(/"/g, '""')}"`, r.status, r.payment_status, r.currency, r.total_amount].join(','),
        ),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-${effectiveTenant}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <BarChart3 className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Reports &amp; More</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Invoice analytics, receivables aging and export tools.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={`text-base font-black mt-1 ${s.danger ? 'text-rose-500' : 'text-foreground'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* AR receivables strip (paid feature — only when available) */}
      {ar && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Receivable', value: fmt(ar.total_receivable) },
            { label: 'Overdue', value: fmt(ar.overdue), danger: true },
            { label: 'Due This Week', value: fmt(ar.due_this_week) },
            { label: 'Open Invoices', value: String(ar.open_invoices ?? 0) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-accent/20 px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={`text-sm font-black mt-1 ${s.danger ? 'text-rose-500' : 'text-foreground'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Revenue trend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-foreground">Revenue Trend</h3>
            <span className="text-[10px] text-muted-foreground ml-auto">Monthly billed amount</span>
          </div>
          {graphPoints.length ? (
            <div className="flex items-end gap-2 h-40">
              {graphPoints.map((p) => (
                <div key={p.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="w-full rounded-t bg-emerald-500/80 group-hover:bg-emerald-500 transition-colors relative"
                    style={{ height: `${Math.max(4, (Number(p.total_amount) / maxRev) * 130)}px` }}
                    title={`${p.month}: ${fmt(p.total_amount)} (${p.count} invoices)`} />
                  <span className="text-[9px] text-muted-foreground">{p.month.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-10 text-center">No revenue data yet.</p>
          )}
        </div>

        {/* Status breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-bold text-foreground">Invoices by Status</h3>
          </div>
          {statusRows.length ? (
            <div className="space-y-2.5">
              {statusRows.map((s) => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground w-20 capitalize shrink-0">{s.status}</span>
                  <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${STATUS_COLORS[s.status] ?? 'bg-primary'}`} style={{ width: `${(s.count / maxStatus) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-foreground w-8 text-right shrink-0">{s.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-10 text-center">No invoices yet.</p>
          )}
        </div>
      </div>

      {/* AR Aging */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-amber-500" />
          <h3 className="text-xs font-bold text-foreground">Accounts Receivable Aging</h3>
          <span className="text-[10px] text-muted-foreground ml-auto">Outstanding by days overdue</span>
        </div>
        {hasAging ? (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {agingBuckets.map((b) => (
              <div key={b.label} className="space-y-2">
                <div className="flex items-end justify-between">
                  <span className="text-[11px] text-muted-foreground">{b.label}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${b.color}`} style={{ width: `${(b.value / agingMax) * 100}%` }} />
                </div>
                <p className="text-xs font-bold text-foreground">{fmt(b.value)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
            <AlertTriangle className="h-4 w-4" />
            No outstanding receivables, or AR aging is not enabled for this plan.
          </div>
        )}
      </div>

      {/* Links + export */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href={`/${orgSlug}/reports`}
          className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg border bg-blue-500/10 border-blue-500/20"><BarChart3 className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs font-bold text-foreground">Financial Statements</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Profit &amp; Loss, Balance Sheet, Cash Flow, Tax Summary.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-3" />
        </a>

        <button onClick={exportCsv} disabled={exporting}
          className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all group text-left disabled:opacity-60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg border bg-emerald-500/10 border-emerald-500/20">
              {exporting ? <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" /> : <Download className="h-5 w-5 text-emerald-500" />}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Export Invoices (CSV)</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Download all invoices for this tenant as a spreadsheet.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-3" />
        </button>
      </div>
    </div>
  );
}
