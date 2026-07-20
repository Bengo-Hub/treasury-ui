'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { type RowAction } from '@/components/ui/action-menu';
import { FormField } from '@/components/ui/form-field';
import {
  DataTable,
  compareValues,
  type FilterMap,
  type SortState,
} from '@bengo-hub/shared-ui-lib/data-table';
import { EXPENSE_ACCESSORS, buildExpenseColumns } from './expense-columns';
import { ExpensePaymentModal } from '@/components/expenses/ExpensePaymentModal';
import { MarkExpensePaidModal } from '@/components/expenses/MarkExpensePaidModal';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useExpenses,
  useSubmitExpense,
  useApproveExpense,
  useRejectExpense,
  useReimburseExpense,
  usePayExpense,
  useReconcileExpenseJournals,
  useDeleteExpense,
} from '@/hooks/use-expenses';
import { useRouter } from 'next/navigation';
import { useCostCenters } from '@/hooks/use-cost-centers';
import type { Expense } from '@/lib/api/expenses';
import { cn } from '@/lib/utils';
import {
  Check,
  Eye,
  Filter,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 90);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function ExpensesPage() {
  const router = useRouter();
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex) so its data loads by default;
  // a tenant drill-down via the header filter overrides this.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // DataTable header state (controlled so sorting/funnel-filtering run over the WHOLE
  // loaded list before client pagination, not just the visible page).
  const [sort, setSort] = useState<SortState | null>(null);
  const [funnel, setFunnel] = useState<FilterMap>({});
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Row-action dialog state (status-aware confirmations).
  const [confirmAction, setConfirmAction] = useState<{ kind: 'submit' | 'approve' | 'delete'; exp: Expense } | null>(null);
  // Primary "Record Payment" flow: open the embedded checkout referencing the expense,
  // then link the settled intent via reimburse. `reimburseExp`/`paymentIntentId` back the
  // secondary power-user "link an existing intent ID" fallback.
  const [payExp, setPayExp] = useState<Expense | null>(null);
  const [markPaidExp, setMarkPaidExp] = useState<Expense | null>(null);
  const [reimburseExp, setReimburseExp] = useState<Expense | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const dateRange = useMemo(() => defaultDateRange(), []);

  const queryParams = useMemo(() => ({
    from: dateRange.from,
    to: dateRange.to,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    // Backend ListExpenses supports server-side cost_center_id filtering (expenses.go).
    ...(costCenterFilter !== 'all' ? { cost_center_id: costCenterFilter } : {}),
  }), [dateRange, statusFilter, costCenterFilter]);

  const { data, isLoading, error } = useExpenses(effectiveTenant, queryParams, !!effectiveTenant);
  // active_only: hide archived centers from the selector/filter.
  const { data: costCenterData } = useCostCenters(effectiveTenant, { active_only: true });

  const list = data?.expenses ?? [];
  const costCenters = costCenterData?.cost_centers ?? [];

  const filtered = useMemo(() => {
    let out = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      out = out.filter(
        (exp: Expense) =>
          exp.expense_number?.toLowerCase().includes(q) ||
          exp.description?.toLowerCase().includes(q) ||
          exp.category_name?.toLowerCase().includes(q)
      );
    }
    // Funnel filters (controlled: applied over the whole list, before pagination).
    for (const [key, st] of Object.entries(funnel)) {
      const acc = EXPENSE_ACCESSORS[key];
      if (!acc || !st) continue;
      const values = st.values ?? [];
      const query = st.query?.trim().toLowerCase();
      if (values.length === 0 && !query) continue;
      out = out.filter((exp) => {
        const text = String(acc(exp) ?? '');
        if (values.length > 0 && !values.includes(text)) return false;
        if (query && !text.toLowerCase().includes(query)) return false;
        return true;
      });
    }
    if (sort) {
      const acc = EXPENSE_ACCESSORS[sort.key];
      if (acc) {
        const dir = sort.dir === 'asc' ? 1 : -1;
        out = [...out].sort((a, b) => dir * compareValues(acc(a), acc(b)));
      }
    }
    return out;
  }, [list, searchQuery, funnel, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useMemo(() => { setPage(1); }, [searchQuery, statusFilter, costCenterFilter, funnel, pageSize]);

  const statusOptions = ['all', 'draft', 'submitted', 'approved', 'rejected', 'paid'];

  // Mutations
  const submitMutation = useSubmitExpense(effectiveTenant);
  const approveMutation = useApproveExpense(effectiveTenant);
  const rejectMutation = useRejectExpense(effectiveTenant);
  const reimburseMutation = useReimburseExpense(effectiveTenant);
  const payMutation = usePayExpense(effectiveTenant);
  const reconcileMutation = useReconcileExpenseJournals(effectiveTenant);

  const handleReconcile = async () => {
    try {
      const r = await reconcileMutation.mutateAsync();
      toast.success(`Reconciled: ${r.accruals_posted} accrual + ${r.settlements_posted} settlement journal(s) posted${r.skipped_no_account ? `, ${r.skipped_no_account} skipped (no account)` : ''}.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to reconcile expense journals.');
    }
  };
  const deleteMutation = useDeleteExpense(effectiveTenant);

  const goToNewExpenditure = () => router.push(`/${orgSlug}/expenses/new`);

  const handleReject = async () => {
    if (!rejectOpen) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectOpen, reason: rejectReason });
      toast.success('Expense rejected');
      setRejectOpen(null);
      setRejectReason('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to reject expense.');
    }
  };

  // Run the confirmed submit/approve/delete action with toast + 409 handling.
  const runConfirm = async () => {
    if (!confirmAction) return;
    const { kind, exp } = confirmAction;
    try {
      if (kind === 'submit') {
        await submitMutation.mutateAsync(exp.id);
        toast.success(`Expense ${exp.expense_number} submitted`);
      } else if (kind === 'approve') {
        await approveMutation.mutateAsync(exp.id);
        toast.success(`Expense ${exp.expense_number} approved`);
      } else if (kind === 'delete') {
        await deleteMutation.mutateAsync(exp.id);
        toast.success(`Expense ${exp.expense_number} deleted`);
      }
      setConfirmAction(null);
    } catch (err: any) {
      // 409 = the expense is no longer a draft / already posted to the GL.
      if (err?.response?.status === 409) {
        toast.error(
          kind === 'delete'
            ? 'This expense can no longer be deleted — only drafts (not yet posted to the ledger) are deletable.'
            : 'This action is no longer valid for the expense’s current status.',
        );
      } else {
        toast.error(err?.response?.data?.error ?? 'Action failed. Please try again.');
      }
      setConfirmAction(null);
    }
  };

  const handleReimburse = async () => {
    if (!reimburseExp || !paymentIntentId.trim()) return;
    try {
      await reimburseMutation.mutateAsync({ id: reimburseExp.id, paymentIntentId: paymentIntentId.trim() });
      toast.success(`Expense ${reimburseExp.expense_number} marked reimbursed`);
      setReimburseExp(null);
      setPaymentIntentId('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to mark reimbursed.');
    }
  };

  // Primary: settle a direct business expense from a chosen cash/bank account. The backend posts
  // DR Accounts Payable / CR that account and marks it paid.
  const handleMarkPaid = async (paidFromAccountId: string) => {
    if (!markPaidExp) return;
    try {
      await payMutation.mutateAsync({ id: markPaidExp.id, paidFromAccountId: paidFromAccountId || undefined });
      toast.success(`Expense ${markPaidExp.expense_number} marked paid`);
      setMarkPaidExp(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to mark the expense paid.');
    }
  };

  // Gateway path: once the embedded checkout confirms, settle THIS expense with the returned
  // intent id — payExpense posts the settlement GL (DR AP / CR cash) and persists payment_intent_id.
  // The backend also records the paid taxable expense as a KRA eTIMS purchase for input VAT.
  const handlePaymentConfirmed = async (intentId: string) => {
    if (!payExp) return;
    try {
      await payMutation.mutateAsync({ id: payExp.id, paymentIntentId: intentId });
      toast.success(`Expense ${payExp.expense_number} marked paid`);
      setPayExp(null);
    } catch (err: any) {
      // Payment succeeded but the settlement link failed — surface the real error plus the intent
      // ID so it can be recovered via the manual "Link payment intent" fallback.
      toast.error(
        (err?.response?.data?.error ?? 'Payment succeeded but linking it to the expense failed.') +
          ` Intent ID: ${intentId}`,
      );
    }
  };

  // Status-aware row actions: View (always); Edit + Delete + Submit (draft);
  // Approve + Reject (submitted); Reimburse (approved). Each is gated by status
  // so only valid transitions appear.
  const rowActions: RowAction<Expense>[] = [
    {
      label: 'View',
      icon: <Eye className="h-3.5 w-3.5" />,
      onClick: (exp) => router.push(`/${orgSlug}/expenses/${exp.id}`),
    },
    {
      label: 'Edit',
      icon: <Pencil className="h-3.5 w-3.5" />,
      visible: (exp) => exp.status === 'draft',
      onClick: (exp) => router.push(`/${orgSlug}/expenses/${exp.id}/edit`),
    },
    {
      label: 'Submit',
      icon: <Send className="h-3.5 w-3.5" />,
      visible: (exp) => exp.status === 'draft',
      onClick: (exp) => setConfirmAction({ kind: 'submit', exp }),
    },
    {
      label: 'Approve',
      icon: <Check className="h-3.5 w-3.5" />,
      visible: (exp) => exp.status === 'submitted',
      onClick: (exp) => setConfirmAction({ kind: 'approve', exp }),
    },
    {
      label: 'Reject',
      icon: <X className="h-3.5 w-3.5" />,
      destructive: true,
      visible: (exp) => exp.status === 'submitted',
      onClick: (exp) => { setRejectReason(''); setRejectOpen(exp.id); },
    },
    {
      label: 'Mark Paid',
      icon: <Wallet className="h-3.5 w-3.5" />,
      visible: (exp) => exp.status === 'approved',
      onClick: (exp) => setMarkPaidExp(exp),
    },
    {
      label: 'Pay via gateway',
      icon: <Wallet className="h-3.5 w-3.5" />,
      visible: (exp) => exp.status === 'approved',
      onClick: (exp) => setPayExp(exp),
    },
    {
      label: 'Link payment intent (manual)',
      icon: <Link2 className="h-3.5 w-3.5" />,
      visible: (exp) => exp.status === 'approved',
      onClick: (exp) => { setPaymentIntentId(''); setReimburseExp(exp); },
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      destructive: true,
      visible: (exp) => exp.status === 'draft',
      onClick: (exp) => setConfirmAction({ kind: 'delete', exp }),
    },
  ];

  // Funnel checklists derived from the WHOLE loaded list (controlled-filter mode would
  // otherwise only see the current page slice).
  const categoryOptions = [...new Set(list.map((e: Expense) => e.category_name || ''))]
    .sort()
    .map((v) => ({ value: v, label: v || '(none)' }));
  const statusFunnelOptions = [...new Set(list.map((e: Expense) => (e.status === 'reimbursed' ? 'paid' : e.status)))]
    .sort()
    .map((v) => ({ value: v }));

  const columns = buildExpenseColumns({ categoryOptions, statusOptions: statusFunnelOptions, rowActions });
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track, submit, and manage expense claims.</p>
        </div>
        <div className="flex items-center gap-2">
          {isPlatformOwner && (
            <Button variant="outline" className="gap-2" onClick={handleReconcile} disabled={reconcileMutation.isPending}>
              {reconcileMutation.isPending ? 'Reconciling…' : 'Reconcile journals'}
            </Button>
          )}
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={goToNewExpenditure}>
            <Plus className="h-4 w-4" /> New Expenditure
          </Button>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Showing your own organization&apos;s expenses. Drill into a tenant via the filter above to view theirs.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load expenses. Check your connection and try again.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by number, description, or category..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {costCenters.length > 0 && (
              <select
                value={costCenterFilter}
                onChange={(e) => setCostCenterFilter(e.target.value)}
                className="bg-accent/30 border border-border rounded-lg py-1.5 px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="all">All cost centers</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code ? `${cc.code} - ${cc.name}` : cc.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">Status:</span>
            </div>
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable<Expense>
            columns={columns}
            rows={paginatedItems}
            rowKey={(exp) => exp.id}
            loading={isLoading}
            error={!!error}
            emptyText="No expenses match your filters."
            sort={sort}
            onSortChange={setSort}
            filters={funnel}
            onFiltersChange={setFunnel}
            storageKey="expenses-table"
            showExportCsv
            exportFileName="expenses"
            onExportAll={() => Promise.resolve(filtered)}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={filtered.length}
          />
        </CardContent>
      </Card>

      {/* Submit / Approve / Delete confirmation */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(o) => { if (!o) setConfirmAction(null); }}
        title={
          confirmAction?.kind === 'delete'
            ? 'Delete expense'
            : confirmAction?.kind === 'approve'
              ? 'Approve expense'
              : 'Submit expense'
        }
        description={
          confirmAction?.kind === 'delete'
            ? `Delete ${confirmAction?.exp.expense_number}? This permanently removes the draft and cannot be undone.`
            : confirmAction?.kind === 'approve'
              ? `Approve ${confirmAction?.exp.expense_number}? This posts the expense to the general ledger.`
              : `Submit ${confirmAction?.exp.expense_number} for approval?`
        }
        confirmLabel={
          confirmAction?.kind === 'delete' ? 'Delete' : confirmAction?.kind === 'approve' ? 'Approve' : 'Submit'
        }
        destructive={confirmAction?.kind === 'delete'}
        isPending={submitMutation.isPending || approveMutation.isPending || deleteMutation.isPending}
        onConfirm={runConfirm}
      />

      {/* Primary: Mark Paid — settle from a cash/bank account (DR AP / CR cash). No gateway. */}
      {markPaidExp && effectiveTenant && (
        <MarkExpensePaidModal
          tenant={effectiveTenant}
          expense={markPaidExp}
          pending={payMutation.isPending}
          onConfirm={handleMarkPaid}
          onClose={() => setMarkPaidExp(null)}
        />
      )}

      {/* Secondary: Pay via gateway — pay through the embedded M-Pesa/Paystack checkout, then settle. */}
      {payExp && effectiveTenant && (
        <ExpensePaymentModal
          tenant={effectiveTenant}
          expense={payExp}
          linking={payMutation.isPending}
          onConfirmed={handlePaymentConfirmed}
          onClose={() => setPayExp(null)}
        />
      )}

      {/* Secondary (power users): link an already-created payment intent ID (approved → reimbursed). */}
      <ConfirmDialog
        open={!!reimburseExp}
        onOpenChange={(o) => { if (!o) { setReimburseExp(null); setPaymentIntentId(''); } }}
        title="Link payment intent"
        description={`Link an existing payment intent to ${reimburseExp?.expense_number ?? ''}. Most users should use “Mark Paid” instead.`}
        confirmLabel="Link & mark reimbursed"
        isPending={reimburseMutation.isPending}
        confirmDisabled={!paymentIntentId.trim()}
        onConfirm={handleReimburse}
      >
        <FormField label="Payment Intent ID" required>
          <input
            className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
            placeholder="UUID of the reimbursement payment intent"
            value={paymentIntentId}
            onChange={(e) => setPaymentIntentId(e.target.value)}
          />
        </FormField>
      </ConfirmDialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectOpen} onOpenChange={() => setRejectOpen(null)}>
        <DialogContent title="Reject Expense" description="Provide a reason for rejecting this expense." onClose={() => setRejectOpen(null)}>
          <div className="space-y-4">
            <FormField label="Reason">
              <textarea
                className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary min-h-[80px]"
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
