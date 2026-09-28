'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, History, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Combobox } from '@/components/ui/combobox';
import { CostCenterCombobox } from '@/components/ui/cost-center-combobox';
import { FormField } from '@/components/ui/form-field';
import { ProjectCombobox } from '@/components/ui/project-combobox';
import { useAccounts } from '@/hooks/use-accounts';
import { useSaveBudget } from '@/hooks/use-budgets';
import {
  getAccountHistory,
  num,
  type Budget,
  type BudgetControl,
  type BudgetInput,
  type BudgetType,
  type LineCategory,
} from '@/lib/api/budgets';
import { formatCurrency } from '@/lib/utils/currency';

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

interface LineState {
  key: string;
  category: LineCategory;
  name: string;
  account_id: string;
  cost_center_id: string;
  planned: string;
  phased: boolean;
  periods: Record<string, string>;
}

/** Months (YYYY-MM) a window touches, in order. */
export function monthsBetween(start: string, end: string): string[] {
  if (!start || !end || end < start) return [];
  const out: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? ((m = 1), (y += 1)) : (m += 1)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    if (out.length > 120) break;
  }
  return out;
}

/** Splits an amount evenly over months, putting the rounding remainder on the last month. */
function spreadEvenly(total: number, months: string[]): Record<string, string> {
  if (!months.length) return {};
  const each = Math.floor((total / months.length) * 100) / 100;
  const out: Record<string, string> = {};
  months.forEach((m, i) => {
    out[m] = (i === months.length - 1 ? total - each * (months.length - 1) : each).toFixed(2);
  });
  return out;
}

