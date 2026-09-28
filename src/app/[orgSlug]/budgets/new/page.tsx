'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { BudgetType } from '@/lib/api/budgets';
import { BudgetBuilder } from '../budget-builder';

export default function NewBudgetPage() {
  return (
    <Suspense fallback={null}>
      <NewBudgetView />
    </Suspense>
  );
}

function NewBudgetView() {
  const searchParams = useSearchParams();
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  const tenant = (isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId) ?? '';
  const projectId = searchParams.get('project_id') ?? undefined;
  const budgetType = (searchParams.get('budget_type') as BudgetType | null) ?? (projectId ? 'project' : undefined);

  return (
    <SubscriptionGate feature="budgeting">
      <div className="p-6 space-y-6 max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New budget</h1>
          <p className="text-muted-foreground mt-1">
            {projectId
              ? "Plan the project's spend by account. Actual and committed spend tagged to the project is tracked against it."
              : 'Plan spend and revenue by account, optionally for one cost centre, and phase it by month if the year is uneven.'}
          </p>
        </div>
        <BudgetBuilder tenant={tenant} orgSlug={orgSlug} preset={{ budget_type: budgetType, project_id: projectId }} />
      </div>
    </SubscriptionGate>
  );
}
