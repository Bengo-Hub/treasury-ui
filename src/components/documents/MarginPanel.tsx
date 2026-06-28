'use client';

/**
 * Business-only margin reporting for quotation/invoice lines.
 *
 * IMPORTANT: cost / margin figures are INTERNAL ONLY. This component is rendered
 * exclusively inside the app UI (create/edit form + detail/preview views) and must
 * NEVER be placed on the customer-facing PDF / ReportDocument output.
 */

import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MarginLineInput {
  description?: string;
  quantity: number;
  unit_price: number;
  /** undefined when no cost is known for the line. */
  unit_cost?: number;
}

export interface LineMargin {
  description: string;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number | null;
  hasCost: boolean;
}

export interface MarginSummary {
  lines: LineMargin[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  blendedMarginPct: number | null;
  /** true when at least one line carries a cost figure. */
  anyCost: boolean;
}

export function computeMargins(input: MarginLineInput[]): MarginSummary {
  const lines: LineMargin[] = input.map((l) => {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unit_price) || 0;
    const hasCost = l.unit_cost != null && !Number.isNaN(Number(l.unit_cost));
    const cost = hasCost ? (Number(l.unit_cost) || 0) : 0;
    const revenue = qty * price;
    const lineCost = qty * cost;
    const margin = revenue - lineCost;
    return {
      description: l.description?.trim() || '—',
      quantity: qty,
      revenue,
      cost: lineCost,
      margin,
      marginPct: revenue > 0 ? (margin / revenue) * 100 : null,
      hasCost,
    };
  });

  const totalRevenue = lines.reduce((s, l) => s + l.revenue, 0);
  const totalCost = lines.reduce((s, l) => s + l.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  return {
    lines,
    totalRevenue,
    totalCost,
    totalProfit,
    blendedMarginPct: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null,
    anyCost: lines.some((l) => l.hasCost),
  };
}

const fmt = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number | null) => (n == null ? '—' : `${n.toFixed(1)}%`);

function marginTone(pct: number | null): string {
  if (pct == null) return 'text-muted-foreground';
  if (pct < 0) return 'text-destructive';
  if (pct < 15) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

interface MarginPanelProps {
  lines: MarginLineInput[];
  currency?: string;
  className?: string;
  /** Show the per-line breakdown table (defaults to true). */
  detailed?: boolean;
}

/**
 * Internal margin breakdown — cost, margin and margin% per line plus a blended
 * summary. Renders nothing when no line carries a cost figure.
 */
export function MarginPanel({ lines, currency = 'KES', className, detailed = true }: MarginPanelProps) {
  const summary = computeMargins(lines);
  if (!summary.anyCost) return null;

  return (
    <div className={cn('rounded-xl border border-dashed border-border bg-accent/20 overflow-hidden', className)}>
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border bg-accent/30">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-black text-foreground">Margin Analysis</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
          Internal only
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">Not shown to the customer</span>
      </div>

      {detailed && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-2 font-bold">Item</th>
                <th className="text-right px-3 py-2 font-bold">Selling</th>
                <th className="text-right px-3 py-2 font-bold">Cost</th>
                <th className="text-right px-3 py-2 font-bold">Margin</th>
                <th className="text-right px-4 py-2 font-bold">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summary.lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium text-foreground truncate max-w-[200px]">{l.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(l.revenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {l.hasCost ? fmt(l.cost) : '—'}
                  </td>
                  <td className={cn('px-3 py-2 text-right tabular-nums font-semibold', l.hasCost ? marginTone(l.marginPct) : 'text-muted-foreground')}>
                    {l.hasCost ? fmt(l.margin) : '—'}
                  </td>
                  <td className={cn('px-4 py-2 text-right tabular-nums font-bold', l.hasCost ? marginTone(l.marginPct) : 'text-muted-foreground')}>
                    {l.hasCost ? fmtPct(l.marginPct) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-3 border-t border-border bg-accent/30 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Selling</p>
          <p className="text-xs font-black text-foreground tabular-nums">{currency} {fmt(summary.totalRevenue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Cost</p>
          <p className="text-xs font-black text-foreground tabular-nums">{currency} {fmt(summary.totalCost)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Profit</p>
          <p className={cn('text-xs font-black tabular-nums', marginTone(summary.blendedMarginPct))}>
            {currency} {fmt(summary.totalProfit)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Blended Margin</p>
          <p className={cn('text-xs font-black tabular-nums', marginTone(summary.blendedMarginPct))}>
            {fmtPct(summary.blendedMarginPct)}
          </p>
        </div>
      </div>
    </div>
  );
}
