'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Copy, LayoutTemplate, Loader2, Lock, Pencil, RotateCcw, Send, Trash2, XCircle } from 'lucide-react';
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/charts/StatCard';
import { SERIES, compactNumber, money } from '@/components/charts/chart-theme';
import { ExportMenu } from '@/components/documents/ExportMenu';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAccounts } from '@/hooks/use-accounts';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { useBudgetAction, useBudgetVariance, useCommitments, useCopyBudget, useSaveBudgetTemplate } from '@/hooks/use-budgets';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { num, type BudgetStatus } from '@/lib/api/budgets';
import { cn } from '@/lib/utils';
import { UtilisationBar, statusLabel, statusVariant, typeLabel } from '../budget-columns';

const axis = { tick: { fontSize: 11 }, tickLine: false, axisLine: false } as const;
const sourceLabel: Record<string, string> = {
  purchase_order: 'Purchase order',
  vendor_bill: 'Supplier bill',
  expense: 'Expense',
  expense_claim: 'Staff claim',
};

type Pending = 'submit' | 'approve' | 'reject' | 'revise' | 'cancel' | 'close' | 'delete' | 'copy' | 'template' | null;

export default function BudgetDetailPage() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const router = useRouter();
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  const tenant = (isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId) ?? '';

  const { data: v, isLoading, error } = useBudgetVariance(tenant, budgetId);
  const b = v?.budget;
  const { data: accountsData } = useAccounts(tenant);
  const { data: ccData } = useCostCenters(tenant);
  const { data: commitData } = useCommitments(tenant, { status: 'open', project_id: b?.project_id, limit: 50 }, !!b);
  const action = useBudgetAction();
  const copy = useCopyBudget();
  const saveTemplate = useSaveBudgetTemplate();
  const [templateName, setTemplateName] = useState('');

  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState('');
  const nextYear = new Date().getFullYear() + 1;
  const [copyForm, setCopyForm] = useState({ start_date: `${nextYear}-01-01`, end_date: `${nextYear}-12-31`, growth_pct: '0', from_actuals: false });

  const accountName = useMemo(() => {
    const m = new Map<string, string>();
    (accountsData?.accounts ?? []).forEach((a) => m.set(a.id, `${a.account_code} ${a.account_name}`));
    return m;
  }, [accountsData]);
  const ccName = useMemo(() => {
    const m = new Map<string, string>();
    (ccData?.cost_centers ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [ccData]);

  // Commitments are listed per project when the budget has one; otherwise keep those on the budget's accounts.
  const budgetAccounts = useMemo(() => new Set((v?.lines ?? []).map((l) => l.account_id).filter(Boolean)), [v]);
  const commitments = (commitData?.commitments ?? []).filter((c) => b?.project_id || (c.account_id && budgetAccounts.has(c.account_id)));

  const chart = (v?.months ?? []).map((m) => ({
    month: m.month,
    planned: num(m.planned),
    actual: num(m.actual),
    committed: num(m.committed),
    cum_planned: num(m.cum_planned),
    cum_actual: num(m.cum_actual),
  }));

  function run(kind: Exclude<Pending, null | 'copy' | 'template'>) {
    action.mutate(
      { tenantSlug: tenant, budgetID: budgetId, action: kind, reason },
      {
        onSuccess: (res) => {
          setPending(null);
          setReason('');
          if (kind === 'delete') router.push(`/${orgSlug}/budgets`);
          else if (res?.id && res.id !== budgetId) router.push(`/${orgSlug}/budgets/${res.id}`);
        },
      },
    );
  }

  function runCopy() {
    copy.mutate(
      {
        tenantSlug: tenant,
        budgetID: budgetId,
        data: {
          start_date: copyForm.start_date,
          end_date: copyForm.end_date,
          growth_pct: Number(copyForm.growth_pct) || 0,
          from_actuals: copyForm.from_actuals,
        },
      },
      {
        onSuccess: (nb) => {
          setPending(null);
          router.push(`/${orgSlug}/budgets/${nb.id}`);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !v || !b) {
    return <div className="p-6 text-sm text-destructive">Could not load the budget.</div>;
  }

  const s = v.summary;
  const status = b.status as BudgetStatus;
  const can = {
    edit: status === 'draft' || status === 'rejected',
    submit: status === 'draft' || status === 'rejected',
    decide: status === 'submitted',
    revise: status === 'approved' || status === 'active',
    close: status === 'active' || status === 'approved',
    cancel: status === 'submitted' || status === 'approved' || status === 'active',
    delete: status === 'draft' || status === 'rejected' || status === 'cancelled',
  };
  const confirmCopy: Record<string, { title: string; description: string; destructive?: boolean }> = {
    submit: { title: 'Submit for approval?', description: 'The budget is locked while it waits for an approver.' },
    approve: { title: 'Approve this budget?', description: 'Spending is checked against it from its start date.' },
    revise: { title: 'Revise this budget?', description: 'A new draft version is created. This version stays in force until the new one is approved.' },
    close: { title: 'Close this budget?', description: 'It stops controlling spend. Figures stay available for reporting.' },
    cancel: { title: 'Cancel this budget?', description: 'It stops controlling spend and cannot be reopened.', destructive: true },
    delete: { title: 'Delete this budget?', description: 'This cannot be undone.', destructive: true },
  };

  return (
    <SubscriptionGate feature="budgeting">
      <div className="p-6 space-y-6">
        <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => router.push(`/${orgSlug}/budgets`)}>
          <ArrowLeft className="h-4 w-4" /> Budgets
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{b.name}</h1>
              <Badge variant={statusVariant[status] ?? 'secondary'}>{statusLabel[status] ?? status}</Badge>
              {b.version > 1 && <span className="text-sm text-muted-foreground">Version {b.version}</span>}
            </div>
            <p className="text-muted-foreground mt-1">
              {typeLabel[b.budget_type] ?? b.budget_type} budget, {new Date(b.start_date).toLocaleDateString()} to{' '}
              {new Date(b.end_date).toLocaleDateString()}. Figures as of {new Date(v.as_of).toLocaleDateString()}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can.edit && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => router.push(`/${orgSlug}/budgets/${b.id}/edit`)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            {can.submit && (
              <Button size="sm" className="gap-1" onClick={() => setPending('submit')}>
                <Send className="h-4 w-4" /> Submit
              </Button>
            )}
            {can.decide && (
              <>
                <Button size="sm" className="gap-1" onClick={() => setPending('approve')}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setPending('reject')}>
                  <XCircle className="h-4 w-4" /> Return
                </Button>
              </>
            )}
            {can.revise && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setPending('revise')}>
                <RotateCcw className="h-4 w-4" /> Revise
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setPending('copy')}>
              <Copy className="h-4 w-4" /> Copy to new period
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setTemplateName(b.name);
                setPending('template');
              }}
            >
              <LayoutTemplate className="h-4 w-4" /> Save as template
            </Button>
            {can.close && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setPending('close')}>
                <Lock className="h-4 w-4" /> Close
              </Button>
            )}
            {can.cancel && (
              <Button variant="ghost" size="sm" onClick={() => setPending('cancel')}>
                Cancel budget
              </Button>
            )}
            {can.delete && (
              <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => setPending('delete')}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <ExportMenu
              tenant={tenant}
              path={`budgets/${b.id}/variance/export`}
              fileBase={`Budget ${b.name}`}
              title={`Budget vs actual: ${b.name}`}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Planned spend" value={money(s.expense_planned, b.currency)} hint={`To date: ${money(s.expense_planned_to_date, b.currency)}`} />
          <StatCard
            label="Spent"
            value={money(s.expense_actual, b.currency)}
            hint={`Committed: ${money(s.expense_committed, b.currency)}`}
            tone={num(s.expense_actual) + num(s.expense_committed) > num(s.expense_planned) ? 'destructive' : 'default'}
          />
          <StatCard
            label="Full-year forecast"
            value={money(s.expense_forecast, b.currency)}
            hint="Spent so far plus the rest of the plan"
            tone={num(s.expense_forecast) > num(s.expense_planned) ? 'warning' : 'success'}
          />
          <StatCard
            label="Lines over budget"
            value={String(s.lines_over_budget)}
            tone={s.lines_over_budget > 0 ? 'destructive' : 'success'}
            hint={num(s.revenue_planned) > 0 ? `Revenue ${money(s.revenue_actual, b.currency)} of ${money(s.revenue_planned, b.currency)}` : undefined}
          />
        </div>

        <Card>
          <CardContent className="py-4">
            <UtilisationBar used={b.totals?.utilisation_pct ?? 0} elapsed={b.totals?.elapsed_pct ?? 0} />
          </CardContent>
        </Card>

        <ChartCard title="Plan against actual, by month" subtitle="Bars are the month, lines are cumulative" height={300} empty={!chart.length}>
          <ComposedChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="month" {...axis} />
            <YAxis tickFormatter={compactNumber} {...axis} width={56} />
            <Tooltip formatter={(val) => money(Number(val), b.currency)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="planned" name="Planned" fill={SERIES.net} opacity={0.35} />
            <Bar dataKey="actual" name="Actual" fill={SERIES.expenses} />
            <Bar dataKey="committed" name="Committed" fill={SERIES.outstanding} />
            <Area dataKey="cum_planned" name="Planned, cumulative" stroke={SERIES.net} fill="none" type="monotone" />
            <Line dataKey="cum_actual" name="Actual, cumulative" stroke={SERIES.expenses} dot={false} type="monotone" />
          </ComposedChart>
        </ChartCard>

        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm uppercase tracking-tight">Lines</h3>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Line</th>
                  <th className="px-4 py-2 text-right">Planned</th>
                  <th className="px-4 py-2 text-right">Plan to date</th>
                  <th className="px-4 py-2 text-right">Actual</th>
                  <th className="px-4 py-2 text-right">Committed</th>
                  <th className="px-4 py-2 text-right">Available</th>
                  <th className="px-4 py-2 text-right">Variance to date</th>
                  <th className="px-4 py-2 text-right">Forecast</th>
                </tr>
              </thead>
              <tbody>
                {v.lines.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2">
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[l.account_id && accountName.get(l.account_id), l.cost_center_id && ccName.get(l.cost_center_id), l.category === 'revenue' ? 'Revenue' : null]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(l.planned_amount, b.currency)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{money(l.planned_to_date, b.currency)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(l.actual_amount, b.currency)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{money(l.committed, b.currency)}</td>
                    <td className={cn('px-4 py-2 text-right tabular-nums', num(l.available) < 0 && 'text-destructive font-semibold')}>
                      {money(l.available, b.currency)}
                    </td>
                    <td className={cn('px-4 py-2 text-right tabular-nums', l.favourable ? 'text-green-600' : 'text-destructive')}>
                      {money(l.variance_to_date, b.currency)}
                      <span className="ml-1 text-xs">({l.variance_pct.toFixed(0)}%)</span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(l.forecast_plan, b.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {v.children && v.children.length > 0 && (
          <Card>
            <CardHeader className="py-4">
              <h3 className="font-bold text-sm uppercase tracking-tight">Sub-budgets</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {v.children.map((c) => (
                <button
                  key={c.id}
                  className="grid w-full grid-cols-1 items-center gap-2 rounded-lg border border-border p-3 text-left hover:bg-accent/40 md:grid-cols-3"
                  onClick={() => router.push(`/${orgSlug}/budgets/${c.id}`)}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="tabular-nums text-sm">
                    {money(c.totals.actual_expense, b.currency)} of {money(c.planned, b.currency)}
                  </span>
                  <UtilisationBar used={c.totals.utilisation_pct} elapsed={c.totals.elapsed_pct} />
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm uppercase tracking-tight">Open commitments</h3>
            <p className="text-xs text-muted-foreground">Orders sent, bills and expenses awaiting approval. They become actual spend once booked.</p>
          </CardHeader>
          <CardContent className="p-0">
            {commitments.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">Nothing is committed against this budget.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {commitments.map((c) => (
                    <tr key={c.id} className="border-t border-border/60">
                      <td className="px-4 py-2">{sourceLabel[c.source_type] ?? c.source_type}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.source_ref || c.source_id.slice(0, 8)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.account_id ? accountName.get(c.account_id) : ''}</td>
                      <td className="px-4 py-2 text-muted-foreground">{new Date(c.commit_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{money(c.amount_kes, 'KES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {pending === 'template' && (
          <ConfirmDialog
            open
            onOpenChange={(o) => !o && setPending(null)}
            title="Save as template"
            description="Saves these lines as shares of the spend and revenue totals, so the template fits any total. A template with the same name is replaced."
            confirmLabel="Save template"
            isPending={saveTemplate.isPending}
            confirmDisabled={!templateName.trim()}
            onConfirm={() =>
              saveTemplate.mutate({ tenantSlug: tenant, budgetID: budgetId, name: templateName.trim() }, { onSuccess: () => setPending(null) })
            }
          >
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={templateName}
              maxLength={80}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
            />
          </ConfirmDialog>
        )}
        {pending && pending !== 'copy' && pending !== 'reject' && pending !== 'template' && (
          <ConfirmDialog
            open
            onOpenChange={(o) => !o && setPending(null)}
            title={confirmCopy[pending].title}
            description={confirmCopy[pending].description}
            destructive={confirmCopy[pending].destructive}
            isPending={action.isPending}
            onConfirm={() => run(pending)}
          />
        )}
        {pending === 'reject' && (
          <ConfirmDialog
            open
            onOpenChange={(o) => !o && setPending(null)}
            title="Return to the author?"
            description="They can change it and submit again."
            confirmLabel="Return"
            isPending={action.isPending}
            confirmDisabled={!reason.trim()}
            onConfirm={() => run('reject')}
          >
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={3}
              placeholder="What needs to change?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </ConfirmDialog>
        )}
        {pending === 'copy' && (
          <ConfirmDialog
            open
            onOpenChange={(o) => !o && setPending(null)}
            title="Copy to a new period"
            description="Creates a draft with the same lines, scaled by the growth you enter."
            confirmLabel="Create draft"
            isPending={copy.isPending}
            confirmDisabled={!copyForm.start_date || !copyForm.end_date || copyForm.end_date < copyForm.start_date}
            onConfirm={runCopy}
          >
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Starts</span>
                <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2" value={copyForm.start_date} onChange={(e) => setCopyForm({ ...copyForm, start_date: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Ends</span>
                <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2" value={copyForm.end_date} onChange={(e) => setCopyForm({ ...copyForm, end_date: e.target.value })} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Growth %</span>
                <input type="number" className="w-full rounded-md border border-input bg-background px-3 py-2" value={copyForm.growth_pct} onChange={(e) => setCopyForm({ ...copyForm, growth_pct: e.target.value })} />
              </label>
              <label className="flex items-end gap-2 pb-2">
                <input type="checkbox" checked={copyForm.from_actuals} onChange={(e) => setCopyForm({ ...copyForm, from_actuals: e.target.checked })} />
                <span>Start from actual spend, not the plan</span>
              </label>
            </div>
          </ConfirmDialog>
        )}
      </div>
    </SubscriptionGate>
  );
}
