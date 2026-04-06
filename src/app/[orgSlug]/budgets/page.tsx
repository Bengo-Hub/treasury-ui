'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import {
  useBudgets,
  useBudget,
  useCreateBudget,
  useApproveBudget,
} from '@/hooks/use-budgets';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { apiClient } from '@/lib/api/client';
import type { Budget, BudgetLine } from '@/lib/api/budgets';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: string;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'secondary'> = {
  draft: 'secondary',
  approved: 'success',
  active: 'default',
  closed: 'outline' as any,
};

export default function BudgetsPage() {
  const { tenantPathId } = useResolvedTenant();
  const { data, isLoading } = useBudgets(tenantPathId);
  const budgets = data?.budgets ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const approveMutation = useApproveBudget();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground mt-1">Plan, track, and manage budgets across accounting periods.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Budget
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">All Budgets</h3>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading budgets...
            </div>
          )}
          {!isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Period</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Fiscal Year</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Total Planned</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {budgets.map((budget) => (
                    <tr
                      key={budget.id}
                      className="hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => setDetailId(budget.id)}
                    >
                      <td className="px-6 py-4 text-xs font-bold">{budget.name}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-xs">{budget.fiscal_year || '---'}</td>
                      <td className="px-6 py-4 text-right text-xs font-bold">
                        {budget.currency} {Number(budget.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusVariant[budget.status] ?? 'secondary'}>{budget.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {budget.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => approveMutation.mutate({ tenantSlug: tenantPathId, budgetID: budget.id })}
                              disabled={approveMutation.isPending}
                              title="Approve"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && budgets.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">No budgets created yet.</div>
          )}
        </CardContent>
      </Card>

      <CreateBudgetDialog open={createOpen} onOpenChange={setCreateOpen} tenantSlug={tenantPathId} />
      {detailId && (
        <BudgetDetailDialog
          open={!!detailId}
          onOpenChange={(o) => !o && setDetailId(null)}
          tenantSlug={tenantPathId}
          budgetID={detailId}
        />
      )}
    </div>
  );
}

// ---- Budget Detail Dialog (with progress bars) ----

function BudgetDetailDialog({
  open,
  onOpenChange,
  tenantSlug,
  budgetID,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  budgetID: string;
}) {
  const { data: budget, isLoading } = useBudget(tenantSlug, budgetID);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={budget?.name ?? 'Budget Details'}
        description={budget ? `${new Date(budget.start_date).toLocaleDateString()} - ${new Date(budget.end_date).toLocaleDateString()}` : ''}
        onClose={() => onOpenChange(false)}
        className="max-w-2xl"
      >
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading...
          </div>
        )}
        {!isLoading && budget && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant={statusVariant[budget.status] ?? 'secondary'}>{budget.status}</Badge>
              <span className="text-muted-foreground">
                Total: {budget.currency} {Number(budget.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {(budget.lines ?? []).length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget Lines</p>
                {budget.lines!.map((line) => {
                  const planned = Number(line.planned_amount);
                  const actual = Number(line.actual_amount);
                  const pct = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;
                  const overBudget = actual > planned;

                  return (
                    <div key={line.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{line.name}</span>
                          <span className="text-xs text-muted-foreground ml-2 capitalize">({line.category})</span>
                        </div>
                        <div className="text-xs tabular-nums">
                          <span className={cn(overBudget && 'text-destructive font-bold')}>
                            {actual.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-muted-foreground"> / {planned.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-accent/30 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            overBudget ? 'bg-destructive' : pct > 80 ? 'bg-yellow-500' : 'bg-primary',
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{pct.toFixed(0)}% used</span>
                        {Number(line.variance) !== 0 && (
                          <span className={cn(Number(line.variance) < 0 ? 'text-destructive' : 'text-green-500')}>
                            Variance: {Number(line.variance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---- Create Budget Dialog ----

interface BudgetLineInput {
  category: string;
  name: string;
  planned_amount: string;
  notes: string;
}

function CreateBudgetDialog({
  open,
  onOpenChange,
  tenantSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}) {
  const createMutation = useCreateBudget();
  const [name, setName] = useState('');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10));
  const [lines, setLines] = useState<BudgetLineInput[]>([
    { category: 'expense', name: '', planned_amount: '', notes: '' },
  ]);

  function updateLine(i: number, field: keyof BudgetLineInput, value: string) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { category: 'expense', name: '', planned_amount: '', notes: '' }]);
  }

  function removeLine(i: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalPlanned = lines.reduce((sum, l) => sum + (parseFloat(l.planned_amount) || 0), 0);

  function handleSubmit() {
    createMutation.mutate(
      {
        tenantSlug,
        data: {
          name,
          fiscal_year: fiscalYear,
          start_date: startDate,
          end_date: endDate,
          lines: lines
            .filter((l) => l.name && l.planned_amount)
            .map((l) => ({
              category: l.category,
              name: l.name,
              planned_amount: parseFloat(l.planned_amount) || 0,
              notes: l.notes || undefined,
            })),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName('');
          setLines([{ category: 'expense', name: '', planned_amount: '', notes: '' }]);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="New Budget"
        description="Create a new budget with planned line items."
        onClose={() => onOpenChange(false)}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Budget Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q1 2026 Operating Budget"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Fiscal Year">
              <input
                type="text"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="2026"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" required>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="End Date" required>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget Lines</p>
              <Button size="sm" variant="ghost" onClick={addLine} className="gap-1">
                <Plus className="h-3 w-3" /> Add Line
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent/5 border-b border-border">
                    <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground">Category</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground">Name</th>
                    <th className="text-right px-3 py-2 text-xs font-bold text-muted-foreground">Planned Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <select
                          value={line.category}
                          onChange={(e) => updateLine(i, 'category', e.target.value)}
                          className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs"
                        >
                          <option value="revenue">Revenue</option>
                          <option value="expense">Expense</option>
                          <option value="capital">Capital</option>
                          <option value="other">Other</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.name}
                          onChange={(e) => updateLine(i, 'name', e.target.value)}
                          placeholder="Line item name"
                          className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.planned_amount}
                          onChange={(e) => updateLine(i, 'planned_amount', e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs text-right"
                        />
                      </td>
                      <td className="px-1 py-2">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          disabled={lines.length <= 1}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-accent/10 font-bold">
                    <td colSpan={2} className="px-3 py-2 text-xs uppercase">Total Planned</td>
                    <td className="px-3 py-2 text-right text-xs">{totalPlanned.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!name || totalPlanned <= 0 || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Budget
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
