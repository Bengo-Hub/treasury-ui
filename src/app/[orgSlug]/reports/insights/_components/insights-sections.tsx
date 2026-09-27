'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Card } from '@/components/ui/base';
import { money } from '@/components/charts/chart-theme';
import { cn } from '@/lib/utils';
import type { InsightsLine, InsightsReport } from '@/lib/api/reports';

export function fmtPct(v: number | null | undefined, signed = true): string {
  if (v == null) return '-';
  return `${signed && v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtNum(v: number | null | undefined, unit = ''): string {
  return v == null ? '-' : `${v.toFixed(2)}${unit}`;
}

/** "2026-09" -> "Sep 2026" (or "Sep 26" when short). */
export function monthLabel(ym: string, short = false): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('en-GB', { month: 'short', year: short ? '2-digit' : 'numeric', timeZone: 'UTC' });
}

const negCls = 'text-rose-700 dark:text-rose-400';
const posCls = 'text-emerald-700 dark:text-emerald-400';

function changeCls(v: number | null | undefined, higherIsGood = true) {
  if (v == null || v === 0) return 'text-muted-foreground';
  return (v > 0) === higherIsGood ? posCls : negCls;
}

/** Money cell text, red when below zero. */
function Amount({ v, className }: { v: string | number; className?: string }) {
  return <span className={cn('tabular-nums', Number(v) < 0 && negCls, className)}>{money(v)}</span>;
}

/** Titled card used by every insights block: one chrome, one spacing rhythm. */
export function Panel({ title, subtitle, action, children, className, bodyClassName }: {
  title: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <Card className={cn('flex min-w-0 flex-col p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={cn('mt-4 min-w-0 flex-1', bodyClassName)}>{children}</div>
    </Card>
  );
}

const th = 'px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap';
const td = 'px-3 py-2.5 whitespace-nowrap';
/** Light data table: header band and row dividers only (opts out of the app's grid lines). */
function DataTable({ head, children, foot, minWidth }: { head: ReactNode; children: ReactNode; foot?: ReactNode; minWidth?: number }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="no-grid w-full text-sm" style={minWidth ? { minWidth } : undefined}>
        <thead className="bg-muted/50">{head}</thead>
        <tbody className="divide-y divide-border/60">{children}</tbody>
        {foot && <tfoot className="border-t border-border bg-muted/30 font-semibold">{foot}</tfoot>}
      </table>
    </div>
  );
}

const LEVEL = {
  good: { icon: CheckCircle2, cls: posCls, bg: 'bg-emerald-500/10', label: 'Good' },
  warning: { icon: AlertTriangle, cls: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10', label: 'Attention' },
  info: { icon: Info, cls: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-500/10', label: 'Note' },
} as const;

/** Plain-language findings; status is carried by an icon and a label, never colour alone. */
export function Findings({ items, className }: { items: InsightsReport['findings']; className?: string }) {
  if (!items?.length) return null;
  return (
    <Panel title="Key findings" subtitle="What stands out in this period" className={className}>
      <ul className="space-y-2.5">
        {items.map((f, i) => {
          const l = LEVEL[f.level] ?? LEVEL.info;
          const Icon = l.icon;
          return (
            <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
              <span className={cn('mt-0.5 shrink-0 rounded-md p-1', l.bg)}><Icon className={cn('h-4 w-4', l.cls)} aria-hidden /></span>
              <span><span className={cn('font-semibold', l.cls)}>{l.label}:</span> {f.text}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function scoreBand(score: number) {
  if (score >= 70) return { label: 'Healthy', cls: posCls, bar: 'bg-emerald-500' };
  if (score >= 45) return { label: 'Needs attention', cls: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' };
  return { label: 'At risk', cls: negCls, bar: 'bg-rose-500' };
}

/** Health score with its five parts (each out of 20) and the reason for each score. */
export function HealthCard({ report, className }: { report: InsightsReport; className?: string }) {
  const score = report.health_score;
  const band = scoreBand(score);
  return (
    <Panel title="Financial health" subtitle="Five parts, 20 points each" className={className}>
      <div className="flex items-end gap-3">
        <p className="text-4xl font-semibold tabular-nums leading-none">{score.toFixed(0)}<span className="text-base font-normal text-muted-foreground"> / 100</span></p>
        <span className={cn('pb-0.5 text-sm font-semibold', band.cls)}>{band.label}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted" role="img" aria-label={`Health score ${score.toFixed(0)} of 100`}>
        <div className={cn('h-2 rounded-full transition-[width] duration-300', band.bar)} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <ul className="mt-5 space-y-3.5">
        {report.health.map((c) => (
          <li key={c.name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="tabular-nums text-muted-foreground">{c.score.toFixed(0)} / 20</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted" role="img" aria-label={`${c.name}: ${c.score} of 20`}>
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(c.score / 20) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Ratios at the period end as a grid of tiles, each with a one-line explanation. */
export function RatiosCard({ report, className }: { report: InsightsReport; className?: string }) {
  const r = report.ratios;
  const rows: [string, string, string][] = [
    ['Gross margin', fmtPct(r.gross_margin_pct, false), 'Revenue left after cost of sales'],
    ['Net margin', fmtPct(r.net_margin_pct, false), 'Revenue left after all costs'],
    ['Expenses / revenue', fmtPct(r.expense_ratio_pct, false), 'Operating expenses per shilling of revenue'],
    ['Current ratio', fmtNum(r.current_ratio, 'x'), 'Current assets per shilling owed short term (1.5 to 3 is healthy)'],
    ['Quick ratio', fmtNum(r.quick_ratio, 'x'), 'Cash and receivables per shilling owed short term'],
    ['Days to collect', r.days_sales_outstanding == null ? '-' : `${r.days_sales_outstanding.toFixed(0)} days`, 'How long customers take to pay (DSO)'],
    ['Days to pay', r.days_payables_outstanding == null ? '-' : `${r.days_payables_outstanding.toFixed(0)} days`, 'How long suppliers wait to be paid (DPO)'],
    ['Monthly cash burn', r.monthly_burn == null ? 'Not falling' : money(r.monthly_burn), 'Average monthly fall in cash, last 3 months'],
    ['Cash runway', r.runway_months == null ? '-' : `${r.runway_months.toFixed(1)} months`, 'How long cash lasts at that rate'],
  ];
  return (
    <Panel title="Ratios" subtitle="At the end of the period" className={className}>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(([k, v, hint]) => (
          <div key={k} className="rounded-lg bg-muted/40 p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className={cn('mt-1 text-lg font-semibold tabular-nums', v.startsWith('-') && v.length > 1 && negCls)}>{v}</dd>
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/** Profit and loss for the period against the comparison (comparison columns only with data). */
export function PerformanceTable({ report, className }: { report: InsightsReport; className?: string }) {
  const cur = report.current;
  const prev = report.previous;
  const cmp = report.has_comparison;
  const rows: [string, string, string, number | null | undefined, boolean, boolean][] = [
    ['Revenue', cur.revenue, prev.revenue, report.changes.revenue, true, false],
    ['Cost of sales', cur.cost_of_sales, prev.cost_of_sales, null, false, false],
    ['Gross profit', cur.gross_profit, prev.gross_profit, report.changes.gross_profit, true, true],
    ['Operating expenses', cur.expenses, prev.expenses, report.changes.expenses, false, false],
    ['Net profit', cur.net_profit, prev.net_profit, report.changes.net_profit, true, true],
  ];
  return (
    <Panel title="Profit and loss" subtitle={cmp ? `Compared with ${report.compare_from} to ${report.compare_to}` : 'No activity in the comparison period'} className={className}>
      <DataTable head={
        <tr>
          <th className={cn(th, 'text-left')}>Measure</th>
          <th className={cn(th, 'text-right')}>This period</th>
          {cmp && <th className={cn(th, 'text-right')}>Comparison</th>}
          {cmp && <th className={cn(th, 'text-right')}>Change</th>}
        </tr>
      }>
        {rows.map(([label, c, p, ch, up, bold]) => (
          <tr key={label} className={cn(bold && 'font-semibold')}>
            <td className={td}>{label}</td>
            <td className={cn(td, 'text-right')}><Amount v={c} /></td>
            {cmp && <td className={cn(td, 'text-right text-muted-foreground')}><Amount v={p} /></td>}
            {cmp && <td className={cn(td, 'text-right tabular-nums', changeCls(ch, up))}>{fmtPct(ch)}</td>}
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}

/** Balance sheet snapshot as tiles: period end, with the comparison end when there is one. */
export function PositionCard({ report, className }: { report: InsightsReport; className?: string }) {
  const p = report.position;
  const pp = report.previous_position;
  const items: [string, string, string][] = [
    ['Cash and bank', p.cash, pp.cash],
    ['Receivables', p.receivables, pp.receivables],
    ['Inventory', p.inventory, pp.inventory],
    ['Fixed assets (net)', p.fixed_assets, pp.fixed_assets],
    ['Payables', p.payables, pp.payables],
    ['Current liabilities', p.current_liabilities, pp.current_liabilities],
    ['Current assets', p.current_assets, pp.current_assets],
    ['Net worth', p.equity, pp.equity],
  ];
  return (
    <Panel title="Financial position" subtitle={`At ${report.to}`} className={className}>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(([k, v, prev], i) => (
          <div key={k} className={cn('rounded-lg p-3', i === items.length - 1 ? 'bg-primary/10' : 'bg-muted/40')}>
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-base font-semibold sm:text-lg"><Amount v={v} /></dd>
            {report.has_comparison && <p className="mt-0.5 text-xs text-muted-foreground">was {money(prev)}</p>}
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/** Accounts with this period, the comparison, change and share; each row opens the account's ledger. */
export function AccountTable({ title, subtitle, lines, orgSlug, higherIsGood, hasComparison, className }: {
  title: string; subtitle?: string; lines: InsightsLine[] | null; orgSlug: string; higherIsGood: boolean; hasComparison: boolean; className?: string;
}) {
  if (!lines?.length) {
    return <Panel title={title} subtitle={subtitle} className={className}><p className="text-sm text-muted-foreground">Nothing booked in this period.</p></Panel>;
  }
  const total = lines.reduce((s, l) => s + Number(l.amount), 0);
  return (
    <Panel title={title} subtitle={subtitle} className={className}>
      <DataTable minWidth={hasComparison ? 560 : 420} head={
        <tr>
          <th className={cn(th, 'text-left')}>Account</th>
          <th className={cn(th, 'text-right')}>This period</th>
          {hasComparison && <th className={cn(th, 'text-right')}>Comparison</th>}
          {hasComparison && <th className={cn(th, 'text-right')}>Change</th>}
          <th className={cn(th, 'text-right')}>Share</th>
        </tr>
      } foot={
        <tr>
          <td className={td}>Total</td>
          <td className={cn(td, 'text-right')}><Amount v={total} /></td>
          {hasComparison && <td />}
          {hasComparison && <td />}
          <td />
        </tr>
      }>
        {lines.map((l) => (
          <tr key={l.account_id} className="hover:bg-muted/30">
            <td className={cn(td, 'max-w-[16rem] truncate')}>
              <Link href={`/${orgSlug}/ledger/accounts/${l.account_id}`} className="hover:underline focus-visible:underline" title={`${l.code} ${l.name}`}>
                <span className="mr-1.5 tabular-nums text-muted-foreground">{l.code}</span>{l.name}
              </Link>
            </td>
            <td className={cn(td, 'text-right')}><Amount v={l.amount} /></td>
            {hasComparison && <td className={cn(td, 'text-right text-muted-foreground')}><Amount v={l.previous} /></td>}
            {hasComparison && <td className={cn(td, 'text-right tabular-nums', changeCls(l.change_pct, higherIsGood))}>{fmtPct(l.change_pct)}</td>}
            <td className={td}>
              <div className="flex items-center justify-end gap-2">
                <div className="hidden h-1.5 w-16 rounded-full bg-muted sm:block"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, l.share_pct ?? 0))}%` }} /></div>
                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{fmtPct(l.share_pct, false)}</span>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}

