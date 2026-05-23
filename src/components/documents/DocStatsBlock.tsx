'use client';

import { useQuotationStats, useQuotationSummary, useInvoiceStats } from '@/hooks/use-invoices';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useState } from 'react';

type DocType = 'quotation' | 'invoice' | 'proforma_invoice' | 'credit_note' | 'debit_note' | 'sales_order';

const STATUS_PILL: Record<string, string> = {
  draft:     'bg-muted text-muted-foreground',
  sent:      'bg-primary/10 text-primary',
  viewed:    'bg-primary/10 text-primary',
  accepted:  'bg-green-500/10 text-green-500',
  declined:  'bg-destructive/10 text-destructive',
  expired:   'bg-yellow-500/10 text-yellow-600',
  converted: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
  paid:      'bg-green-500/10 text-green-500',
  overdue:   'bg-yellow-500/10 text-yellow-600',
  void:      'bg-destructive/10 text-destructive',
};
const statusPillClass = (s: string) => STATUS_PILL[s] ?? 'bg-muted text-muted-foreground';

const DOC_LABELS: Record<DocType, { count: string; amount: string }> = {
  quotation:        { count: 'Total Quotations',       amount: 'Total Quoted Amount' },
  invoice:          { count: 'Total Invoices',          amount: 'Total Billed' },
  proforma_invoice: { count: 'Total Proforma Invoices', amount: 'Total Proforma Amount' },
  credit_note:      { count: 'Total Credit Notes',      amount: 'Total Credit Amount' },
  debit_note:       { count: 'Total Debit Notes',       amount: 'Total Debit Amount' },
  sales_order:      { count: 'Total Sales Orders',      amount: 'Total Order Amount' },
};

interface DocStatsBlockProps {
  tenant: string;
  docType: DocType;
}

function useDocStats(tenant: string, docType: DocType) {
  const isQuotation = docType === 'quotation';
  const { data: qtStats } = useQuotationStats(tenant);
  const { data: qtSummary } = useQuotationSummary(tenant);
  const { data: invStats } = useInvoiceStats(tenant);

  if (isQuotation) {
    return {
      total_count: qtStats?.total_count,
      total_amount: qtStats?.total_amount,
      currency: qtStats?.currency,
      summary: qtSummary?.summary ?? [],
    };
  }
  return {
    total_count: invStats?.total_count,
    total_amount: invStats?.total_amount,
    currency: invStats?.currency,
    summary: [],
  };
}

export function DocStatsBlock({ tenant, docType }: DocStatsBlockProps) {
  const stats = useDocStats(tenant, docType);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const labels = DOC_LABELS[docType] ?? DOC_LABELS.invoice;
  const currency = stats.currency ?? 'KES';

  const fmt = (v: string | number | undefined) =>
    Number(v ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{labels.count}</p>
            <p className="text-2xl font-black text-foreground tabular-nums">{stats.total_count ?? 0}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <span className="text-green-500 font-black text-sm">{currency}</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{labels.amount}</p>
            <p className="text-2xl font-black text-foreground tabular-nums">{fmt(stats.total_amount)}</p>
          </div>
        </div>
      </div>

      {stats.summary.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setSummaryOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-foreground hover:bg-accent transition-colors"
          >
            <span>Document Summary</span>
            {summaryOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {summaryOpen && (
            <div className="px-5 pb-4 pt-1 border-t border-border flex flex-wrap gap-2">
              {stats.summary.map((item: { status: string; count: number }) => (
                <span
                  key={item.status}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold capitalize',
                    statusPillClass(item.status),
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
