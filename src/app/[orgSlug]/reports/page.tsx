'use client';

import { Badge, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccounts } from '@/hooks/use-accounts';
import { useJournalEntries, useTrialBalance } from '@/hooks/use-ledger';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useProfitLoss,
  useBalanceSheet,
  useCashFlow,
  useTaxSummaryReport,
  useProfitLossSummary,
} from '@/hooks/use-reports';
import type { ReportSection } from '@/lib/api/reports';
import {
  BarChart3,
  BookOpen,
  Calculator,
  DollarSign,
  FileText,
  LayoutGrid,
  Loader2,
  PieChart,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

function getDefaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export default function ReportsPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  const [tab, setTab] = useState('overview');
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
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Financial reporting</p>
            <h1 className="text-3xl font-bold tracking-tight">Accounting Reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review your P&L, balance sheet, trial balance, ledger master, day book, and cash flow statements from one place.
            </p>
          </div>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam ? (
        <div className="rounded-2xl border border-dashed border-border bg-accent/10 px-6 py-10 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above to view their financial reports.
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="income">Income Statement</TabsTrigger>
            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
            <TabsTrigger value="tb">Trial Balance</TabsTrigger>
            <TabsTrigger value="ledger">Ledger Master</TabsTrigger>
            <TabsTrigger value="daybook">Day Book</TabsTrigger>
            <TabsTrigger value="cf">Cash Flow</TabsTrigger>
            <TabsTrigger value="pls">P&L Summary</TabsTrigger>
            <TabsTrigger value="tax">Tax Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ReportsOverview tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="pl" className="mt-6">
            <ProfitLossTab tenantSlug={effectiveTenant} from={plFrom} to={plTo} setFrom={setPlFrom} setTo={setPlTo} />
          </TabsContent>
          <TabsContent value="income" className="mt-6">
            <IncomeStatementTab tenantSlug={effectiveTenant} from={plFrom} to={plTo} setFrom={setPlFrom} setTo={setPlTo} />
          </TabsContent>
          <TabsContent value="bs" className="mt-6">
            <BalanceSheetTab tenantSlug={effectiveTenant} asOf={bsAsOf} setAsOf={setBsAsOf} />
          </TabsContent>
          <TabsContent value="tb" className="mt-6">
            <TrialBalanceTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="ledger" className="mt-6">
            <LedgerMasterTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="daybook" className="mt-6">
            <DayBookTab tenantSlug={effectiveTenant} />
          </TabsContent>
          <TabsContent value="cf" className="mt-6">
            <CashFlowTab tenantSlug={effectiveTenant} from={cfFrom} to={cfTo} setFrom={setCfFrom} setTo={setCfTo} />
          </TabsContent>
          <TabsContent value="pls" className="mt-6">
            <ProfitLossSummaryTab tenantSlug={effectiveTenant} from={plsFrom} to={plsTo} setFrom={setPlsFrom} setTo={setPlsTo} />
          </TabsContent>
          <TabsContent value="tax" className="mt-6">
            <TaxSummaryTab tenantSlug={effectiveTenant} from={taxFrom} to={taxTo} setFrom={setTaxFrom} setTo={setTaxTo} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DateRangeFilter({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <FormField label="From">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
      </FormField>
      <FormField label="To">
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
      </FormField>
    </div>
  );
}

function ReportSectionView({ section }: { section: ReportSection }) {
  return (
    <div className="space-y-1">
      <h4 className="px-6 pt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{section.name}</h4>
      {(section.rows ?? []).map((row, i) => (
        <div key={i} className="flex items-center justify-between px-6 py-2 hover:bg-accent/5 transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-12 font-mono text-xs text-muted-foreground">{row.account_code}</span>
            <span className="text-sm">{row.account_name}</span>
          </div>
          <span className="text-sm font-bold tabular-nums">{Number(row.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
        </div>
      ))}
      <div className="flex items-center justify-between bg-accent/10 px-6 py-2 font-bold">
        <span className="text-xs uppercase">Total {section.name}</span>
        <span className="text-sm tabular-nums">{Number(section.total).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}

function formatMoney(value: string | number | undefined) {
  return Number(value ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
}

function ReportsOverview({ tenantSlug }: { tenantSlug: string }) {
  const { data: plData } = useProfitLoss(tenantSlug, getDefaultRange().from, getDefaultRange().to);
  const { data: bsData } = useBalanceSheet(tenantSlug, getDefaultRange().to);
  const { data: cfData } = useCashFlow(tenantSlug, getDefaultRange().from, getDefaultRange().to);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net income</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(plData?.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance sheet</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(bsData?.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cash movement</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(cfData?.total)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-4">
          <h3 className="text-sm font-bold uppercase tracking-tight">Available reports</h3>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {[
            { label: 'Profit & Loss', value: 'pl', icon: TrendingUp },
            { label: 'Income Statement', value: 'income', icon: Calculator },
            { label: 'Balance Sheet', value: 'bs', icon: PieChart },
            { label: 'Trial Balance', value: 'tb', icon: FileText },
            { label: 'Ledger Master', value: 'ledger', icon: BookOpen },
            { label: 'Day Book', value: 'daybook', icon: Receipt },
            { label: 'Cash Flow', value: 'cf', icon: DollarSign },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.value} className="rounded-xl border border-border/70 bg-accent/10 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Open the report tab to drill into the details.</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfitLossTab({ tenantSlug, from, to, setFrom, setTo }: { tenantSlug: string; from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
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
          {data?.total !== undefined && <Badge variant={Number(data.total) >= 0 ? 'success' : 'error'}>Net: {formatMoney(data.total)}</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingIndicator />}
          {!isLoading && isError && <EmptyState message="Failed to load profit & loss statement." />}
          {!isLoading && !isError && data && <div className="divide-y divide-border">{data.sections.map((section, index) => <ReportSectionView key={index} section={section} />)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function IncomeStatementTab({ tenantSlug, from, to, setFrom, setTo }: { tenantSlug: string; from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  const { data, isLoading, isError } = useProfitLoss(tenantSlug, from, to);

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Income Statement</h3>
          </div>
          {data?.total !== undefined && <Badge variant={Number(data.total) >= 0 ? 'success' : 'error'}>Net: {formatMoney(data.total)}</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingIndicator />}
          {!isLoading && isError && <EmptyState message="Failed to load income statement." />}
          {!isLoading && !isError && data && <div className="divide-y divide-border">{data.sections.map((section, index) => <ReportSectionView key={index} section={section} />)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceSheetTab({ tenantSlug, asOf, setAsOf }: { tenantSlug: string; asOf: string; setAsOf: (v: string) => void }) {
  const { data, isLoading, isError } = useBalanceSheet(tenantSlug, asOf);

  return (
    <div className="space-y-6">
      <FormField label="As of">
        <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
      </FormField>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Balance Sheet</h3>
          </div>
          {data?.total !== undefined && <Badge variant="default">{formatMoney(data.total)}</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingIndicator />}
          {!isLoading && isError && <EmptyState message="Failed to load balance sheet." />}
          {!isLoading && !isError && data && <div className="divide-y divide-border">{data.sections.map((section, index) => <ReportSectionView key={index} section={section} />)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function TrialBalanceTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading, isError } = useTrialBalance(tenantSlug);

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Trial Balance</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && <LoadingIndicator />}
        {!isLoading && isError && <EmptyState message="Failed to load trial balance." />}
        {!isLoading && !isError && data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/5">
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Account</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data.rows ?? []).map((row) => (
                  <tr key={row.account_id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs">{row.account_code}</td>
                    <td className="px-6 py-3 text-sm">{row.account_name}</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold">{formatMoney(row.debit)}</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold">{formatMoney(row.credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LedgerMasterTab({ tenantSlug }: { tenantSlug: string }) {
  const { data: accountsData, isLoading: accountsLoading } = useAccounts(tenantSlug, {});
  const { data: entriesData, isLoading: entriesLoading } = useJournalEntries(tenantSlug);
  const accounts = accountsData?.accounts ?? [];
  const entries = entriesData?.entries ?? [];

  const ledgerRows = useMemo(() => {
    const totals = new Map<string, { debit: number; credit: number; name: string; code: string }>();
    for (const account of accounts) {
      totals.set(account.id, { debit: 0, credit: 0, name: account.account_name, code: account.account_code });
    }
    for (const entry of entries) {
      for (const line of entry.lines ?? []) {
        const acct = accounts.find((item) => item.id === line.account_id);
        if (!acct) continue;
        const current = totals.get(acct.id) ?? { debit: 0, credit: 0, name: acct.account_name, code: acct.account_code };
        current.debit += Number(line.debit_amount || 0);
        current.credit += Number(line.credit_amount || 0);
        totals.set(acct.id, current);
      }
    }
    return Array.from(totals.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, entries]);

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">All Ledgers Master Report</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {(accountsLoading || entriesLoading) && <LoadingIndicator />}
        {!accountsLoading && !entriesLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/5">
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Account</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledgerRows.map((row) => (
                  <tr key={row.code} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs">{row.code}</td>
                    <td className="px-6 py-3 text-sm">{row.name}</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold">{formatMoney(row.debit)}</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold">{formatMoney(row.credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DayBookTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading, isError } = useJournalEntries(tenantSlug);
  const entries = data?.entries ?? [];

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Day Book</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && <LoadingIndicator />}
        {!isLoading && isError && <EmptyState message="Failed to load day book." />}
        {!isLoading && !isError && (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-6 py-4 hover:bg-accent/5 transition-colors">
                <div>
                  <p className="text-sm font-semibold">{entry.entry_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.entry_date).toLocaleDateString()} · {entry.description || 'No description'}</p>
                </div>
                <div className="text-right text-sm font-semibold">
                  {((entry.lines ?? []).reduce((sum, line) => sum + Number(line.debit_amount || 0), 0)).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CashFlowTab({ tenantSlug, from, to, setFrom, setTo }: { tenantSlug: string; from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
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
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingIndicator />}
          {!isLoading && isError && <EmptyState message="Failed to load cash flow statement." />}
          {!isLoading && !isError && data && <div className="divide-y divide-border">{data.sections.map((section, index) => <ReportSectionView key={index} section={section} />)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfitLossSummaryTab({ tenantSlug, from, to, setFrom, setTo }: { tenantSlug: string; from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  const { data, isLoading, isError } = useProfitLossSummary(tenantSlug, from, to);

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Revenue</p><p className="mt-1 text-2xl font-bold">{formatMoney(data?.total_revenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expenses</p><p className="mt-1 text-2xl font-bold">{formatMoney(data?.total_expenses)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gross Profit</p><p className="mt-1 text-2xl font-bold">{formatMoney(data?.gross_profit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Net Profit</p><p className="mt-1 text-2xl font-bold">{formatMoney(data?.net_profit)}</p></CardContent></Card>
      </div>
      {isLoading && <LoadingIndicator />}
      {!isLoading && isError && <EmptyState message="Failed to load P&L summary." />}
    </div>
  );
}

function TaxSummaryTab({ tenantSlug, from, to, setFrom, setTo }: { tenantSlug: string; from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  const { data, isLoading, isError } = useTaxSummaryReport(tenantSlug, from, to);

  return (
    <div className="space-y-6">
      <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Tax Summary</h3>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingIndicator />}
          {!isLoading && isError && <EmptyState message="Failed to load tax summary." />}
          {!isLoading && !isError && data && <div className="divide-y divide-border">{data.sections.map((section, index) => <ReportSectionView key={index} section={section} />)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

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
