'use client';

import { useQuotationStats, useQuotationSummary } from '@/hooks/use-invoices';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-700',
  sent:      'bg-blue-50 text-blue-700',
  accepted:  'bg-emerald-50 text-emerald-700',
  declined:  'bg-red-50 text-red-700',
  expired:   'bg-amber-50 text-amber-700',
  converted: 'bg-violet-50 text-violet-700',
  cancelled: 'bg-rose-50 text-rose-700',
};

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
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quotations</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums">{stats?.total_count ?? 0}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 font-black text-sm">{currency}</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quoted Amount</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums">
              {fmt(stats?.total_amount ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Quotation Summary collapsible */}
      {summary.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setSummaryOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50/60 transition-colors">
            <span>Quotation Summary</span>
            {summaryOpen
              ? <ChevronUp className="h-4 w-4 text-slate-400" />
              : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {summaryOpen && (
            <div className="px-5 pb-4 pt-1 border-t border-slate-100 flex flex-wrap gap-2">
              {summary.map(item => (
                <span key={item.status}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold capitalize',
                    STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-700'
                  )}>
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
