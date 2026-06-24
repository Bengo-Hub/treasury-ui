'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
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
import type { FinancialReport, ReportSection } from '@/lib/api/reports';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  PieChart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

function getDefaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground mt-1">View financial statements and summaries.</p>
      </div>

      {isPlatformOwner && !tenantQueryParam ? (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-10 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above to view their financial reports.
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
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
    <div className="flex flex-wrap gap-4 items-end">
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

// ---- Report Section Renderer ----

function ReportSectionView({ section }: { section: ReportSection }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-6 pt-4">
        {section.name}
      </h4>
      {(section.rows ?? []).map((row, i) => (
        <div key={i} className="flex items-center justify-between px-6 py-2 hover:bg-accent/5 transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground w-12">{row.account_code}</span>
            <span className="text-sm">{row.account_name}</span>
          </div>
          <span className="text-sm font-bold tabular-nums">
            {Number(row.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between px-6 py-2 bg-accent/10 font-bold">
        <span className="text-xs uppercase">Total {section.name}</span>
        <span className="text-sm tabular-nums">
          {Number(section.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
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

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Profit & Loss Statement</h3>
          </div>
          {data?.total && (
            <Badge variant={Number(data.total) >= 0 ? 'success' : 'error'}>
              Net: {Number(data.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingIndicator />}
          {!isLoading && isError && <EmptyState message="Failed to load profit & loss statement. Please try again." />}
          {!isLoading && !isError && data && (
            <div className="divide-y divide-border">
              {data.sections.map((s, i) => (
                <ReportSectionView key={i} section={s} />
              ))}
              <div className="flex items-center justify-between px-6 py-3 bg-primary/5 font-bold border-t-2 border-primary/20">
                <span className="text-sm uppercase">Net Income</span>
                <span className="text-lg tabular-nums">
                  {Number(data.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
          {!isLoading && !isError && !data?.sections?.length && <EmptyState message="No data for selected period." />}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- P&L Summary (source-document aggregation) ----

function formatMoney(v: string | number | undefined): string {
  return Number(v ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
}

function KpiCard({
  label,
  amount,
  positive,
}: {
  label: string;
  amount: string;
  positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-2xl font-bold tabular-nums ${
            positive === undefined ? '' : positive ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {formatMoney(amount)}
        </p>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; amount: string }[];
}) {
  return (
    <Card>
      <CardHeader className="py-4">
        <h3 className="font-bold text-sm uppercase tracking-tight">{title}</h3>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <EmptyState message="No entries for selected period." />
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-6 py-2 hover:bg-accent/5 transition-colors"
              >
                <span className="text-sm">{row.name}</span>
                <span className="text-sm font-bold tabular-nums">{formatMoney(row.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

      {isLoading && (
        <Card>
          <CardContent className="p-0">
            <LoadingIndicator />
          </CardContent>
        </Card>
      )}

      {!isLoading && isError && (
        <Card>
          <CardContent className="p-0">
            <EmptyState message="Failed to load P&L summary. Please try again." />
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Revenue" amount={data.total_revenue} positive />
            <KpiCard label="COGS" amount={data.cost_of_goods} positive={false} />
            <KpiCard
              label="Gross Profit"
              amount={data.gross_profit}
              positive={Number(data.gross_profit) >= 0}
            />
            <KpiCard label="Operating Expenses" amount={data.total_expenses} positive={false} />
            <KpiCard
              label="Net Profit"
              amount={data.net_profit}
              positive={Number(data.net_profit) >= 0}
            />
          </div>

          <GLReconciliationCard
            sourceNetProfit={data.net_profit}
            glNetProfit={data.gl_net_profit}
            variance={data.reconciliation_variance}
            currency={data.currency}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable title="Expenses by Category" rows={data.by_category ?? []} />
            <BreakdownTable title="Expenses by Cost Center" rows={data.by_cost_center ?? []} />
          </div>
        </>
      )}
    </div>
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
  const fmt = (n: number) =>
    `${cur} ${Math.abs(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Card className={cn('border', reconciled ? 'border-green-500/40' : 'border-destructive/40')}>
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

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <FormField label="As Of">
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </FormField>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Balance Sheet</h3>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingIndicator />}
          {!isLoading && isError && <EmptyState message="Failed to load balance sheet. Please try again." />}
          {!isLoading && !isError && data && (
            <div className="divide-y divide-border">
              {data.sections.map((s, i) => (
                <ReportSectionView key={i} section={s} />
              ))}
            </div>
          )}
          {!isLoading && !isError && !data?.sections?.length && <EmptyState message="No balance sheet data." />}
        </CardContent>
      </Card>
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

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Cash Flow Statement</h3>
          </div>
          {data?.total && (
            <Badge variant={Number(data.total) >= 0 ? 'success' : 'error'}>
              Net: {Number(data.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingIndicator />}
          {!isLoading && isError && <EmptyState message="Failed to load cash flow statement. Please try again." />}
          {!isLoading && !isError && data && (
            <div className="divide-y divide-border">
              {data.sections.map((s, i) => (
                <ReportSectionView key={i} section={s} />
              ))}
              {data.total && (
                <div className="flex items-center justify-between px-6 py-3 bg-primary/5 font-bold border-t-2 border-primary/20">
                  <span className="text-sm uppercase">Net Cash Flow</span>
                  <span className="text-lg tabular-nums">
                    {Number(data.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}
          {!isLoading && !isError && !data?.sections?.length && <EmptyState message="No cash flow data for selected period." />}
        </CardContent>
      </Card>
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

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Tax Summary</h3>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingIndicator />}
          {!isLoading && isError && <EmptyState message="Failed to load tax summary. Please try again." />}
          {!isLoading && !isError && data && (
            <div className="divide-y divide-border">
              {data.sections.map((s, i) => (
                <ReportSectionView key={i} section={s} />
              ))}
            </div>
          )}
          {!isLoading && !isError && !data?.sections?.length && <EmptyState message="No tax data for selected period." />}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Shared Components ----

function LoadingIndicator() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading report...
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="p-12 text-center text-muted-foreground">{message}</div>;
}
