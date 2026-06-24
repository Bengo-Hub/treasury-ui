'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useClosePeriod, useCreatePeriod, useAccountingPeriods } from '@/hooks/use-ledger';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { AccountingPeriod } from '@/lib/api/ledger';
import { CalendarRange, CheckCircle2, Loader2, Plus, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

const emptyForm = {
  name: '',
  period_type: 'month',
  start_date: '',
  end_date: '',
};

export default function ClosePeriodsPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { data, isLoading, error } = useAccountingPeriods(effectiveTenant);
  const createMutation = useCreatePeriod();
  const closeMutation = useClosePeriod();

  const periods = data?.periods ?? [];
  const openPeriods = useMemo(() => periods.filter((period) => period.status !== 'closed'), [periods]);
  const closedPeriods = useMemo(() => periods.filter((period) => period.status === 'closed'), [periods]);

  function handleCreate() {
    createMutation.mutate(
      {
        tenantSlug: effectiveTenant,
        data: {
          name: form.name,
          period_type: form.period_type,
          start_date: form.start_date,
          end_date: form.end_date,
        },
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-background/80 p-3 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Period close</p>
              <h1 className="text-3xl font-bold tracking-tight">Close Periods</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Define accounting periods, keep them current, and close them once the books are ready for reporting.
              </p>
            </div>
          </div>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Period
          </Button>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam ? (
        <div className="rounded-2xl border border-dashed border-border bg-accent/10 px-6 py-10 text-center text-sm text-muted-foreground">
          Select a tenant to manage accounting periods and month-end close.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open periods</p>
                <p className="mt-2 text-2xl font-bold">{openPeriods.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Still accepting transactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closed periods</p>
                <p className="mt-2 text-2xl font-bold">{closedPeriods.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Locked for reporting and audit</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-4">
              <h3 className="text-sm font-bold uppercase tracking-tight">Accounting periods</h3>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading periods...
                </div>
              ) : error ? (
                <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Failed to load periods. Please try again.
                </div>
              ) : periods.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No accounting periods have been created yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {periods.map((period) => (
                    <div key={period.id} className="flex items-center justify-between px-6 py-4 hover:bg-accent/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl border border-border bg-accent/30 p-2">
                          <CalendarRange className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{period.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {period.start_date} → {period.end_date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={period.status === 'closed' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}>
                          {period.status}
                        </Badge>
                        {period.status !== 'closed' && (
                          <Button size="sm" variant="outline" onClick={() => closeMutation.mutate({ tenantSlug: effectiveTenant, periodID: period.id })} disabled={closeMutation.isPending}>
                            {closeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Close
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <CreatePeriodDialog open={createOpen} onOpenChange={setCreateOpen} form={form} setForm={setForm} onCreate={handleCreate} createPending={createMutation.isPending} />
    </div>
  );
}

function CreatePeriodDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onCreate,
  createPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: { name: string; period_type: string; start_date: string; end_date: string };
  setForm: (value: any) => void;
  onCreate: () => void;
  createPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New Accounting Period" description="Create a new month or custom business period." onClose={() => onOpenChange(false)}>
        <div className="space-y-4">
          <FormField label="Period Name" required>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" placeholder="e.g. April 2026" />
          </FormField>
          <FormField label="Period Type">
            <select value={form.period_type} onChange={(e) => setForm({ ...form, period_type: e.target.value })} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm">
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
              <option value="custom">Custom</option>
            </select>
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Start Date" required>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
            </FormField>
            <FormField label="End Date" required>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onCreate} disabled={createPending}>
              {createPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Period
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
