'use client';

import { Badge, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useAccounts } from '@/hooks/use-accounts';
import { useAccountingPeriods, useJournalEntries } from '@/hooks/use-ledger';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useBudgets } from '@/hooks/use-budgets';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { useBalanceSheet, useProfitLoss } from '@/hooks/use-reports';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calculator,
  ClipboardCheck,
  Landmark,
  LayoutGrid,
  PieChart,
  Receipt,
  Shield,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

function getDefaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export default function AccountingPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  const defaults = getDefaultRange();

  const { data: accountsData } = useAccounts(effectiveTenant, {});
  const { data: journalData } = useJournalEntries(effectiveTenant, { status: 'posted' });
  const { data: periodsData } = useAccountingPeriods(effectiveTenant);
  const { data: budgetsData } = useBudgets(effectiveTenant);
  const { data: costCentersData } = useCostCenters(effectiveTenant, { active_only: true });
  const { data: plData } = useProfitLoss(effectiveTenant, defaults.from, defaults.to);
  const { data: bsData } = useBalanceSheet(effectiveTenant, defaults.to);

  const accounts = accountsData?.accounts ?? [];
  const postedEntries = journalData?.entries ?? [];
  const periods = periodsData?.periods ?? [];
  const budgets = budgetsData?.budgets ?? [];
  const costCenters = costCentersData?.cost_centers ?? [];

  const moduleCards: Array<{ title: string; description: string; href: string; icon: LucideIcon }> = [
    { title: 'Chart of Accounts', description: 'Organize assets, liabilities, revenue, and expenses with a complete chart structure.', href: `/${effectiveTenant}/ledger/accounts`, icon: Landmark },
    { title: 'Journal Entries', description: 'Review and post manual and system-generated entries with an audit-friendly workflow.', href: `/${effectiveTenant}/ledger/journals`, icon: BookOpen },
    { title: 'Voucher Book', description: 'Track source documents, voucher types, and recurring posting patterns.', href: `/${effectiveTenant}/ledger/vouchers`, icon: Receipt },
    { title: 'Period Close', description: 'Close accounting periods and keep the books aligned across each cycle.', href: `/${effectiveTenant}/accounting/close-periods`, icon: Shield },
    { title: 'Audit Trail', description: 'Inspect changes and approvals across accounting actions and settings.', href: `/${effectiveTenant}/accounting/audit-history`, icon: ClipboardCheck },
    { title: 'Reconciliation', description: 'Match bank statements and posted transactions to keep cash accurate.', href: `/${effectiveTenant}/banking/reconciliation`, icon: Calculator },
    { title: 'Budgets', description: 'Plan spending and compare actuals against budget lines in one place.', href: `/${effectiveTenant}/budgets`, icon: TrendingUp },
    { title: 'Reports', description: 'Open the full financial reporting suite for statements, ledgers, and summaries.', href: `/${effectiveTenant}/reports`, icon: PieChart },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Accounting hub</p>
            <h1 className="text-3xl font-bold tracking-tight">Refrens-style accounting workspace</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Keep the chart of accounts, journals, vouchers, periods, budgets, reconciliation, and reports aligned in a single accounting experience.
            </p>
          </div>
          <Badge variant="default">Tenant scoped • API driven</Badge>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam ? (
        <div className="rounded-2xl border border-dashed border-border bg-accent/10 px-6 py-10 text-center text-sm text-muted-foreground">
          Select a tenant to view their accounting workspace.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accounts</p>
                <p className="mt-2 text-2xl font-bold">{accounts.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Posted entries</p>
                <p className="mt-2 text-2xl font-bold">{postedEntries.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open periods</p>
                <p className="mt-2 text-2xl font-bold">{periods.filter((period) => period.status !== 'closed').length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active cost centers</p>
                <p className="mt-2 text-2xl font-bold">{costCenters.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="py-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-tight">Core accounting modules</h3>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {moduleCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link key={card.title} href={card.href} className="rounded-xl border border-border/70 bg-accent/10 p-4 transition hover:border-primary/40 hover:bg-accent/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{card.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-tight">Financial snapshot</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border/70 bg-accent/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net income</p>
                    <p className="mt-2 text-xl font-bold">{Number(plData?.total ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-accent/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance sheet</p>
                    <p className="mt-2 text-xl font-bold">{Number(bsData?.total ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-accent/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budgets</p>
                    <p className="mt-2 text-xl font-bold">{budgets.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-tight">Latest posted activity</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {postedEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/70 bg-accent/10 px-3 py-3">
                      <p className="text-sm font-semibold">{entry.entry_number}</p>
                      <p className="text-xs text-muted-foreground">{entry.description || 'No description'}</p>
                    </div>
                  ))}
                  {postedEntries.length === 0 && <p className="text-sm text-muted-foreground">No posted entries available yet.</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
