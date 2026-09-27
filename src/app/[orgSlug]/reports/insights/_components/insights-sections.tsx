'use client';

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

const LEVEL = {
  good: { icon: CheckCircle2, cls: 'text-emerald-700 dark:text-emerald-400', label: 'Good' },
  warning: { icon: AlertTriangle, cls: 'text-amber-700 dark:text-amber-400', label: 'Attention' },
  info: { icon: Info, cls: 'text-sky-700 dark:text-sky-400', label: 'Note' },
} as const;

/** Plain-language findings; status is carried by an icon and a label, never colour alone. */
export function Findings({ items }: { items: InsightsReport['findings'] }) {
  if (!items?.length) return null;
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Key findings</h3>
      <ul className="mt-3 space-y-2">
        {items.map((f, i) => {
          const l = LEVEL[f.level] ?? LEVEL.info;
          const Icon = l.icon;
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', l.cls)} aria-hidden />
              <span><span className={cn('font-semibold', l.cls)}>{l.label}:</span> {f.text}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Health score with its five scored parts (each out of 20) and the reason for each score. */
export function HealthCard({ report }: { report: InsightsReport }) {
  const score = report.health_score;
  const band = score >= 70 ? 'Healthy' : score >= 45 ? 'Needs attention' : 'At risk';
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Financial health</h3>
        <span className="text-xs text-muted-foreground">{band}</span>
      </div>
      <p className="mt-2 text-4xl font-semibold tabular-nums">{score.toFixed(0)}<span className="text-base text-muted-foreground"> / 100</span></p>
      <ul className="mt-4 space-y-2.5">
        {report.health.map((c) => (
          <li key={c.name}>
            <div className="flex justify-between text-xs">
              <span className="text-foreground">{c.name}</span>
              <span className="tabular-nums text-muted-foreground">{c.score.toFixed(0)} / 20 · {c.detail}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted" role="img" aria-label={`${c.name}: ${c.score} of 20`}>
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(c.score / 20) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Ratios at the period end, each with a one-line explanation. */
export function RatiosCard({ report }: { report: InsightsReport }) {
  const r = report.ratios;
  const rows: [string, string, string][] = [
    ['Gross margin', fmtPct(r.gross_margin_pct, false), 'Share of revenue left after cost of sales'],
    ['Net margin', fmtPct(r.net_margin_pct, false), 'Share of revenue left after all costs'],
    ['Expenses / revenue', fmtPct(r.expense_ratio_pct, false), 'Operating expenses per shilling of revenue'],
    ['Current ratio', fmtNum(r.current_ratio, 'x'), 'Current assets per shilling of current liabilities (1.5 to 3 is healthy)'],
    ['Quick ratio', fmtNum(r.quick_ratio, 'x'), 'Cash and receivables per shilling of current liabilities'],
    ['Days to collect (DSO)', r.days_sales_outstanding == null ? '-' : `${r.days_sales_outstanding.toFixed(0)} days`, 'How long customers take to pay'],
    ['Days to pay (DPO)', r.days_payables_outstanding == null ? '-' : `${r.days_payables_outstanding.toFixed(0)} days`, 'How long the business takes to pay suppliers'],
    ['Monthly cash burn', r.monthly_burn == null ? 'Cash not falling' : money(r.monthly_burn), 'Average monthly fall in cash, last 3 months'],
    ['Cash runway', r.runway_months == null ? '-' : `${r.runway_months.toFixed(1)} months`, 'How long cash lasts at that rate'],
  ];
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Ratios</h3>
      <dl className="mt-3 divide-y divide-border">
        {rows.map(([k, v, hint]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="min-w-0">
              <p className="text-sm">{k}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </dt>
            <dd className="text-sm font-semibold tabular-nums whitespace-nowrap">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function changeCls(v: number | null, higherIsGood: boolean) {
  if (v == null || v === 0) return 'text-muted-foreground';
  return (v > 0) === higherIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400';
}

/** Accounts with this period, the comparison, change and share; each row opens the account's ledger. */
export function AccountTable({ title, lines, orgSlug, higherIsGood }: { title: string; lines: InsightsLine[] | null; orgSlug: string; higherIsGood: boolean }) {
  if (!lines?.length) return null;
  return (
    <Card className="p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold">{title}</h3>
      <table className="mt-3 w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="text-left">
            <th className="py-1.5 font-medium">Account</th>
            <th className="py-1.5 font-medium text-right">This period</th>
            <th className="py-1.5 font-medium text-right hidden sm:table-cell">Comparison</th>
            <th className="py-1.5 font-medium text-right">Change</th>
            <th className="py-1.5 font-medium text-right hidden md:table-cell w-32">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((l) => (
            <tr key={l.account_id}>
              <td className="py-1.5">
                <Link href={`/${orgSlug}/ledger/accounts/${l.account_id}`} className="hover:underline">
                  <span className="text-muted-foreground tabular-nums mr-1.5">{l.code}</span>{l.name}
                </Link>
              </td>
              <td className="py-1.5 text-right tabular-nums">{money(l.amount)}</td>
              <td className="py-1.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{money(l.previous)}</td>
              <td className={cn('py-1.5 text-right tabular-nums', changeCls(l.change_pct, higherIsGood))}>{fmtPct(l.change_pct)}</td>
              <td className="py-1.5 hidden md:table-cell">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, l.share_pct ?? 0)}%` }} /></div>
                  <span className="w-12 text-right tabular-nums text-xs text-muted-foreground">{fmtPct(l.share_pct, false)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function CustomersCard({ report }: { report: InsightsReport }) {
  const rows = report.top_customers ?? [];
  if (!rows.length) return null;
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">Top customers</h3>
      <p className="text-xs text-muted-foreground">Invoiced in the period, net of VAT</p>
      <table className="mt-3 w-full text-sm">
        <tbody className="divide-y divide-border">
          {rows.map((c) => (
            <tr key={c.customer}>
              <td className="py-1.5">{c.customer}</td>
              <td className="py-1.5 text-right text-xs text-muted-foreground">{c.invoices} inv.</td>
              <td className="py-1.5 text-right tabular-nums">{money(c.sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function RecurringCard({ report }: { report: InsightsReport }) {
  const rows = report.recurring ?? [];
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Recurring costs</h3>
        <span className="text-sm font-semibold tabular-nums">{money(report.recurring_monthly)}<span className="text-xs text-muted-foreground font-normal"> / month</span></span>
      </div>
      <p className="text-xs text-muted-foreground">Set up as recurring, or paid steadily in at least 4 of the last 6 months</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No recurring costs found yet.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <tbody className="divide-y divide-border">
            {rows.map((c, i) => (
              <tr key={`${c.name}-${i}`}>
                <td className="py-1.5">{c.name}</td>
                <td className="py-1.5 text-xs text-muted-foreground">{c.source === 'template' ? `Recurring (${c.frequency || 'monthly'})` : `Seen ${c.months_seen} of 6 months`}</td>
                <td className="py-1.5 text-right tabular-nums">{money(c.monthly_average)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/** Table view of the monthly and forecast figures behind the charts (accessibility, exact values). */
export function MonthlyTable({ report }: { report: InsightsReport }) {
  const months = report.monthly ?? [];
  const forecast = report.forecast ?? [];
  if (!months.length && !forecast.length) return null;
  return (
    <Card className="p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold">Month by month</h3>
      <table className="mt-3 w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="text-right">
            <th className="py-1.5 font-medium text-left">Month</th>
            <th className="py-1.5 font-medium">Revenue</th>
            <th className="py-1.5 font-medium">Cost of sales</th>
            <th className="py-1.5 font-medium">Expenses</th>
            <th className="py-1.5 font-medium">Net profit</th>
            <th className="py-1.5 font-medium">Cash at month end</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {months.map((m) => (
            <tr key={m.month} className="text-right tabular-nums">
              <td className="py-1.5 text-left">{m.month}</td>
              <td className="py-1.5">{money(m.revenue)}</td>
              <td className="py-1.5">{money(m.cost_of_sales)}</td>
              <td className="py-1.5">{money(m.expenses)}</td>
              <td className={cn('py-1.5', Number(m.net_profit) < 0 && 'text-rose-700 dark:text-rose-400')}>{money(m.net_profit)}</td>
              <td className="py-1.5">{money(m.cash_balance)}</td>
            </tr>
          ))}
          {forecast.map((f) => (
            <tr key={f.month} className="text-right tabular-nums text-muted-foreground italic">
              <td className="py-1.5 text-left">{f.month} (forecast)</td>
              <td className="py-1.5">{money(f.revenue)}</td>
              <td className="py-1.5">{money(f.cost_of_sales)}</td>
              <td className="py-1.5">{money(f.expenses)}</td>
              <td className="py-1.5">{money(f.net_profit)}</td>
              <td className="py-1.5">{money(f.cash_balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {forecast.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{report.forecast_method}</p>}
    </Card>
  );
}
