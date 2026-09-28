'use client';

import { AlertTriangle } from 'lucide-react';
import { money } from '@/components/charts/chart-theme';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useHasPermission, useIsPlatformOwner, useIsSuperAdmin } from '@/hooks/useMe';
import type { BudgetCheckResult } from '@/lib/api/budgets';

/**
 * Shown when treasury-api answers 409 over_budget: the spend would pass a budget set to Stop.
 * Budget approvers (treasury.budgets.approve) may push it through, which re-sends the request with
 * ?override_budget=true; the server re-checks the permission, so this only decides what to offer.
 */
export function OverBudgetDialog({
  result,
  what,
  onOverride,
  onClose,
  isPending,
}: {
  result: BudgetCheckResult | null;
  /** What is being blocked, e.g. "This expense". */
  what: string;
  onOverride: () => void;
  onClose: () => void;
  isPending?: boolean;
}) {
  const approver = useHasPermission('treasury.budgets.approve');
  const superAdmin = useIsSuperAdmin();
  const owner = useIsPlatformOwner();
  const canOverride = approver || superAdmin || owner;
  if (!result) return null;
  const blocked = result.lines.filter((l) => l.action !== 'ok');

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Over budget"
      description={`${what} would take spending past a budget that is set to stop.`}
      confirmLabel={canOverride ? 'Approve over budget' : 'Close'}
      destructive={canOverride}
      isPending={isPending}
      onConfirm={canOverride ? onOverride : onClose}
    >
      <div className="space-y-2">
        {blocked.map((l) => (
          <div key={l.budget_line_id} className="rounded-lg border border-border p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className={l.action === 'stop' ? 'h-4 w-4 text-destructive' : 'h-4 w-4 text-yellow-600'} />
              {l.budget_name}: {l.line_name}
            </p>
            <p className="mt-1 text-muted-foreground">
              Available {money(l.available)} of {money(l.planned)}
              {l.basis === 'ytd_cumulative' ? ' planned to date' : ''}, this needs {money(l.requested)}.
            </p>
          </div>
        ))}
        {!canOverride && (
          <p className="text-xs text-muted-foreground">
            Ask someone who can approve budgets to approve it over budget, or revise the budget first.
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}
