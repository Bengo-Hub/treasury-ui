'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Pagination } from '@/components/ui/pagination';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useExpenses,
  useSubmitExpense,
  useApproveExpense,
  useRejectExpense,
} from '@/hooks/use-expenses';
import { useRouter } from 'next/navigation';
import { useCostCenters } from '@/hooks/use-cost-centers';
import type { Expense } from '@/lib/api/expenses';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  Check,
  Filter,
  Loader2,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  submitted: 'default',
  approved: 'success',
  rejected: 'error',
  reimbursed: 'success',
  cancelled: 'outline',
};

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
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
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
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (exp: Expense) =>
        exp.expense_number?.toLowerCase().includes(q) ||
        exp.description?.toLowerCase().includes(q) ||
        exp.category_name?.toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useMemo(() => { setPage(1); }, [searchQuery, statusFilter, costCenterFilter]);

  const statusOptions = ['all', 'draft', 'submitted', 'approved', 'rejected', 'reimbursed'];

  // Mutations
  const submitMutation = useSubmitExpense(effectiveTenant);
  const approveMutation = useApproveExpense(effectiveTenant);
  const rejectMutation = useRejectExpense(effectiveTenant);

  const goToNewExpenditure = () => router.push(`/${orgSlug}/expenses/new`);

  const handleReject = async () => {
    if (!rejectOpen) return;
    await rejectMutation.mutateAsync({ id: rejectOpen, reason: rejectReason });
    setRejectOpen(null);
    setRejectReason('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track, submit, and manage expense claims.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={goToNewExpenditure}>
          <Plus className="h-4 w-4" /> New Expenditure
        </Button>
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading expenses...
              </div>
            )}
            {!isLoading && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Expense #</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Description</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.map((exp: Expense) => (
                    <tr key={exp.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{exp.expense_number}</td>
                      <td className="px-6 py-4 text-xs">{exp.category_name || '---'}</td>
                      <td className="px-6 py-4 text-xs max-w-[200px] truncate">{exp.description}</td>
                      <td className="px-6 py-4 text-right font-bold text-xs tabular-nums">{formatCurrency(Number(exp.total_amount), exp.currency)}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusVariant[exp.status] ?? 'outline'}>
                          {exp.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(exp.expense_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {exp.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => submitMutation.mutate(exp.id)}
                              disabled={submitMutation.isPending}
                            >
                              <Send className="h-3 w-3" /> Submit
                            </Button>
                          )}
                          {exp.status === 'submitted' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs text-green-600"
                                onClick={() => approveMutation.mutate(exp.id)}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-3 w-3" /> Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs text-red-500"
                                onClick={() => setRejectOpen(exp.id)}
                              >
                                <X className="h-3 w-3" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No expenses match your filters.</div>
            )}
          </div>
          {!isLoading && filtered.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

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
