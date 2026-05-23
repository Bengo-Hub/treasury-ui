'use client';

import { useQuotationStats, useQuotationSummary } from '@/hooks/use-invoices';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const STATUS_PILL: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  sent:      'bg-primary/10 text-primary',
  viewed:    'bg-primary/10 text-primary',
  accepted:  'bg-green-500/10 text-green-500',
  declined:  'bg-destructive/10 text-destructive',
  expired:   'bg-yellow-500/10 text-yellow-600',
  converted: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
};
const statusPillClass = (s: string) => STATUS_PILL[s] ?? 'bg-muted text-muted-foreground';

interface Props { tenant: string }

export function QuotationStatsBlock({ tenant }: Props) {
  const { data: stats } = useQuotationStats(tenant);
  const { data: summaryData } = useQuotationSummary(tenant);
  const [summaryOpen, setSummaryOpen] = useState(true);

  const summary = summaryData?.summary ?? [];
  const currency = stats?.currency ?? 'KES';

  const fmt = (v: string | number) =>
    Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-3">
      {/* Lifetime stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Quotations</p>
            <p className="text-2xl font-black text-foreground tabular-nums">{stats?.total_count ?? 0}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <span className="text-green-500 font-black text-sm">{currency}</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Quoted Amount</p>
            <p className="text-2xl font-black text-foreground tabular-nums">
              {fmt(stats?.total_amount ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Quotation Summary collapsible */}
      {summary.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setSummaryOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-foreground hover:bg-accent transition-colors"
          >
            <span>Quotation Summary</span>
            {summaryOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {summaryOpen && (
            <div className="px-5 pb-4 pt-1 border-t border-border flex flex-wrap gap-2">
              {summary.map(item => (
                <span
                  key={item.status}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold capitalize',
                    statusPillClass(item.status)
                  )}
                >
                  {item.status}
                  <span className="font-black">{item.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
