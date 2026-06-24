'use client';

import { Card, CardContent } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useProfitLoss,
  useBalanceSheet,
  useCashFlow,
  useTaxSummaryReport,
  useProfitLossSummary,
} from '@/hooks/use-reports';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import type { FinancialReport, ReportSection } from '@/lib/api/reports';
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

export default function ReportsPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  const [tab, setTab] = useState('pl');
  const defaults = getDefaultRange();
  const [plFrom, setPlFrom] = useState(defaults.from);
  const [plTo, setPlTo] = useState(defaults.to);
  const [bsAsOf, setBsAsOf] = useState(defaults.to);
  const [cfFrom, setCfFrom] = useState(defaults.from);
  const [cfTo, setCfTo] = useState(defaults.to);
  const [taxFrom, setTaxFrom] = useState(defaults.from);
  const [taxTo, setTaxTo] = useState(defaults.to);
  const [plsFrom, setPlsFrom] = useState(defaults.from);
  const [plsTo, setPlsTo] = useState(defaults.to);

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
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="print-hidden">
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="pls">P&L Summary</TabsTrigger>
            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cf">Cash Flow</TabsTrigger>
            <TabsTrigger value="tax">Tax Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="pl" className="mt-6">
            <ProfitLossTab tenantSlug={effectiveTenant} from={plFrom} to={plTo} setFrom={setPlFrom} setTo={setPlTo} />
          </TabsContent>
          <TabsContent value="pls" className="mt-6">
            <ProfitLossSummaryTab tenantSlug={effectiveTenant} from={plsFrom} to={plsTo} setFrom={setPlsFrom} setTo={setPlsTo} />
          </TabsContent>
          <TabsContent value="bs" className="mt-6">
            <BalanceSheetTab tenantSlug={effectiveTenant} asOf={bsAsOf} setAsOf={setBsAsOf} />
          </TabsContent>
          <TabsContent value="cf" className="mt-6">
            <CashFlowTab tenantSlug={effectiveTenant} from={cfFrom} to={cfTo} setFrom={setCfFrom} setTo={setCfTo} />
          </TabsContent>
          <TabsContent value="tax" className="mt-6">
            <TaxSummaryTab tenantSlug={effectiveTenant} from={taxFrom} to={taxTo} setFrom={setTaxFrom} setTo={setTaxTo} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ---- Date Range Filter ----

function DateRangeFilter({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4 items-end print-hidden">
      <FormField label="From">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="To">
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </FormField>
    </div>
  );
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

function ProfitLossTab({
  tenantSlug,
  from,
  to,
  setFrom,
  setTo,
}: {
  tenantSlug: string;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  const { data, isLoading, isError } = useProfitLoss(tenantSlug, from, to);

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

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />

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

          <ReportDocument title="Profit & Loss Statement" periodLabel={rangeLabel(from, to)} kpis={kpis}>
            <ReportTable
              columns={LEDGER_COLUMNS}
              sections={sectionsToTable(data.sections)}
              grandTotal={{ cells: ['', 'Net Income', money(net)] }}
            />
          </ReportDocument>
        </>
      )}
      {!isLoading && !isError && !data?.sections?.length && <EmptyCard message="No data for selected period." />}
    </div>
  );
}

// ---- P&L Summary (source-document aggregation) ----

