'use client';

import { BarChart3, Download, TrendingUp, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useInvoiceStats } from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';

interface ReportsAndMoreProps {
  effectiveTenant: string;
}

export function ReportsAndMore({ effectiveTenant }: ReportsAndMoreProps) {
  const { orgSlug } = useResolvedTenant();
  const { data: stats } = useInvoiceStats(effectiveTenant);

  if (!effectiveTenant) return null;

  const currency = stats?.currency ?? 'KES';
  const fmt = (n: number | string | undefined) =>
    n != null ? `${currency} ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : '—';

  const reports = [
    {
      id: 'aging',
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      bg: 'bg-amber-50 border-amber-200',
      title: 'Accounts Receivable Aging',
      description: 'Outstanding invoices grouped by how long they have been unpaid (30/60/90+ days).',
      href: `/${orgSlug}/reports/aging`,
    },
    {
      id: 'revenue',
      icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
      bg: 'bg-emerald-50 border-emerald-200',
      title: 'Revenue Report',
      description: 'Monthly and annual revenue trends with per-customer breakdown.',
      href: `/${orgSlug}/reports`,
    },
    {
      id: 'overdue',
      icon: <AlertTriangle className="h-5 w-5 text-rose-500" />,
      bg: 'bg-rose-50 border-rose-200',
      title: 'Overdue Invoice Summary',
      description: 'All invoices past their due date with amount outstanding.',
      href: `/${orgSlug}/reports`,
    },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
          <BarChart3 className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Reports & More</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Invoice analytics, aging reports, and bulk export tools.
          </p>
        </div>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total Invoices', value: String(stats.total_count ?? 0) },
            { label: 'Total Billed', value: fmt(stats.total_amount) },
            { label: 'Amount Due', value: fmt(stats.amount_due) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-sm font-black text-foreground mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report cards */}
      <div className="space-y-3 mb-8">
        {reports.map((r) => (
          <a
            key={r.id}
            href={r.href}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${r.bg}`}>{r.icon}</div>
              <div>
                <p className="text-xs font-bold text-foreground">{r.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm">{r.description}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-3" />
          </a>
        ))}
      </div>

      {/* Bulk export */}
      <div className="rounded-xl border border-border bg-accent/20 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">Bulk Export</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Download all invoices in CSV or Excel format from the Overview tab using the Download As button.
        </p>
      </div>
    </div>
  );
}
