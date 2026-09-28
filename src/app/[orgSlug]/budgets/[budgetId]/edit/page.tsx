'use client';

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { useBudget } from '@/hooks/use-budgets';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { BudgetBuilder } from '../../budget-builder';

export default function EditBudgetPage() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  const tenant = (isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId) ?? '';
  const { data: budget, isLoading, error } = useBudget(tenant, budgetId);

  return (
    <SubscriptionGate feature="budgeting">
      <div className="p-6 space-y-6 max-w-6xl">
        <h1 className="text-3xl font-bold tracking-tight">Edit budget</h1>
        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {error && <p className="text-sm text-destructive">Could not load the budget.</p>}
        {budget && budget.status !== 'draft' && budget.status !== 'rejected' && (
          <p className="rounded-lg border border-border bg-accent/5 px-4 py-3 text-sm text-muted-foreground">
            Only a draft or a returned budget can be edited. To change an approved budget, open it and choose Revise, which creates a new draft version.
          </p>
        )}
        {budget && (budget.status === 'draft' || budget.status === 'rejected') && <BudgetBuilder tenant={tenant} orgSlug={orgSlug} existing={budget} />}
      </div>
    </SubscriptionGate>
  );
}
