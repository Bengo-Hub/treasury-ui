'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inbox, Plus, Target } from 'lucide-react';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { useBudgets } from '@/hooks/use-budgets';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { Budget } from '@/lib/api/budgets';
import { cn } from '@/lib/utils';
import { buildBudgetColumns } from './budget-columns';

const TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'operating', label: 'Operating' },
  { value: 'project', label: 'Projects' },
  { value: 'capex', label: 'Capital' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'forecast', label: 'Forecasts' },
];

export default function BudgetsPage() {
  return (
    <Suspense fallback={null}>
      <BudgetsView />
    </Suspense>
  );
}

function BudgetsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const projectFilter = searchParams.get('project_id') ?? undefined;
  const [budgetType, setBudgetType] = useState(projectFilter ? 'project' : '');

  // Deep link from projects-ui ("Create budget in Finance"): open the builder pre-filled.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      const qs = new URLSearchParams(searchParams.toString());
      qs.delete('new');
      router.replace(`/${orgSlug}/budgets/new?${qs.toString()}`);
    }
  }, [searchParams, router, orgSlug]);

  const { data, isLoading, error } = useBudgets(effectiveTenant, {
    budget_type: budgetType || undefined,
    project_id: projectFilter,
    limit: 100,
  });
  const budgets = data?.budgets ?? [];
  const columns = useMemo(() => buildBudgetColumns(), []);

  const newHref = projectFilter
    ? `/${orgSlug}/budgets/new?budget_type=project&project_id=${projectFilter}`
    : `/${orgSlug}/budgets/new`;

  return (
    <SubscriptionGate feature="budgeting">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
            <p className="text-muted-foreground mt-1">
              Plan spend and revenue by account, cost centre and project, then track actual and committed spend against it.
            </p>
          </div>
          <Button onClick={() => router.push(newHref)} className="gap-2">
            <Plus className="h-4 w-4" /> New budget
          </Button>
        </div>

        {projectFilter && (
          <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-sm text-muted-foreground">
            Showing the budgets of one project.{' '}
            <button className="font-medium text-primary underline" onClick={() => router.push(`/${orgSlug}/budgets`)}>
              Show all budgets
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load budgets. Check your connection and try again.
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-tight">Budgets</h3>
            </div>
            <div className="flex flex-wrap gap-1">
              {TYPE_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setBudgetType(t.value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    budgetType === t.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-2 pb-2">
              <DataTable<Budget>
                columns={columns}
                rows={budgets}
                rowKey={(b) => b.id}
                loading={isLoading}
                loadingRows={8}
                error={!!error}
                onRowClick={(b) => router.push(`/${orgSlug}/budgets/${b.id}`)}
                storageKey="budgets-table-v2"
                showExportCsv
                exportFileName={`budgets-${orgSlug || 'export'}`}
                emptyState={
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-16 w-16 rounded-full bg-accent/40 flex items-center justify-center mb-4 mx-auto">
                      <Inbox className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">No budgets yet</p>
                    <p className="text-sm text-muted-foreground">Create one to plan the year and see spend against it.</p>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </SubscriptionGate>
  );
}
