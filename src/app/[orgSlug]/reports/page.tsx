'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfitLoss, useBalanceSheet, useCashFlow, useTaxSummaryReport } from '@/hooks/use-reports';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { FinancialReport, ReportSection } from '@/lib/api/reports';
import {
  BarChart3,
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
  const { tenantPathId } = useResolvedTenant();
  const [tab, setTab] = useState('pl');
  const defaults = getDefaultRange();
  const [plFrom, setPlFrom] = useState(defaults.from);
  const [plTo, setPlTo] = useState(defaults.to);
  const [bsAsOf, setBsAsOf] = useState(defaults.to);
  const [cfFrom, setCfFrom] = useState(defaults.from);
  const [cfTo, setCfTo] = useState(defaults.to);
  const [taxFrom, setTaxFrom] = useState(defaults.from);
  const [taxTo, setTaxTo] = useState(defaults.to);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground mt-1">View financial statements and summaries.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
          <TabsTrigger value="tax">Tax Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="pl" className="mt-6">
          <ProfitLossTab tenantSlug={tenantPathId} from={plFrom} to={plTo} setFrom={setPlFrom} setTo={setPlTo} />
        </TabsContent>
        <TabsContent value="bs" className="mt-6">
          <BalanceSheetTab tenantSlug={tenantPathId} asOf={bsAsOf} setAsOf={setBsAsOf} />
        </TabsContent>
        <TabsContent value="cf" className="mt-6">
          <CashFlowTab tenantSlug={tenantPathId} from={cfFrom} to={cfTo} setFrom={setCfFrom} setTo={setCfTo} />
        </TabsContent>
        <TabsContent value="tax" className="mt-6">
          <TaxSummaryTab tenantSlug={tenantPathId} from={taxFrom} to={taxTo} setFrom={setTaxFrom} setTo={setTaxTo} />
        </TabsContent>
      </Tabs>
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
    <div className="flex gap-4 items-end">
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
  const { data, isLoading } = useProfitLoss(tenantSlug, from, to);

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
          {!isLoading && data && (
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
          {!isLoading && !data?.sections?.length && <EmptyState message="No data for selected period." />}
        </CardContent>
      </Card>
    </div>
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
  const { data, isLoading } = useBalanceSheet(tenantSlug, asOf);

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
          {!isLoading && data && (
            <div className="divide-y divide-border">
              {data.sections.map((s, i) => (
                <ReportSectionView key={i} section={s} />
              ))}
            </div>
          )}
          {!isLoading && !data?.sections?.length && <EmptyState message="No balance sheet data." />}
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
  const { data, isLoading } = useCashFlow(tenantSlug, from, to);

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
          {!isLoading && data && (
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
          {!isLoading && !data?.sections?.length && <EmptyState message="No cash flow data for selected period." />}
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
  const { data, isLoading } = useTaxSummaryReport(tenantSlug, from, to);

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
          {!isLoading && data && (
            <div className="divide-y divide-border">
              {data.sections.map((s, i) => (
                <ReportSectionView key={i} section={s} />
              ))}
            </div>
          )}
          {!isLoading && !data?.sections?.length && <EmptyState message="No tax data for selected period." />}
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
