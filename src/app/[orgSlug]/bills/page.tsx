'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Pagination } from '@/components/ui/pagination';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useBills,
  useAPAging,
  useCreateBill,
  usePayBill,
} from '@/hooks/use-bills';
import type { Bill, BillLineReq, AgingRow } from '@/lib/api/bills';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  CreditCard,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  pending: 'warning',
  paid: 'success',
  overdue: 'error',
  cancelled: 'outline',
};

export default function BillsPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState('');

  const queryParams = useMemo(() => ({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(isPlatformOwner && tenantQueryParam ? { tenantId: tenantQueryParam } : {}),
  }), [statusFilter, isPlatformOwner, tenantQueryParam]);

  const { data, isLoading, error } = useBills(tenantPathId, queryParams, !!tenantPathId);
  const { data: agingData } = useAPAging(tenantPathId, !!tenantPathId);

  const list = data?.bills ?? [];
  const agingRows = agingData?.rows ?? [];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (bill: Bill) =>
        bill.bill_number?.toLowerCase().includes(q) ||
        bill.vendor_name?.toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useMemo(() => { setPage(1); }, [searchQuery, statusFilter]);

  const statusOptions = ['all', 'draft', 'pending', 'paid', 'overdue'];

  const createMutation = useCreateBill(tenantPathId);
  const payMutation = usePayBill(tenantPathId);

  // Create form state
  const emptyLine: BillLineReq = { description: '', quantity: 1, unit_price: 0 };
  const [form, setForm] = useState({
    vendor_name: '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    currency: '',
    lines: [{ ...emptyLine }] as BillLineReq[],
  });

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { ...emptyLine }] }));
  const removeLine = (idx: number) => setForm((f) => ({
    ...f,
    lines: f.lines.length > 1 ? f.lines.filter((_, i) => i !== idx) : f.lines,
  }));
  const updateLine = (idx: number, field: keyof BillLineReq, value: string | number) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }));
  };

  const handleCreate = async () => {
    if (!form.vendor_name || !form.due_date || form.lines.length === 0) return;
    await createMutation.mutateAsync({
      vendor_name: form.vendor_name,
      bill_date: form.bill_date,
      due_date: form.due_date,
      currency: form.currency || undefined,
      lines: form.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
      })),
    });
    setCreateOpen(false);
    setForm({ vendor_name: '', bill_date: new Date().toISOString().slice(0, 10), due_date: '', currency: '', lines: [{ ...emptyLine }] });
  };

  const handlePay = async () => {
    if (!payOpen || !paymentIntentId) return;
    await payMutation.mutateAsync({ id: payOpen, paymentIntentId });
    setPayOpen(null);
    setPaymentIntentId('');
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground mt-1">Manage vendor bills and accounts payable.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Bill
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load bills. Check your connection and try again.
        </div>
      )}

      {/* AP Aging Summary */}
      {agingRows.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold">AP Aging Summary</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Vendor</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Current</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">1-30</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">31-60</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">61-90</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">90+</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agingRows.map((row: AgingRow) => (
                    <tr key={row.entity_id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-3 text-xs font-medium">{row.entity_name}</td>
                      <td className="px-4 py-3 text-right text-xs">{row.current}</td>
                      <td className="px-4 py-3 text-right text-xs">{row.days_1_to_30}</td>
                      <td className="px-4 py-3 text-right text-xs">{row.days_31_to_60}</td>
                      <td className="px-4 py-3 text-right text-xs">{row.days_61_to_90}</td>
                      <td className="px-4 py-3 text-right text-xs">{row.over_90}</td>
                      <td className="px-6 py-3 text-right text-xs font-bold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bills Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by bill number or vendor..."
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
                <Loader2 className="h-5 w-5 animate-spin" /> Loading bills...
              </div>
            )}
            {!isLoading && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Bill #</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Vendor</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Due Date</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Created</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.map((bill: Bill) => (
                    <tr key={bill.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{bill.bill_number}</td>
                      <td className="px-6 py-4 text-xs">{bill.vendor_name || '---'}</td>
                      <td className="px-6 py-4 text-right font-bold text-xs">{bill.currency} {bill.total_amount}</td>
                      <td className="px-6 py-4 text-xs">{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusVariant[bill.status] ?? 'outline'}>
                          {bill.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(bill.status === 'pending' || bill.status === 'overdue') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => setPayOpen(bill.id)}
                          >
                            <CreditCard className="h-3 w-3" /> Pay
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No bills match your filters.</div>
            )}
          </div>
          {!isLoading && filtered.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

      {/* Create Bill Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="New Bill" description="Create a new vendor bill." onClose={() => setCreateOpen(false)} className="max-w-lg">
          <div className="space-y-4">
            <FormField label="Vendor Name" required>
              <input
                className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                placeholder="Vendor name"
                value={form.vendor_name}
                onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Bill Date">
                <input
                  type="date"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={form.bill_date}
                  onChange={(e) => setForm((f) => ({ ...f, bill_date: e.target.value }))}
                />
              </FormField>
              <FormField label="Due Date" required>
                <input
                  type="date"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </FormField>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Line Items</span>
                <Button variant="ghost" size="sm" onClick={addLine} className="text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {form.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      className="flex-1 bg-accent/30 border border-border rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-16 bg-accent/30 border border-border rounded-lg py-2 px-2 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 bg-accent/30 border border-border rounded-lg py-2 px-2 text-xs focus:ring-1 focus:ring-primary"
                      placeholder="Price"
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                    <button
                      onClick={() => removeLine(idx)}
                      className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.vendor_name || !form.due_date}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Briefcase className="h-4 w-4 mr-1" />}
                Create Bill
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Bill Dialog */}
      <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
        <DialogContent title="Pay Bill" description="Enter payment intent ID to process payment." onClose={() => setPayOpen(null)}>
          <div className="space-y-4">
            <FormField label="Payment Intent ID" required>
              <input
                className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary font-mono"
                placeholder="Enter payment intent UUID"
                value={paymentIntentId}
                onChange={(e) => setPaymentIntentId(e.target.value)}
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
              <Button
                onClick={handlePay}
                disabled={payMutation.isPending || !paymentIntentId}
              >
                {payMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                <CreditCard className="h-4 w-4 mr-1" /> Pay Bill
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
