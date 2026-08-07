'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildPeriodColumns } from './period-columns';
import {
  useAccountingPeriods,
  useCreatePeriod,
  useClosePeriod,
} from '@/hooks/use-ledger';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { AccountingPeriod } from '@/lib/api/ledger';
import { cn } from '@/lib/utils';
import { CalendarRange, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

const periodTypes = ['monthly', 'quarterly', 'yearly'] as const;

interface PeriodFormData {
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
}

const emptyForm: PeriodFormData = {
  name: '',
  period_type: 'monthly',
  start_date: '',
  end_date: '',
};

export default function AccountingPeriodsPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data, isLoading, isError, refetch, isFetching } = useAccountingPeriods(effectiveTenant);
  const createMutation = useCreatePeriod();
  const closeMutation = useClosePeriod();

  const [createOpen, setCreateOpen] = useState(false);
  const [closePeriodTarget, setClosePeriodTarget] = useState<AccountingPeriod | null>(null);
  const [formData, setFormData] = useState<PeriodFormData>(emptyForm);

  const periods = data?.periods ?? [];
  const columns = useMemo(() => buildPeriodColumns({ onClose: (period) => setClosePeriodTarget(period) }), []);

  const inputClasses =
    'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none';

  function openCreate() {
    setFormData(emptyForm);
    setCreateOpen(true);
  }

  function handleCreate() {
    createMutation.mutate(
      {
        tenantSlug: effectiveTenant,
        data: {
          name: formData.name,
          period_type: formData.period_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
        },
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  }

  function handleClose() {
    if (!closePeriodTarget) return;
    closeMutation.mutate(
      { tenantSlug: effectiveTenant, periodID: closePeriodTarget.id },
      { onSuccess: () => setClosePeriodTarget(null) },
    );
  }

  return (
    <SubscriptionGate feature="ledger_posting">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting Periods</h1>
          <p className="text-muted-foreground mt-1">
            Define and close fiscal periods to lock posted entries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={isFetching} onClick={() => refetch()} title="Refresh periods">
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Period
          </Button>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s accounting periods. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load accounting periods. Check your connection and try again.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <CalendarRange className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-tight">Periods</h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-2 pb-2">
            <DataTable<AccountingPeriod>
              columns={columns}
              rows={periods}
              rowKey={(p) => p.id}
              loading={isLoading}
              error={isError}
              storageKey="accounting-periods-table"
              emptyText="No accounting periods defined yet."
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Period Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          title="New Accounting Period"
          description="Define a fiscal period for the ledger."
          onClose={() => setCreateOpen(false)}
        >
          <div className="space-y-4">
            <FormField label="Name" required>
              <input
                className={inputClasses}
                placeholder="e.g. June 2026"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </FormField>
            <FormField label="Type" required>
              <select
                className={inputClasses}
                value={formData.period_type}
                onChange={(e) => setFormData((p) => ({ ...p, period_type: e.target.value }))}
              >
                {periodTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start Date" required>
                <input
                  type="date"
                  className={inputClasses}
                  value={formData.start_date}
                  onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                />
              </FormField>
              <FormField label="End Date" required>
                <input
                  type="date"
                  className={inputClasses}
                  value={formData.end_date}
                  onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))}
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !formData.name ||
                  !formData.start_date ||
                  !formData.end_date ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Period
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Period Confirmation */}
      <Dialog open={!!closePeriodTarget} onOpenChange={(open) => !open && setClosePeriodTarget(null)}>
        <DialogContent title="Close Period" onClose={() => setClosePeriodTarget(null)}>
          <p className={cn('text-sm text-muted-foreground mb-4')}>
            Are you sure you want to close{' '}
            <span className="font-bold text-foreground">{closePeriodTarget?.name}</span>? Once
            closed, no further journal entries can be posted in this date range.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setClosePeriodTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClose} disabled={closeMutation.isPending}>
              {closeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Close Period
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </SubscriptionGate>
  );
}
