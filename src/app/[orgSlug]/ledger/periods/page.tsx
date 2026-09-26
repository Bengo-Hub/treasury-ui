'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildPeriodColumns } from './period-columns';
import { usePeriodSummary, useCreatePeriod, useClosePeriod } from '@/hooks/use-ledger';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { PeriodSummary } from '@/lib/api/ledger';
import { cn } from '@/lib/utils';
import { Banknote, CalendarClock, CalendarRange, Loader2, Plus, Receipt, RefreshCw, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const periodTypes = ['monthly', 'quarterly', 'custom'] as const;

interface PeriodFormData {
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
}

const emptyForm: PeriodFormData = {
  name: '',
  period_type: 'custom',
  start_date: '',
  end_date: '',
};

/**
 * Accounting Periods: periods are generated automatically from the Financial Year settings (start
 * and monthly/quarterly frequency) and every journal entry is linked to its period. Each period
 * shows its revenue, expenses and net profit; ended periods are flagged "Ready to close" and must
 * be closed in order. Earlier fiscal years stay browsable through the year selector.
 */
export default function AccountingPeriodsPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const [fiscalYear, setFiscalYear] = useState<string | undefined>(undefined);
  const { data, isLoading, isError, refetch, isFetching } = usePeriodSummary(effectiveTenant, fiscalYear);
  const createMutation = useCreatePeriod();
  const closeMutation = useClosePeriod();

  const [createOpen, setCreateOpen] = useState(false);
  const [closePeriodTarget, setClosePeriodTarget] = useState<PeriodSummary | null>(null);
  const [formData, setFormData] = useState<PeriodFormData>(emptyForm);

  const periods = data?.periods ?? [];
  const pendingClose = data?.pending_close ?? 0;
  // Periods close strictly in order, so only the oldest ended-but-open period in view is closable.
  const nextToCloseId = periods.find((p) => p.needs_closing)?.id;
  const columns = useMemo(
    () => buildPeriodColumns({ onClose: (period) => setClosePeriodTarget(period), nextToCloseId }),
    [nextToCloseId],
  );
  const net = Number(data?.totals?.net_profit ?? 0);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting Periods</h1>
          <p className="text-muted-foreground mt-1">
            Generated from your{' '}
            <Link href={`/${orgSlug}/settings?tab=financial-year`} className="text-primary hover:underline">
              financial year settings
            </Link>{' '}
            ({data?.period_frequency ?? 'monthly'}). Every journal entry is linked to its period.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="bg-card border border-border rounded-lg py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
            value={fiscalYear ?? data?.fiscal_year?.label ?? ''}
            onChange={(e) => setFiscalYear(e.target.value || undefined)}
            aria-label="Fiscal year"
          >
            {(data?.fiscal_years ?? []).map((fy) => (
              <option key={fy.label} value={fy.label}>
                {fy.label}{fy.is_current ? ' (current)' : ''}
              </option>
            ))}
            {!data?.fiscal_years?.length && <option value="">Current fiscal year</option>}
          </select>
          <Button variant="outline" disabled={isFetching} onClick={() => refetch()} title="Refresh periods">
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
          <Button variant="outline" className="gap-2" onClick={openCreate} title="Add a custom period">
            <Plus className="h-4 w-4" /> Custom Period
          </Button>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s accounting periods. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {pendingClose > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p>
            <span className="font-semibold">
              {pendingClose} period{pendingClose === 1 ? ' has' : 's have'} ended and {pendingClose === 1 ? 'is' : 'are'} ready to close.
            </span>{' '}
            <span className="text-muted-foreground">
              Review each period&apos;s figures and close them oldest first. Closing locks the period against new or
              backdated journal entries.
            </span>
          </p>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load accounting periods. Check your connection and try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={`Revenue${data?.fiscal_year ? ` ${data.fiscal_year.label}` : ''}`}
          value={money(data?.totals?.revenue)}
          tone="success"
          loading={isLoading}
          icon={<Banknote className="h-5 w-5" />}
        />
        <StatCard label="Expenses" value={money(data?.totals?.expenses)} tone="warning" loading={isLoading} icon={<Receipt className="h-5 w-5" />} />
        <StatCard
          label="Net Profit"
          value={money(data?.totals?.net_profit)}
          tone={net < 0 ? 'destructive' : 'primary'}
          loading={isLoading}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <CalendarRange className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-tight">
            Periods{data?.fiscal_year ? ` · ${data.fiscal_year.label}` : ''}
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-2 pb-2">
            <DataTable<PeriodSummary>
              columns={columns}
              rows={periods}
              rowKey={(p) => p.id}
              loading={isLoading}
              loadingRows={8}
              error={isError}
              storageKey="accounting-periods-summary-table"
              emptyText="No accounting periods for this fiscal year yet. They are generated automatically from the financial year settings."
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Period Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          title="Custom Accounting Period"
          description="Regular periods are generated automatically. Add a custom one only for a range the automatic periods do not cover."
          onClose={() => setCreateOpen(false)}
        >
          <div className="space-y-4">
            <FormField label="Name" required>
              <input
                className={inputClasses}
                placeholder="e.g. Opening balances 2025"
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

      {/* Close Period Confirmation, with the period's summary */}
      <Dialog open={!!closePeriodTarget} onOpenChange={(open) => !open && setClosePeriodTarget(null)}>
        <DialogContent title="Close Period" onClose={() => setClosePeriodTarget(null)}>
          {closePeriodTarget && (
            <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg border border-border bg-accent/10 p-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Revenue</p>
                <p className="text-sm font-semibold">{money(closePeriodTarget.revenue)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Expenses</p>
                <p className="text-sm font-semibold">{money(closePeriodTarget.expenses)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Net Profit</p>
                <p className={cn('text-sm font-semibold', Number(closePeriodTarget.net_profit) < 0 ? 'text-destructive' : 'text-emerald-600')}>
                  {money(closePeriodTarget.net_profit)}
                </p>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground mb-4">
            Close <span className="font-bold text-foreground">{closePeriodTarget?.name}</span>
            {closePeriodTarget ? ` (${closePeriodTarget.entry_count} journal entr${closePeriodTarget.entry_count === 1 ? 'y' : 'ies'})` : ''}?
            Once closed, no journal entry can be approved into this date range.
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
