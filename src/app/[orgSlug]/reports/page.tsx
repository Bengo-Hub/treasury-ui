'use client';

import { Badge, Card, CardContent } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useProfitLoss,
  useBalanceSheet,
  useCashFlow,
  useTaxSummaryReport,
  useProfitLossSummary,
  type ReportWindow,
} from '@/hooks/use-reports';
import { useAccountingPeriods } from '@/hooks/use-ledger';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import type {
  FinancialReport,
  ReportFiscalContext,
  ReportSection,
} from '@/lib/api/reports';
import { ReportDocument, type ReportKpi } from '@/components/reports/ReportDocument';
import { ReportTable, type ReportTableSection } from '@/components/reports/ReportTable';
import { ChartCard } from '@/components/charts/ChartCard';
import { CHART_COLORS, SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';

function getDefaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

const num = (v: string | number | undefined) => Number(v ?? 0);

function rangeLabel(from: string, to: string) {
  return `For the period ${from} to ${to}`;
}
function asOfLabel(asOf: string) {
  return `As at ${asOf}`;
}

const inputClasses =
  'rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/**
 * Map a backend ReportSection[] (account-code / name / amount rows with a
 * section total) onto the shared ReportTable section shape. This is the ONE
 * adapter every ledger-style report (P&L, balance sheet, cash flow, tax) uses,
 * so there is no per-report table code.
 */
function sectionsToTable(sections: ReportSection[], currency = 'KES'): ReportTableSection[] {
  return (sections ?? []).map((s) => ({
    title: s.name,
    rows: [
      ...(s.rows ?? []).map((r) => ({
        cells: [r.account_code, r.account_name, formatCurrency(num(r.amount), currency)],
      })),
      {
        subtotal: true,
        cells: ['', `Total ${s.name}`, formatCurrency(num(s.total), currency)],
      },
    ],
  }));
}

const LEDGER_COLUMNS = [
  { header: 'Code', className: 'w-20' },
  { header: 'Account' },
  { header: 'Amount', align: 'right' as const, className: 'w-40' },
];

// ---- Reporting basis (date range / fiscal year / accounting period) ----

type Basis = 'range' | 'fy' | 'period';
type FyMode = 'current' | 'previous' | 'specific';

interface BasisState {
  basis: Basis;
  from: string;
  to: string;
  fyMode: FyMode;
  fyYear: string;
  periodId: string;
}

/**
 * Translate the basis selector state into the API window. Exactly one basis is
 * active: a fiscal basis (period / fiscal year) sends only its selector and the
 * backend resolves the window; the date-range basis sends from/to. Returns `{}`
 * for an incomplete fiscal selection so the hook stays disabled.
 */
function basisToWindow(s: BasisState): ReportWindow {
  if (s.basis === 'period') return s.periodId ? { period: s.periodId } : {};
  if (s.basis === 'fy') {
    if (s.fyMode === 'specific') return s.fyYear ? { fiscal_year: s.fyYear } : {};
    return { fy: s.fyMode };
  }
  return { from: s.from, to: s.to };
}

/** Balance sheet variant: as-of for the date basis, fiscal selectors otherwise. */
function basisToBalanceParams(s: BasisState): { as_of?: string } & Pick<ReportWindow, 'period' | 'fiscal_year' | 'fy'> {
  if (s.basis === 'period') return s.periodId ? { period: s.periodId } : {};
  if (s.basis === 'fy') {
    if (s.fyMode === 'specific') return s.fyYear ? { fiscal_year: s.fyYear } : {};
    return { fy: s.fyMode };
  }
  return { as_of: s.to };
}

function ReportingBasis({
  tenantSlug,
  state,
  setState,
}: {
  tenantSlug: string;
  state: BasisState;
  setState: (s: BasisState) => void;
}) {
  const { data: periodData } = useAccountingPeriods(tenantSlug);
  const periods = periodData?.periods ?? [];
  const patch = (p: Partial<BasisState>) => setState({ ...state, ...p });

  return (
    <div className="flex flex-wrap items-end gap-4 print-hidden">
      <FormField label="Reporting basis">
        <select
          value={state.basis}
          onChange={(e) => patch({ basis: e.target.value as Basis })}
          className={inputClasses}
        >
          <option value="range">Date range</option>
          <option value="fy">Fiscal year</option>
          <option value="period">Accounting period</option>
        </select>
      </FormField>

      {state.basis === 'range' && (
        <>
          <FormField label="From">
            <input
              type="date"
              value={state.from}
              onChange={(e) => patch({ from: e.target.value })}
              className={inputClasses}
            />
          </FormField>
          <FormField label="To">
            <input
              type="date"
              value={state.to}
              onChange={(e) => patch({ to: e.target.value })}
              className={inputClasses}
            />
          </FormField>
        </>
      )}

      {state.basis === 'fy' && (
        <>
          <FormField label="Fiscal year">
            <select
              value={state.fyMode}
              onChange={(e) => patch({ fyMode: e.target.value as FyMode })}
              className={inputClasses}
            >
              <option value="current">Current FY</option>
              <option value="previous">Previous FY</option>
              <option value="specific">Specific year…</option>
            </select>
          </FormField>
          {state.fyMode === 'specific' && (
            <FormField label="Year">
              <input
                type="number"
                inputMode="numeric"
                placeholder="2025"
                value={state.fyYear}
                onChange={(e) => patch({ fyYear: e.target.value })}
                className={cn(inputClasses, 'w-28')}
              />
            </FormField>
          )}
        </>
      )}

      {state.basis === 'period' && (
        <FormField label="Accounting period">
          <select
            value={state.periodId}
            onChange={(e) => patch({ periodId: e.target.value })}
            className={cn(inputClasses, 'min-w-56')}
          >
            <option value="">Select a period…</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status === 'closed' ? 'closed' : 'open'})
              </option>
            ))}
          </select>
        </FormField>
      )}
    </div>
  );
}