/** Ranked top customers with their share of the listed sales. */
export function CustomersCard({ report, className }: { report: InsightsReport; className?: string }) {
  const rows = report.top_customers ?? [];
  const total = rows.reduce((s, c) => s + Number(c.sales), 0);
  return (
    <Panel title="Top customers" subtitle="Invoiced in the period, net of VAT" className={className}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoiced sales in this period.</p>
      ) : (
        <ol className="space-y-3">
          {rows.map((c, i) => {
            const share = total > 0 ? (Number(c.sales) / total) * 100 : 0;
            return (
              <li key={`${c.customer}-${i}`} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium" title={c.customer}>{c.customer}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{money(c.sales)}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${share}%` }} /></div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{c.invoices} inv · {share.toFixed(0)}%</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

/** Recurring costs: one row per cost with its source under the name, so nothing wraps awkwardly. */
export function RecurringCard({ report, className }: { report: InsightsReport; className?: string }) {
  const rows = report.recurring ?? [];
  return (
    <Panel title="Recurring costs" subtitle="Set up as recurring, or paid steadily in at least 4 of the last 6 months" className={className}
      action={<p className="text-right"><span className="block text-lg font-semibold tabular-nums leading-tight">{money(report.recurring_monthly)}</span><span className="text-xs text-muted-foreground">per month</span></p>}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recurring costs found yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((c, i) => (
            <li key={`${c.name}-${i}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" title={c.name}>{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.source === 'template' ? `Set up as recurring (${c.frequency || 'monthly'})` : `Seen in ${c.months_seen} of 6 months`}
                  {Number(c.last_amount) > 0 && ` · last ${money(c.last_amount)}`}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{money(c.monthly_average)}<span className="text-xs font-normal text-muted-foreground"> /mo</span></p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Month-by-month table behind the charts (exact values, accessibility), with totals. */
export function MonthlyTable({ report, className }: { report: InsightsReport; className?: string }) {
  const months = report.monthly ?? [];
  if (!months.length) return null;
  const sum = (k: 'revenue' | 'cost_of_sales' | 'expenses' | 'net_profit') => months.reduce((s, m) => s + Number(m[k]), 0);
  return (
    <Panel title="Month by month" subtitle="Figures behind the charts" className={className}>
      <DataTable minWidth={640} head={
        <tr className="text-right">
          <th className={cn(th, 'text-left')}>Month</th>
          <th className={th}>Revenue</th>
          <th className={th}>Cost of sales</th>
          <th className={th}>Expenses</th>
          <th className={th}>Net profit</th>
          <th className={th}>Cash at month end</th>
        </tr>
      } foot={
        <tr className="text-right">
          <td className={cn(td, 'text-left')}>Total</td>
          <td className={td}><Amount v={sum('revenue')} /></td>
          <td className={td}><Amount v={sum('cost_of_sales')} /></td>
          <td className={td}><Amount v={sum('expenses')} /></td>
          <td className={td}><Amount v={sum('net_profit')} /></td>
          <td className={td} />
        </tr>
      }>
        {months.map((m) => (
          <tr key={m.month} className="text-right hover:bg-muted/30">
            <td className={cn(td, 'text-left')}>{monthLabel(m.month)}</td>
            <td className={td}><Amount v={m.revenue} /></td>
            <td className={td}><Amount v={m.cost_of_sales} /></td>
            <td className={td}><Amount v={m.expenses} /></td>
            <td className={cn(td, 'font-medium')}><Amount v={m.net_profit} /></td>
            <td className={td}><Amount v={m.cash_balance} /></td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}

/** Forecast months: revenue with its likely range, costs, profit, and the cash it implies. */
export function ForecastTable({ report, className }: { report: InsightsReport; className?: string }) {
  const rows = report.forecast ?? [];
  if (!rows.length) return null;
  return (
    <Panel title="Forecast" subtitle={report.forecast_method} className={className}>
      <DataTable minWidth={760} head={
        <tr className="text-right">
          <th className={cn(th, 'text-left')}>Month</th>
          <th className={th}>Revenue</th>
          <th className={th}>Likely range</th>
          <th className={th}>Costs</th>
          <th className={th}>Net profit</th>
          <th className={th}>Collections due</th>
          <th className={th}>Supplier bills due</th>
          <th className={th}>Cash</th>
        </tr>
      }>
        {rows.map((f) => (
          <tr key={f.month} className="text-right hover:bg-muted/30">
            <td className={cn(td, 'text-left')}>{monthLabel(f.month)}</td>
            <td className={td}><Amount v={f.revenue} /></td>
            <td className={cn(td, 'text-xs text-muted-foreground')}>{money(f.revenue_low)} to {money(f.revenue_high)}</td>
            <td className={td}><Amount v={Number(f.cost_of_sales) + Number(f.expenses)} /></td>
            <td className={cn(td, 'font-medium')}><Amount v={f.net_profit} /></td>
            <td className={td}><Amount v={f.collections} /></td>
            <td className={td}><Amount v={f.supplier_payout} /></td>
            <td className={cn(td, 'font-semibold')}><Amount v={f.cash_balance} /></td>
          </tr>
        ))}
      </DataTable>
    </Panel>
  );
}
