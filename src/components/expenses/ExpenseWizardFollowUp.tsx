'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, FileText, Loader2, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { OverBudgetDialog } from '@/components/budgets/over-budget-dialog';
import { MarkExpensePaidModal } from '@/components/expenses/MarkExpensePaidModal';
import { useApproveExpense, useExpense, usePayExpense, useSubmitExpense } from '@/hooks/use-expenses';
import { budgetWarningOf, overBudgetOf, type BudgetCheckResult } from '@/lib/api/budgets';
import { formatCurrency } from '@/lib/utils/currency';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  submitted: { label: 'Waiting for approval', variant: 'warning' },
  approved: { label: 'Approved, not paid', variant: 'default' },
  paid: { label: 'Paid', variant: 'success' },
  reimbursed: { label: 'Reimbursed', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'outline' },
};

interface Props {
  tenant: string;
  orgSlug: string;
  expenseId: string;
  step: 2 | 3;
  onStep: (step: 2 | 3) => void;
  onCreateAnother: () => void;
}

/**
 * Steps 2 and 3 of Create Expenditure, after the draft is saved. Step 2 moves the expense through
 * the real workflow (submit, approve, mark paid), showing only what its current status allows.
 * Step 3 confirms where it ended up and what to do next.
 */
export function ExpenseWizardFollowUp({ tenant, orgSlug, expenseId, step, onStep, onCreateAnother }: Props) {
  const { data: expense, isLoading, refetch } = useExpense(tenant, expenseId);
  const submit = useSubmitExpense(tenant);
  const approve = useApproveExpense(tenant);
  const pay = usePayExpense(tenant);
  const [payOpen, setPayOpen] = useState(false);
  const [overBudget, setOverBudget] = useState<{ kind: 'submit' | 'approve'; result: BudgetCheckResult } | null>(null);

  if (isLoading || !expense) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the expense…
        </CardContent>
      </Card>
    );
  }

  const status = STATUS_LABEL[expense.status] ?? { label: expense.status, variant: 'outline' as const };
  const amount = formatCurrency(Number(expense.total_amount ?? expense.amount ?? 0), expense.currency ?? 'KES');

  const run = async (kind: 'submit' | 'approve', override = false) => {
    try {
      const res = await (kind === 'submit' ? submit : approve).mutateAsync({ id: expense.id, override });
      const warn = budgetWarningOf(res);
      if (warn) toast.warning(`Over budget: ${warn.lines.filter((l) => l.action !== 'ok').map((l) => l.line_name).join(', ')}`);
      setOverBudget(null);
      const { data: fresh } = await refetch();
      toast.success(
        kind === 'approve' || fresh?.status === 'approved'
          ? `Expense ${expense.expense_number} approved`
          : `Expense ${expense.expense_number} sent for approval`,
      );
    } catch (err: any) {
      const blocked = overBudgetOf(err);
      if (blocked) {
        setOverBudget({ kind, result: blocked });
        return;
      }
      toast.error(err?.response?.data?.error ?? 'That did not work. Please try again.');
    }
  };

  const markPaid = async (paidFromAccountId: string, paidAt?: string) => {
    try {
      await pay.mutateAsync({ id: expense.id, paidFromAccountId: paidFromAccountId || undefined, paidAt });
      setPayOpen(false);
      await refetch();
      toast.success(`Expense ${expense.expense_number} marked paid`);
      onStep(3);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Could not mark the expense paid.');
    }
  };

  const summary = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-accent/10 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          Expense {expense.expense_number}
          {expense.metadata?.vendor_name ? `, ${String(expense.metadata.vendor_name)}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{expense.description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold tabular-nums">{amount}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
    </div>
  );

  if (step === 3) {
    const paid = expense.status === 'paid' || expense.status === 'reimbursed';
    return (
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {paid ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </span>
            <div>
              <h2 className="text-lg font-bold">{paid ? 'Expense recorded and paid' : 'Expense recorded'}</h2>
              <p className="text-sm text-muted-foreground">
                {paid
                  ? 'It is in the books and the payment is recorded.'
                  : expense.status === 'approved'
                    ? 'It is approved. Mark it paid from the expenses list when the money goes out.'
                    : expense.status === 'submitted'
                      ? 'It is waiting for an approver. Once approved it can be marked paid.'
                      : 'It is saved as a draft. Send it for approval when it is ready.'}
              </p>
            </div>
          </div>
          {summary}
          <div className="flex flex-wrap gap-2">
            <Link href={`/${orgSlug}/expenses/${expense.id}`}>
              <Button variant="primary">
                <FileText className="mr-2 h-4 w-4" /> View expense
              </Button>
            </Link>
            <Button variant="outline" onClick={onCreateAnother}>
              <Plus className="mr-2 h-4 w-4" /> Add another expense
            </Button>
            <Link href={`/${orgSlug}/expenses`}>
              <Button variant="ghost">Back to expenses</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const busy = submit.isPending || approve.isPending || pay.isPending;
  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div>
          <h2 className="text-lg font-bold">Approve and pay</h2>
          <p className="text-sm text-muted-foreground">
            The expense is saved. Move it on now, or leave it and come back from the expenses list.
          </p>
        </div>
        {summary}

        <ol className="space-y-3">
          <WorkflowRow
            n={1}
            title="Send for approval"
            done={expense.status !== 'draft'}
            hint="Expenses under your approval threshold are approved straight away."
            action={
              expense.status === 'draft' && (
                <Button onClick={() => run('submit')} disabled={busy}>
                  {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send for approval
                </Button>
              )
            }
          />
          <WorkflowRow
            n={2}
            title="Approve"
            done={['approved', 'paid', 'reimbursed'].includes(expense.status)}
            hint="Only people allowed to approve expenses can do this."
            action={
              expense.status === 'submitted' && (
                <Button variant="outline" onClick={() => run('approve')} disabled={busy}>
                  {approve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve
                </Button>
              )
            }
          />
          <WorkflowRow
            n={3}
            title="Mark paid"
            done={expense.status === 'paid' || expense.status === 'reimbursed'}
            hint="Record the account the money left and when."
            action={
              expense.status === 'approved' && (
                <Button onClick={() => setPayOpen(true)} disabled={busy}>
                  <Wallet className="mr-2 h-4 w-4" /> Mark paid
                </Button>
              )
            }
          />
        </ol>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => onStep(3)} disabled={busy}>
            {expense.status === 'paid' ? 'Continue' : 'Pay later'}
          </Button>
        </div>
      </CardContent>

      {payOpen && (
        <MarkExpensePaidModal tenant={tenant} expense={expense} onClose={() => setPayOpen(false)} onConfirm={markPaid} pending={pay.isPending} />
      )}
      <OverBudgetDialog
        result={overBudget?.result ?? null}
        what={`Expense ${expense.expense_number}`}
        isPending={submit.isPending || approve.isPending}
        onOverride={() => overBudget && run(overBudget.kind, true)}
        onClose={() => setOverBudget(null)}
      />
    </Card>
  );
}

function WorkflowRow({ n, title, hint, done, action }: { n: number; title: string; hint: string; done: boolean; action: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
      <span
        className={
          done
            ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'
            : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border text-sm font-bold text-muted-foreground'
        }
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {action || null}
    </li>
  );
}
