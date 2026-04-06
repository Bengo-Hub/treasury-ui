'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Pagination } from '@/components/ui/pagination';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useExpenses,
  useExpenseCategories,
  useCreateExpense,
  useSubmitExpense,
  useApproveExpense,
  useRejectExpense,
} from '@/hooks/use-expenses';
import type { Expense } from '@/lib/api/expenses';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Check,
  Filter,
  Loader2,
  Plus,
  Receipt,
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
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const dateRange = useMemo(() => defaultDateRange(), []);

  const queryParams = useMemo(() => ({
    from: dateRange.from,
    to: dateRange.to,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(isPlatformOwner && tenantQueryParam ? { tenantId: tenantQueryParam } : {}),
  }), [dateRange, statusFilter, isPlatformOwner, tenantQueryParam]);

  const { data, isLoading, error } = useExpenses(tenantPathId, queryParams, !!tenantPathId);
  const { data: catData } = useExpenseCategories(tenantPathId, !!tenantPathId);

  const list = data?.expenses ?? [];
  const categories = catData?.categories ?? [];

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

  useMemo(() => { setPage(1); }, [searchQuery, statusFilter]);

  const statusOptions = ['all', 'draft', 'submitted', 'approved', 'rejected', 'reimbursed'];

  // Mutations
  const createMutation = useCreateExpense(tenantPathId);
  const submitMutation = useSubmitExpense(tenantPathId);
  const approveMutation = useApproveExpense(tenantPathId);
  const rejectMutation = useRejectExpense(tenantPathId);

  // Create form state
  const [form, setForm] = useState({
    category_id: '',
    description: '',
    amount: '',
    tax_amount: '',
    receipt_url: '',
    expense_date: new Date().toISOString().slice(0, 10),
  });

  const handleCreate = async () => {
    if (!form.description || !form.amount) return;
    await createMutation.mutateAsync({
      description: form.description,
      amount: parseFloat(form.amount),
      tax_amount: form.tax_amount ? parseFloat(form.tax_amount) : undefined,
      category_id: form.category_id || undefined,
      receipt_url: form.receipt_url || undefined,
      expense_date: form.expense_date || undefined,
    });
    setCreateOpen(false);
    setForm({ category_id: '', description: '', amount: '', tax_amount: '', receipt_url: '', expense_date: new Date().toISOString().slice(0, 10) });
  };

  const handleReject = async () => {
    if (!rejectOpen) return;
    await rejectMutation.mutateAsync({ id: rejectOpen, reason: rejectReason });
    setRejectOpen(null);
    setRejectReason('');
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track, submit, and manage expense claims.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Expense
        </Button>
      </div>

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
                      <td className="px-6 py-4 text-right font-bold text-xs">{exp.currency} {exp.total_amount}</td>
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

      {/* Create Expense Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="New Expense" description="Create a new expense claim." onClose={() => setCreateOpen(false)}>
          <div className="space-y-4">
            <FormField label="Category">
              <select
                className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Description" required>
              <input
                className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                placeholder="Expense description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Amount" required>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </FormField>
              <FormField label="Tax Amount">
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  placeholder="0.00"
                  value={form.tax_amount}
                  onChange={(e) => setForm((f) => ({ ...f, tax_amount: e.target.value }))}
                />
              </FormField>
            </div>
            <FormField label="Expense Date">
              <input
                type="date"
                className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                value={form.expense_date}
                onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
              />
            </FormField>
            <FormField label="Receipt URL">
              <input
                className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                placeholder="https://..."
                value={form.receipt_url}
                onChange={(e) => setForm((f) => ({ ...f, receipt_url: e.target.value }))}
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.description || !form.amount}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Receipt className="h-4 w-4 mr-1" />}
                Create Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