function ProfitLossSummaryTab({
  tenantSlug,
  from,
  to,
  setFrom,
  setTo,
}: {
  tenantSlug: string;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  const { data, isLoading, isError } = useProfitLossSummary(tenantSlug, from, to);

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />

      {isLoading && <LoadingCard />}
      {!isLoading && isError && <ErrorCard message="Failed to load P&L summary. Please try again." />}

      {!isLoading && !isError && data && (
        <>
          {(() => {
            const cur = data.currency || 'KES';
            const kpis: ReportKpi[] = [
              { label: 'Revenue', value: money(data.total_revenue, cur), tone: 'success' },
              { label: 'COGS', value: money(data.cost_of_goods, cur), tone: 'warning' },
              { label: 'Gross Profit', value: money(data.gross_profit, cur), tone: num(data.gross_profit) >= 0 ? 'success' : 'destructive' },
              { label: 'Operating Expenses', value: money(data.total_expenses, cur), tone: 'warning' },
              { label: 'Net Profit', value: money(data.net_profit, cur), tone: num(data.net_profit) >= 0 ? 'success' : 'destructive' },
            ];

            const categories = (data.by_category ?? []).slice(0, 8);
            const summaryChart = [
              { name: 'Revenue', value: num(data.total_revenue), fill: SERIES.revenue },
              { name: 'COGS', value: num(data.cost_of_goods), fill: SERIES.outstanding },
              { name: 'Expenses', value: num(data.total_expenses), fill: SERIES.expenses },
              { name: 'Net', value: num(data.net_profit), fill: SERIES.net },
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

                <ReportDocument title="Profit & Loss Summary" periodLabel={rangeLabel(from, to)} kpis={kpis}>
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
              </>
            );
          })()}
        </>
      )}
    </div>
  );
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
  const total = rows.reduce((s, r) => s + num(r.amount), 0);
  return (
    <ReportTable
      columns={[{ header: title }, { header: 'Amount', align: 'right', className: 'w-40' }]}
      sections={[
        {
          rows:
            rows.length === 0
              ? [{ cells: ['No entries for selected period.', ''] }]
              : rows.map((r) => ({ cells: [r.name, formatCurrency(num(r.amount), currency)] })),
        },
      ]}
      grandTotal={rows.length ? { cells: ['Total', formatCurrency(total, currency)] } : undefined}
    />
  );
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
  asOf,
  setAsOf,
}: {
  tenantSlug: string;
  asOf: string;
  setAsOf: (v: string) => void;
}) {
  const { data, isLoading, isError } = useBalanceSheet(tenantSlug, asOf);

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

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end print-hidden">
        <FormField label="As Of">
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </FormField>
      </div>

      {isLoading && <LoadingCard />}
      {!isLoading && isError && <ErrorCard message="Failed to load balance sheet. Please try again." />}
      {!isLoading && !isError && data && (
        <ReportDocument title="Balance Sheet" periodLabel={asOfLabel(asOf)} kpis={kpis}>
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

          <ReportTable columns={LEDGER_COLUMNS} sections={sectionsToTable(data.sections)} />
        </ReportDocument>
      )}
      {!isLoading && !isError && !data?.sections?.length && <EmptyCard message="No balance sheet data." />}
    </div>
  );
}

// ---- Cash Flow ----

function CashFlowTab({
  tenantSlug,
  from,
  to,
  setFrom,
  setTo,
}: {
  tenantSlug: string;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  const { data, isLoading, isError } = useCashFlow(tenantSlug, from, to);

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

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />

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

          <ReportDocument title="Cash Flow Statement" periodLabel={rangeLabel(from, to)} kpis={kpis}>
            <ReportTable
              columns={LEDGER_COLUMNS}
              sections={sectionsToTable(data.sections)}
              grandTotal={data.total ? { cells: ['', 'Net Cash Flow', money(net)] } : undefined}
            />
          </ReportDocument>
        </>
      )}
      {!isLoading && !isError && !data?.sections?.length && <EmptyCard message="No cash flow data for selected period." />}
    </div>
  );
}

// ---- Tax Summary ----

function TaxSummaryTab({
  tenantSlug,
  from,
  to,
  setFrom,
  setTo,
}: {
  tenantSlug: string;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  const { data, isLoading, isError } = useTaxSummaryReport(tenantSlug, from, to);

  const kpis: ReportKpi[] = (data?.sections ?? []).slice(0, 4).map((s) => ({
    label: s.name,
    value: money(s.total),
    tone: 'primary' as const,
  }));

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />

      {isLoading && <LoadingCard />}
      {!isLoading && isError && <ErrorCard message="Failed to load tax summary. Please try again." />}
      {!isLoading && !isError && data && (
        <ReportDocument
          title="Tax Summary"
          periodLabel={rangeLabel(from, to)}
          kpis={kpis.length ? kpis : undefined}
        >
          <ReportTable columns={LEDGER_COLUMNS} sections={sectionsToTable(data.sections)} />
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