/** Splits total over months in proportion to last year's amounts; even when last year has none. */
export function spreadLikeHistory(total: number, months: string[], history: Record<string, number>): Record<string, string> {
  const weights = months.map((m) => Math.max(history[m] ?? 0, 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return spreadEvenly(total, months);
  const out: Record<string, string> = {};
  let used = 0;
  months.forEach((m, i) => {
    const v = i === months.length - 1 ? total - used : Math.round((total * weights[i]) / sum * 100) / 100;
    used += v;
    out[m] = v.toFixed(2);
  });
  return out;
}

/** The same calendar month one year earlier (YYYY-MM). */
const yearBefore = (ym: string) => `${Number(ym.slice(0, 4)) - 1}${ym.slice(4)}`;

let seq = 0;
const newKey = () => `l${Date.now()}-${seq++}`;

function blankLine(category: LineCategory = 'expense'): LineState {
  return { key: newKey(), category, name: '', account_id: '', cost_center_id: '', planned: '', phased: false, periods: {} };
}

function fromBudget(b: Budget): LineState[] {
  return (b.lines ?? []).map((l) => {
    const periods = Object.fromEntries(Object.entries(l.period_amounts ?? {}).map(([k, v]) => [k, String(num(v))]));
    return {
      key: newKey(),
      category: l.category,
      name: l.name,
      account_id: l.account_id ?? '',
      cost_center_id: l.cost_center_id ?? '',
      planned: String(num(l.planned_amount)),
      phased: Object.keys(periods).length > 0,
      periods,
    };
  });
}

const thisYear = new Date().getFullYear();

export function BudgetBuilder({
  tenant,
  orgSlug,
  existing,
  preset,
}: {
  tenant: string;
  orgSlug: string;
  existing?: Budget;
  preset?: { budget_type?: BudgetType; project_id?: string };
}) {
  const router = useRouter();
  const save = useSaveBudget();
  const { data: accountsData } = useAccounts(tenant);

  const [name, setName] = useState(existing?.name ?? '');
  const [budgetType, setBudgetType] = useState<BudgetType>(existing?.budget_type ?? preset?.budget_type ?? 'operating');
  const [fiscalYear, setFiscalYear] = useState(existing?.fiscal_year ?? String(thisYear));
  const [start, setStart] = useState(existing?.start_date?.slice(0, 10) ?? `${thisYear}-01-01`);
  const [end, setEnd] = useState(existing?.end_date?.slice(0, 10) ?? `${thisYear}-12-31`);
  const [projectId, setProjectId] = useState(existing?.project_id ?? preset?.project_id ?? '');
  const projectLocked = !!(existing?.project_id || preset?.project_id);
  const [control, setControl] = useState<BudgetControl>(
    existing?.control ?? { on_actual: 'warn', on_commitment: 'warn', basis: 'annual' },
  );
  const [thresholds, setThresholds] = useState((existing?.alert_thresholds ?? [80, 100]).join(', '));
  const [lines, setLines] = useState<LineState[]>(existing ? fromBudget(existing) : [blankLine()]);
  const [formError, setFormError] = useState('');
  const [historyBusy, setHistoryBusy] = useState<string | null>(null);

  const months = useMemo(() => monthsBetween(start.slice(0, 7), end.slice(0, 7)), [start, end]);

  const accountOptions = (category: LineCategory) =>
    (accountsData?.accounts ?? [])
      .filter((a) => (category === 'revenue' ? a.account_type === 'revenue' : a.account_type === 'expense' || a.account_type === 'asset'))
      .map((a) => ({ value: a.id, label: `${a.account_code} ${a.account_name}` }));

  const update = (key: string, patch: Partial<LineState>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const lineTotal = (l: LineState) =>
    l.phased ? Object.values(l.periods).reduce((s, v) => s + (Number(v) || 0), 0) : Number(l.planned) || 0;
  const totalExpense = lines.filter((l) => l.category !== 'revenue').reduce((s, l) => s + lineTotal(l), 0);
  const totalRevenue = lines.filter((l) => l.category === 'revenue').reduce((s, l) => s + lineTotal(l), 0);

  function togglePhasing(l: LineState) {
    if (l.phased) {
      update(l.key, { phased: false, planned: String(lineTotal(l)), periods: {} });
    } else {
      update(l.key, { phased: true, periods: spreadEvenly(Number(l.planned) || 0, months) });
    }
  }

  /** Phases a line by the account's booked profile over the same months last year. */
  async function spreadLikeLastYear(l: LineState) {
    if (!l.account_id || !months.length) return;
    setHistoryBusy(l.key);
    try {
      const hist = await getAccountHistory(tenant, l.account_id, yearBefore(months[0]), yearBefore(months[months.length - 1]));
      const byMonth: Record<string, number> = {};
      hist.forEach((h) => {
        byMonth[`${Number(h.month.slice(0, 4)) + 1}${h.month.slice(4)}`] = h.amount;
      });
      const total = lineTotal(l);
      update(l.key, { phased: true, periods: spreadLikeHistory(total, months, byMonth) });
      if (!hist.some((h) => h.amount > 0)) setFormError(`Nothing was booked on that account last year, so "${l.name || 'the line'}" was spread evenly.`);
    } catch {
      setFormError('Could not read last year for that account. Try again.');
    } finally {
      setHistoryBusy(null);
    }
  }

  function submit() {
    setFormError('');
    if (!name.trim()) return setFormError('Give the budget a name.');
    if (!start || !end || end < start) return setFormError('The end date must be on or after the start date.');
    if (budgetType === 'project' && !projectId) return setFormError('Choose the project this budget is for.');
    const usable = lines.filter((l) => l.name.trim());
    if (!usable.length) return setFormError('Add at least one line.');
    const noAccount = usable.find((l) => !l.account_id);
    if (noAccount) return setFormError(`Choose an account for "${noAccount.name}", otherwise no spending can be counted against it.`);
    const ths = thresholds
      .split(',')
      .map((t) => Number(t.trim()))
      .filter((t) => t > 0);
    const body: BudgetInput = {
      name: name.trim(),
      fiscal_year: fiscalYear,
      budget_type: budgetType,
      period_type: 'monthly',
      start_date: start,
      end_date: end,
      currency: existing?.currency ?? 'KES',
      project_id: budgetType === 'project' ? projectId || undefined : undefined,
      parent_budget_id: existing?.parent_budget_id,
      control,
      alert_thresholds: ths.length ? ths : [80, 100],
      lines: usable.map((l) => ({
        category: l.category,
        name: l.name.trim(),
        account_id: l.account_id,
        cost_center_id: l.cost_center_id || undefined,
        planned_amount: lineTotal(l),
        period_amounts: l.phased
          ? Object.fromEntries(
              Object.entries(l.periods)
                .filter(([m]) => months.includes(m))
                .map(([m, v]) => [m, Number(v) || 0]),
            )
          : undefined,
      })),
    };
    save.mutate(
      { tenantSlug: tenant, id: existing?.id, data: body },
      { onSuccess: (b) => router.push(`/${orgSlug}/budgets/${b.id}`) },
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-4">
          <h3 className="font-bold text-sm uppercase tracking-tight">Budget</h3>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FormField label="Name" required>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Operating budget 2027" />
          </FormField>
          <FormField label="Type">
            <select
              className={inputClass}
              value={budgetType}
              disabled={projectLocked}
              onChange={(e) => setBudgetType(e.target.value as BudgetType)}
            >
              <option value="operating">Operating (profit and loss)</option>
              <option value="capex">Capital spending</option>
              <option value="revenue">Revenue targets</option>
              <option value="cash">Cash</option>
              <option value="forecast">Forecast scenario</option>
              <option value="project">Project</option>
            </select>
          </FormField>
          {budgetType === 'project' && (
            <FormField label="Project" required description="Spend tagged to this project counts against the budget.">
              <ProjectCombobox tenant={tenant} value={projectId} onChange={setProjectId} disabled={projectLocked} placeholder="Choose project" />
            </FormField>
          )}
          <FormField label="Fiscal year">
            <input className={inputClass} value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} />
          </FormField>
          <FormField label="Starts" required>
            <input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
          </FormField>
          <FormField label="Ends" required>
            <input type="date" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
          </FormField>
          <FormField label="Alert at (% used)" description="Comma-separated, e.g. 80, 100">
            <input className={inputClass} value={thresholds} onChange={(e) => setThresholds(e.target.value)} />
          </FormField>
          <FormField label="When spending would exceed the budget" description="Applies to approved expenses and bills.">
            <select className={inputClass} value={control.on_actual} onChange={(e) => setControl({ ...control, on_actual: e.target.value as BudgetControl['on_actual'] })}>
              <option value="warn">Warn and allow</option>
              <option value="stop">Stop (needs a budget approver to override)</option>
              <option value="ignore">Do nothing</option>
            </select>
          </FormField>
          <FormField label="When an order or pending bill would exceed it" description="Purchase orders, submitted expenses and claims.">
            <select
              className={inputClass}
              value={control.on_commitment}
              onChange={(e) => setControl({ ...control, on_commitment: e.target.value as BudgetControl['on_commitment'] })}
            >
              <option value="warn">Warn and allow</option>
              <option value="stop">Stop (needs a budget approver to override)</option>
              <option value="ignore">Do nothing</option>
            </select>
          </FormField>
          <FormField label="Compare spending with" description="Year-to-date stops early overspending in a phased budget.">
            <select className={inputClass} value={control.basis} onChange={(e) => setControl({ ...control, basis: e.target.value as BudgetControl['basis'] })}>
              <option value="annual">The whole budget</option>
              <option value="ytd_cumulative">The plan up to the current month</option>
            </select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <h3 className="font-bold text-sm uppercase tracking-tight">Lines</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, blankLine('expense')])} className="gap-1">
              <Plus className="h-4 w-4" /> Spend line
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, blankLine('revenue')])} className="gap-1">
              <Plus className="h-4 w-4" /> Revenue line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((l) => (
            <div key={l.key} className="rounded-lg border border-border p-3 space-y-3">
              <div className="grid gap-3 md:grid-cols-12 items-end">
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Kind</label>
                  <select className={inputClass} value={l.category} onChange={(e) => update(l.key, { category: e.target.value as LineCategory, account_id: '' })}>
                    <option value="expense">Spend</option>
                    <option value="capex">Capital</option>
                    <option value="revenue">Revenue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-muted-foreground">Line</label>
                  <input className={inputClass} value={l.name} onChange={(e) => update(l.key, { name: e.target.value })} placeholder="e.g. Marketing" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-muted-foreground">Account</label>
                  <Combobox
                    options={accountOptions(l.category)}
                    value={l.account_id}
                    onChange={(v) => update(l.key, { account_id: v })}
                    placeholder="Choose account"
                    searchPlaceholder="Search accounts"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Cost centre</label>
                  <CostCenterCombobox tenant={tenant} value={l.cost_center_id} onChange={(v) => update(l.key, { cost_center_id: v })} placeholder="Any" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Amount</label>
                  {l.phased ? (
                    <p className="py-2 text-sm font-semibold tabular-nums">{formatCurrency(lineTotal(l), 'KES')}</p>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={l.planned}
                      onChange={(e) => update(l.key, { planned: e.target.value })}
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-4">
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary" onClick={() => togglePhasing(l)}>
                    <CalendarRange className="h-3.5 w-3.5" />
                    {l.phased ? 'Use one amount for the whole period' : 'Plan month by month'}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary disabled:opacity-50"
                    disabled={!l.account_id || historyBusy === l.key || lineTotal(l) <= 0}
                    title={!l.account_id ? 'Choose an account first' : 'Spread the amount by how this account was spent last year'}
                    onClick={() => spreadLikeLastYear(l)}
                  >
                    {historyBusy === l.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
                    Spread like last year
                  </button>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-destructive"
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
              {l.phased && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {months.map((m) => (
                    <div key={m}>
                      <label className="text-[11px] text-muted-foreground">{m}</label>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={l.periods[m] ?? ''}
                        onChange={(e) => update(l.key, { periods: { ...l.periods, [m]: e.target.value } })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap justify-end gap-6 border-t border-border pt-3 text-sm">
            <span>
              Planned spend: <strong className="tabular-nums">{formatCurrency(totalExpense, 'KES')}</strong>
            </span>
            <span>
              Planned revenue: <strong className="tabular-nums">{formatCurrency(totalRevenue, 'KES')}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {formError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{formError}</div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={save.isPending} className="gap-2">
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save draft
        </Button>
      </div>
    </div>
  );
}