/**
 * Fiscal context strip: shown only when a report was resolved via a fiscal
 * basis (fiscal year or period). Surfaces the resolved label plus an
 * open/closed badge so the user knows whether the figures are final (closed
 * period) or provisional (open period). Reuses the shared Badge primitive.
 */
function FiscalContext({ ctx }: { ctx: ReportFiscalContext | undefined }) {
  if (!ctx || ctx.window_source === 'date_range' || !ctx.window_source) return null;
  const label = ctx.period ?? ctx.fiscal_year;
  if (!label && !ctx.period_status) return null;
  const closed = ctx.period_status === 'closed';

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm print-hidden">
      <span className="text-muted-foreground">
        {ctx.window_source === 'period' ? 'Accounting period:' : 'Fiscal year:'}
      </span>
      {label && <span className="font-semibold">{label}</span>}
      {ctx.period_status && (
        <Badge variant={closed ? 'secondary' : 'success'}>
          {closed ? 'Closed · Final' : 'Open · Provisional'}
        </Badge>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  const [tab, setTab] = useState('pl');
  const defaults = getDefaultRange();
  const [basis, setBasis] = useState<BasisState>({
    basis: 'range',
    from: defaults.from,
    to: defaults.to,
    fyMode: 'current',
    fyYear: String(new Date().getFullYear()),
    periodId: '',
  });

  const window = basisToWindow(basis);
  const balanceParams = basisToBalanceParams(basis);

  return (
    <div className="p-6 space-y-6">
      <div className="print-hidden">
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground mt-1">View financial statements and summaries.</p>
      </div>

      {isPlatformOwner && !tenantQueryParam ? (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-10 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above to view their financial reports.
        </div>
      ) : (
        <>
          <ReportingBasis tenantSlug={effectiveTenant} state={basis} setState={setBasis} />

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="print-hidden">
              <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
              <TabsTrigger value="pls">P&L Summary</TabsTrigger>
              <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
              <TabsTrigger value="cf">Cash Flow</TabsTrigger>
              <TabsTrigger value="tax">Tax Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="pl" className="mt-6">
              <ProfitLossTab tenantSlug={effectiveTenant} window={window} />
            </TabsContent>
            <TabsContent value="pls" className="mt-6">
              <ProfitLossSummaryTab tenantSlug={effectiveTenant} window={window} />
            </TabsContent>
            <TabsContent value="bs" className="mt-6">
              <BalanceSheetTab tenantSlug={effectiveTenant} params={balanceParams} />
            </TabsContent>
            <TabsContent value="cf" className="mt-6">
              <CashFlowTab tenantSlug={effectiveTenant} window={window} />
            </TabsContent>
            <TabsContent value="tax" className="mt-6">
              <TaxSummaryTab tenantSlug={effectiveTenant} window={window} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ---- Period-label helpers ----

/**
 * Human period label for a report document/CSV. Prefers the backend-resolved
 * fiscal context (so a fiscal-year/period report reads "Fiscal year 2025"
 * rather than raw dates); falls back to the report's own from/to window.
 */
function reportPeriodLabel(report: (FinancialReport & ReportFiscalContext) | undefined): string {
  if (report?.window_source === 'period' && report.period) return `Accounting period: ${report.period}`;
  if (report?.window_source === 'fiscal_year' && report.fiscal_year) return `Fiscal year ${report.fiscal_year}`;
  if (report?.from && report?.to) return rangeLabel(report.from, report.to);
  return '';
}

/** Stable CSV filename suffix for the active window. */
function windowSuffix(ctx: ReportFiscalContext | undefined, from?: string, to?: string): string {
  if (ctx?.window_source === 'period' && ctx.period) return ctx.period.replace(/\s+/g, '-');
  if (ctx?.window_source === 'fiscal_year' && ctx.fiscal_year) return `FY${ctx.fiscal_year}`;
  return [from, to].filter(Boolean).join('_');
}

// ---- Helper: find a section total by name (case-insensitive contains) ----

function findSectionTotal(report: FinancialReport | undefined, ...needles: string[]): number {
  if (!report?.sections) return 0;
  const s = report.sections.find((sec) =>
    needles.some((n) => sec.name.toLowerCase().includes(n.toLowerCase())),
  );
  return s ? num(s.total) : 0;
}

// ---- Profit & Loss ----

function ProfitLossTab({ tenantSlug, window }: { tenantSlug: string; window: ReportWindow }) {
  const { data, isLoading, isError } = useProfitLoss(tenantSlug, window);

  const revenue = findSectionTotal(data, 'revenue', 'income', 'sales');
  const cogs = findSectionTotal(data, 'cost of goods', 'cogs', 'cost of sales');
  const expenses = findSectionTotal(data, 'expense', 'operating');
  const net = num(data?.total);

  const kpis: ReportKpi[] = [
    { label: 'Revenue', value: money(revenue), tone: 'success' },
    { label: 'COGS', value: money(cogs), tone: 'warning' },
    { label: 'Gross Profit', value: money(revenue - cogs), tone: revenue - cogs >= 0 ? 'success' : 'destructive' },
    { label: 'Expenses', value: money(expenses), tone: 'warning' },
    { label: 'Net Profit', value: money(net), tone: net >= 0 ? 'success' : 'destructive' },
  ];

  const chartData = [
    { name: 'Revenue', value: revenue, fill: SERIES.revenue },
    { name: 'Expenses', value: Math.abs(cogs) + Math.abs(expenses), fill: SERIES.expenses },
    { name: 'Net', value: net, fill: SERIES.net },
  ];

  const periodLabel = reportPeriodLabel(data);
  const suffix = windowSuffix(data, data?.from, data?.to);

  return (
    <div className="space-y-6">
      <FiscalContext ctx={data} />

      {isLoading && <LoadingCard />}
      {!isLoading && isError && <ErrorCard message="Failed to load profit & loss statement. Please try again." />}
      {!isLoading && !isError && data && (
        <>
          <div className="print-hidden">
            <ChartCard title="Revenue vs Expenses vs Net" subtitle="Profit & loss at a glance" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={compactNumber} tickLine={false} axisLine={false} fontSize={12} width={48} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
          </div>

          {(() => {
            const sections = sectionsToTable(data.sections);
            const grandTotal = { cells: ['', 'Net Income', money(net)] };
            return (
              <ReportDocument
                title="Profit & Loss Statement"
                periodLabel={periodLabel}
                kpis={kpis}
                csv={{
                  filename: `profit-and-loss_${suffix}.csv`,
                  title: 'Profit & Loss Statement',
                  periodLabel,
                  columns: LEDGER_COLUMNS,
                  sections,
                  grandTotal,
                }}
              >
                <ReportTable columns={LEDGER_COLUMNS} sections={sections} grandTotal={grandTotal} />
              </ReportDocument>
            );
          })()}
        </>
      )}
      {!isLoading && !isError && !data?.sections?.length && <EmptyCard message="No data for selected period." />}
    </div>
  );
}

// ---- P&L Summary (source-document aggregation) ----

function ProfitLossSummaryTab({ tenantSlug, window }: { tenantSlug: string; window: ReportWindow }) {
  const { data, isLoading, isError } = useProfitLossSummary(tenantSlug, window);

  return (
    <div className="space-y-6">
      <FiscalContext ctx={data} />

      {isLoading && <LoadingCard />}
      {!isLoading && isError && <ErrorCard message="Failed to load P&L summary. Please try again." />}

      {!isLoading && !isError && data && (
        <>
          {(() => {
            const cur = data.currency || 'KES';
            const periodLabel = reportPeriodLabel(data as unknown as FinancialReport & ReportFiscalContext);
            const suffix = windowSuffix(data, data.from, data.to);
            // Headline figures are GL-sourced (complete — includes POS sales that post to the
            // ledger without an invoice). Source-doc COGS is kept for context; the source-doc net
            // profit + variance are shown on the reconciliation card below.
            const kpis: ReportKpi[] = [
              { label: 'Revenue (GL)', value: money(data.gl_revenue, cur), tone: 'success' },
              { label: 'COGS', value: money(data.cost_of_goods, cur), tone: 'warning' },
              { label: 'Expenses (GL)', value: money(data.gl_expenses, cur), tone: 'warning' },
              { label: 'Net Profit (GL)', value: money(data.gl_net_profit, cur), tone: num(data.gl_net_profit) >= 0 ? 'success' : 'destructive' },
            ];

            const categories = (data.by_category ?? []).slice(0, 8);
            const summaryChart = [
              { name: 'Revenue', value: num(data.gl_revenue), fill: SERIES.revenue },
              { name: 'Expenses', value: num(data.gl_expenses), fill: SERIES.expenses },
              { name: 'Net', value: num(data.gl_net_profit), fill: SERIES.net },
            ];

            return (
              <>
                <GLReconciliationCard
                  sourceNetProfit={data.net_profit}
                  glNetProfit={data.gl_net_profit}
                  variance={data.reconciliation_variance}
                  currency={cur}
                />

                <div className="grid gap-4 lg:grid-cols-2 print-hidden">
                  <ChartCard title="P&L Composition" subtitle="Revenue, COGS, expenses, net" height={260}>
                    <BarChart data={summaryChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickFormatter={compactNumber} tickLine={false} axisLine={false} fontSize={12} width={48} />
                      <Tooltip formatter={(v) => money(Number(v), cur)} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {summaryChart.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartCard>
                  <ChartCard
                    title="Expenses by Category"
                    subtitle="Distribution"
                    height={260}
                    empty={categories.length === 0}
                  >
                    <PieChart>
                      <Pie
                        data={categories}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {categories.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => money(Number(v), cur)} />
                      <Legend />
                    </PieChart>
                  </ChartCard>
                </div>

                {(() => {
                  const byCategory = breakdownTable('Expenses by Category', data.by_category ?? [], cur);
                  const byCostCenter = breakdownTable('Expenses by Cost Center', data.by_cost_center ?? [], cur);
                  return (
                    <ReportDocument
                      title="Profit & Loss Summary"
                      periodLabel={periodLabel}
                      kpis={kpis}
                      csv={{
                        filename: `profit-and-loss-summary_${suffix}.csv`,
                        title: 'Profit & Loss Summary',
                        periodLabel,
                        columns: [{ header: 'Item' }, { header: 'Amount', align: 'right' as const }],
                        sections: [
                          {
                            title: 'Expenses by Category',
                            rows: [
                              ...byCategory.sections[0].rows,
                              ...(byCategory.grandTotal ? [{ subtotal: true, ...byCategory.grandTotal }] : []),
                            ],
                          },
                          {
                            title: 'Expenses by Cost Center',
                            rows: [
                              ...byCostCenter.sections[0].rows,
                              ...(byCostCenter.grandTotal ? [{ subtotal: true, ...byCostCenter.grandTotal }] : []),
                            ],
                          },
                        ],
                      }}
                    >
                      <BreakdownReportTable
                        title="Expenses by Category"
                        rows={data.by_category ?? []}
                        currency={cur}
                      />
                      <BreakdownReportTable
                        title="Expenses by Cost Center"
                        rows={data.by_cost_center ?? []}
                        currency={cur}
                      />
                    </ReportDocument>
                  );
                })()}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

/**
 * Build the shared ReportTable shape for a simple name/amount breakdown. This
 * ONE adapter is consumed by both the on-screen BreakdownReportTable and the
 * CSV export, so there is no duplicate row-shaping.
 */
function breakdownTable(title: string, rows: { name: string; amount: string }[], currency: string) {
  const total = rows.reduce((s, r) => s + num(r.amount), 0);
  return {
    columns: [{ header: title }, { header: 'Amount', align: 'right' as const, className: 'w-40' }],
    sections: [
      {
        rows:
          rows.length === 0
            ? [{ cells: ['No entries for selected period.', ''] }]
            : rows.map((r) => ({ cells: [r.name, formatCurrency(num(r.amount), currency)] })),
      },
    ],
    grandTotal: rows.length ? { cells: ['Total', formatCurrency(total, currency)] } : undefined,
  };
}

/** Reuses the shared ReportTable for a simple name/amount breakdown. */
function BreakdownReportTable({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: { name: string; amount: string }[];
  currency: string;
}) {
  const t = breakdownTable(title, rows, currency);
  return <ReportTable columns={t.columns} sections={t.sections} grandTotal={t.grandTotal} />;
}

/**
 * GLReconciliationCard surfaces whether the source-document P&L net profit
 * reconciles with the General Ledger. A near-zero variance shows a green
 * "Reconciled with GL" state; any drift shows an amber/destructive warning with
 * the variance amount so the books can be investigated.
 */
function GLReconciliationCard({
  sourceNetProfit,
  glNetProfit,
  variance,
  currency,
}: {
  sourceNetProfit: string;
  glNetProfit: string;
  variance: string;
  currency: string;
}) {
  const v = Number(variance) || 0;
  const reconciled = Math.abs(v) < 0.01;
  const cur = currency || 'KES';
  const fmt = (n: number) => formatCurrency(Math.abs(n), cur);

  return (
    <Card className={cn('border print-hidden', reconciled ? 'border-green-500/40' : 'border-destructive/40')}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {reconciled ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            )}
            <div>
              <p className={cn('text-sm font-bold', reconciled ? 'text-green-600' : 'text-destructive')}>
                {reconciled ? 'Reconciled with GL' : `Variance: ${fmt(v)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {reconciled
                  ? 'Source-document P&L matches the General Ledger.'
                  : 'Source-document P&L differs from the General Ledger — review postings.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Source Net Profit</p>
              <p className="text-sm font-bold tabular-nums">{fmt(Number(sourceNetProfit) || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">GL Net Profit</p>
              <p className="text-sm font-bold tabular-nums">{fmt(Number(glNetProfit) || 0)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Balance Sheet ----

function BalanceSheetTab({
  tenantSlug,
  params,
}: {
  tenantSlug: string;
  params: { as_of?: string } & Pick<ReportWindow, 'period' | 'fiscal_year' | 'fy'>;
}) {
  const { data, isLoading, isError } = useBalanceSheet(tenantSlug, params);

  const assets = findSectionTotal(data, 'asset');
  const liabilities = findSectionTotal(data, 'liabilit');
  const equity = findSectionTotal(data, 'equity', 'capital');
  const lhs = assets;
  const rhs = liabilities + equity;
  const balanced = Math.abs(lhs - rhs) < 0.01;

  const kpis: ReportKpi[] = [
    { label: 'Total Assets', value: money(assets), tone: 'primary' },
    { label: 'Total Liabilities', value: money(liabilities), tone: 'warning' },
    { label: 'Total Equity', value: money(equity), tone: 'success' },
  ];

  const sections = data ? sectionsToTable(data.sections) : [];
  const asOf = data?.as_of ?? params.as_of ?? '';
  const periodLabel = data?.period
    ? `Accounting period: ${data.period}${asOf ? ` (as at ${asOf})` : ''}`
    : data?.fiscal_year
      ? `Fiscal year ${data.fiscal_year}${asOf ? ` (as at ${asOf})` : ''}`
      : asOfLabel(asOf);
  const suffix = windowSuffix(data, asOf, undefined) || asOf;

  return (
    <div className="space-y-6">
      <FiscalContext ctx={data} />

      {isLoading && <LoadingCard />}
      {!isLoading && isError && <ErrorCard message="Failed to load balance sheet. Please try again." />}
      {!isLoading && !isError && data && (
        <ReportDocument
          title="Balance Sheet"
          periodLabel={periodLabel}
          kpis={kpis}
          csv={{
            filename: `balance-sheet_${suffix}.csv`,
            title: 'Balance Sheet',
            periodLabel,
            columns: LEDGER_COLUMNS,
            sections,
          }}
        >
          {/* Accounting check: Assets = Liabilities + Equity */}
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3',
              balanced ? 'border-green-500/40 bg-green-500/5' : 'border-destructive/40 bg-destructive/5',
            )}
          >
            {balanced ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            )}
            <div className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className={cn('font-bold', balanced ? 'text-green-600' : 'text-destructive')}>
                Assets = Liabilities + Equity
              </span>
              <span className="tabular-nums text-muted-foreground">
                {money(lhs)} {balanced ? '=' : '≠'} {money(rhs)}
              </span>
              {!balanced && (
                <span className="font-semibold text-destructive">
                  (out of balance by {money(Math.abs(lhs - rhs))})
                </span>
              )}
            </div>
          </div>

          <ReportTable columns={LEDGER_COLUMNS} sections={sections} />
        </ReportDocument>
      )}
      {!isLoading && !isError && !data?.sections?.length && <EmptyCard message="No balance sheet data." />}
    </div>
  );
}

// ---- Cash Flow ----

function CashFlowTab({ tenantSlug, window }: { tenantSlug: string; window: ReportWindow }) {
  const { data, isLoading, isError } = useCashFlow(tenantSlug, window);

  const operating = findSectionTotal(data, 'operating');
  const investing = findSectionTotal(data, 'investing');
  const financing = findSectionTotal(data, 'financing');
  const net = num(data?.total);

  const kpis: ReportKpi[] = [
    { label: 'Operating', value: money(operating), tone: operating >= 0 ? 'success' : 'destructive' },
    { label: 'Investing', value: money(investing), tone: investing >= 0 ? 'success' : 'destructive' },
    { label: 'Financing', value: money(financing), tone: financing >= 0 ? 'success' : 'destructive' },
    { label: 'Net Cash Flow', value: money(net), tone: net >= 0 ? 'success' : 'destructive' },
  ];

  const chartData = [
    { name: 'Operating', value: operating },
    { name: 'Investing', value: investing },
    { name: 'Financing', value: financing },
    { name: 'Net', value: net },
  ];

  const periodLabel = reportPeriodLabel(data);
  const suffix = windowSuffix(data, data?.from, data?.to);

  return (
    <div className="space-y-6">
      <FiscalContext ctx={data} />

      {isLoading && <LoadingCard />}
      {!isLoading && isError && <ErrorCard message="Failed to load cash flow statement. Please try again." />}
      {!isLoading && !isError && data && (
        <>
          <div className="print-hidden">
            <ChartCard title="Cash Flow by Activity" subtitle="Operating, investing, financing & net" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={compactNumber} tickLine={false} axisLine={false} fontSize={12} width={48} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.value >= 0 ? SERIES.revenue : SERIES.expenses} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
          </div>

          {(() => {
            const sections = sectionsToTable(data.sections);
            const grandTotal = data.total ? { cells: ['', 'Net Cash Flow', money(net)] } : undefined;
            return (
              <ReportDocument
                title="Cash Flow Statement"
                periodLabel={periodLabel}
                kpis={kpis}
                csv={{
                  filename: `cash-flow_${suffix}.csv`,
                  title: 'Cash Flow Statement',
                  periodLabel,
                  columns: LEDGER_COLUMNS,
                  sections,
                  grandTotal,
                }}
              >
                <ReportTable columns={LEDGER_COLUMNS} sections={sections} grandTotal={grandTotal} />
              </ReportDocument>
            );
          })()}
        </>
      )}
      {!isLoading && !isError && !data?.sections?.length && <EmptyCard message="No cash flow data for selected period." />}
    </div>
  );
}

// ---- Tax Summary ----

function TaxSummaryTab({ tenantSlug, window }: { tenantSlug: string; window: ReportWindow }) {
  const { data, isLoading, isError } = useTaxSummaryReport(tenantSlug, window);

  const kpis: ReportKpi[] = (data?.sections ?? []).slice(0, 4).map((s) => ({
    label: s.name,
    value: money(s.total),
    tone: 'primary' as const,
  }));

  const sections = data ? sectionsToTable(data.sections) : [];
  const periodLabel = reportPeriodLabel(data);
  const suffix = windowSuffix(data, data?.from, data?.to);

  return (
    <div className="space-y-6">
      <FiscalContext ctx={data} />

      {isLoading && <LoadingCard />}
      {!isLoading && isError && <ErrorCard message="Failed to load tax summary. Please try again." />}
      {!isLoading && !isError && data && (
        <ReportDocument
          title="Tax Summary"
          periodLabel={periodLabel}
          kpis={kpis.length ? kpis : undefined}
          csv={{
            filename: `tax-summary_${suffix}.csv`,
            title: 'Tax Summary',
            periodLabel,
            columns: LEDGER_COLUMNS,
            sections,
          }}
        >
          <ReportTable columns={LEDGER_COLUMNS} sections={sections} />
        </ReportDocument>
      )}
      {!isLoading && !isError && !data?.sections?.length && <EmptyCard message="No tax data for selected period." />}
    </div>
  );
}

// ---- Shared State Cards ----

function LoadingCard() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading report...
      </CardContent>
    </Card>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-12 text-center text-muted-foreground">{message}</CardContent>
    </Card>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-12 text-center text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
