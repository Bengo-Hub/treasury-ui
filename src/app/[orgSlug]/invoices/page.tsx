'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Pagination } from '@/components/ui/pagination';
import {
  useInvoices,
  useCreateInvoice,
  useSendInvoice,
  useVoidInvoice,
  useRecordPayment,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { Invoice, CreateInvoiceRequest, LineRequest } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ChevronDown,
  Filter,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Ban,
  DollarSign,
  Trash2,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 3);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' {
  switch (status) {
    case 'paid': return 'success';
    case 'sent': return 'default';
    case 'draft': return 'secondary';
    case 'overdue': return 'warning';
    case 'void':
    case 'cancelled': return 'error';
    default: return 'outline';
  }
}

function paymentBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' {
  switch (status) {
    case 'paid': return 'success';
    case 'partial': return 'warning';
    case 'unpaid': return 'error';
    default: return 'outline';
  }
}

const emptyLine = (): LineRequest => ({ description: '', quantity: 1, unit_price: 0 });

export default function InvoicesPage() {
  const { tenantPathId } = useResolvedTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const dateRange = useMemo(() => defaultDateRange(), []);

  const filters = useMemo(() => ({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    from: dateRange.from,
    to: dateRange.to,
    page,
    limit: ITEMS_PER_PAGE,
  }), [statusFilter, dateRange, page]);

  const { data, isLoading, error } = useInvoices(tenantPathId, filters, !!tenantPathId);
  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(
      (inv: Invoice) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.metadata?.customer_name?.toLowerCase().includes(q) ||
        inv.metadata?.customer_email?.toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  // Reset page on filter change
  useMemo(() => { setPage(1); }, [searchQuery, statusFilter]);

  const statusOptions = ['all', 'draft', 'sent', 'paid', 'overdue', 'void'];

  // ---- Create Dialog State ----
  const [createOpen, setCreateOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState<{
    customer_name: string;
    customer_email: string;
    invoice_date: string;
    due_date: string;
    currency: string;
    notes: string;
    lines: LineRequest[];
  }>({
    customer_name: '',
    customer_email: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    currency: 'KES',
    notes: '',
    lines: [emptyLine()],
  });

  const createMutation = useCreateInvoice(tenantPathId);

  const handleCreate = useCallback(() => {
    const body: CreateInvoiceRequest = {
      invoice_date: newInvoice.invoice_date,
      due_date: newInvoice.due_date,
      currency: newInvoice.currency,
      lines: newInvoice.lines.filter((l) => l.description.trim()),
      metadata: {
        customer_name: newInvoice.customer_name,
        customer_email: newInvoice.customer_email,
        notes: newInvoice.notes,
      },
    };
    createMutation.mutate(body, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewInvoice({
          customer_name: '',
          customer_email: '',
          invoice_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          currency: 'KES',
          notes: '',
          lines: [emptyLine()],
        });
      },
    });
  }, [newInvoice, createMutation]);

  const addLine = () => {
    setNewInvoice((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));
  };

  const removeLine = (idx: number) => {
    setNewInvoice((prev) => ({
      ...prev,
      lines: prev.lines.length > 1 ? prev.lines.filter((_, i) => i !== idx) : prev.lines,
    }));
  };

  const updateLine = (idx: number, field: keyof LineRequest, value: any) => {
    setNewInvoice((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }));
  };

  // ---- Row Actions State ----
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ invoiceId: string; invoiceNumber: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const sendMutation = useSendInvoice(tenantPathId);
  const voidMutation = useVoidInvoice(tenantPathId);
  const paymentMutation = useRecordPayment(tenantPathId);

  const handleRecordPayment = useCallback(() => {
    if (!paymentDialog || !paymentAmount) return;
    paymentMutation.mutate(
      { invoiceId: paymentDialog.invoiceId, amount: paymentAmount },
      { onSuccess: () => { setPaymentDialog(null); setPaymentAmount(''); } },
    );
  }, [paymentDialog, paymentAmount, paymentMutation]);

  const lineTotal = (l: LineRequest) => Number(l.quantity || 0) * Number(l.unit_price || 0);
  const formTotal = newInvoice.lines.reduce((sum, l) => sum + lineTotal(l), 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Create, send and manage invoices.</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load invoices. Check your connection and try again.
        </div>
      )}

      {/* Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by invoice number or customer..."
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
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold capitalize transition-all',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent/30 text-muted-foreground hover:text-foreground',
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
                <Loader2 className="h-5 w-5 animate-spin" /> Loading invoices...
              </div>
            )}
            {!isLoading && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Invoice #</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Customer</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Payment</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Due</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((inv: Invoice) => (
                    <tr key={inv.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          {inv.invoice_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div>{inv.metadata?.customer_name || '--'}</div>
                        {inv.metadata?.customer_email && (
                          <div className="text-muted-foreground text-[11px]">{inv.metadata.customer_email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-xs">
                        {inv.currency} {Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusBadgeVariant(inv.status)}>{inv.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={paymentBadgeVariant(inv.payment_status)}>{inv.payment_status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(inv.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(inv.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center relative">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === inv.id ? null : inv.id)}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenuId === inv.id && (
                          <div className="absolute right-6 top-12 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                            {inv.status === 'draft' && (
                              <button
                                className="w-full text-left px-4 py-2 text-xs hover:bg-accent flex items-center gap-2"
                                onClick={() => { sendMutation.mutate(inv.id); setActionMenuId(null); }}
                              >
                                <Send className="h-3.5 w-3.5" /> Send Invoice
                              </button>
                            )}
                            {(inv.payment_status === 'unpaid' || inv.payment_status === 'partial') && inv.status !== 'void' && (
                              <button
                                className="w-full text-left px-4 py-2 text-xs hover:bg-accent flex items-center gap-2"
                                onClick={() => {
                                  setPaymentDialog({ invoiceId: inv.id, invoiceNumber: inv.invoice_number });
                                  setActionMenuId(null);
                                }}
                              >
                                <DollarSign className="h-3.5 w-3.5" /> Record Payment
                              </button>
                            )}
                            {inv.status !== 'void' && inv.status !== 'paid' && (
                              <button
                                className="w-full text-left px-4 py-2 text-xs hover:bg-accent text-destructive flex items-center gap-2"
                                onClick={() => { voidMutation.mutate(inv.id); setActionMenuId(null); }}
                              >
                                <Ban className="h-3.5 w-3.5" /> Void Invoice
                              </button>
                            )}
                            {/* Close menu fallback */}
                            <button
                              className="w-full text-left px-4 py-2 text-xs hover:bg-accent text-muted-foreground"
                              onClick={() => setActionMenuId(null)}
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No invoices match your filters.</div>
            )}
          </div>
          {!isLoading && total > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

      {/* ---- Create Invoice Dialog ---- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Create Invoice" onClose={() => setCreateOpen(false)} className="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Customer Name" required>
                <input
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newInvoice.customer_name}
                  onChange={(e) => setNewInvoice((p) => ({ ...p, customer_name: e.target.value }))}
                />
              </FormField>
              <FormField label="Customer Email">
                <input
                  type="email"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newInvoice.customer_email}
                  onChange={(e) => setNewInvoice((p) => ({ ...p, customer_email: e.target.value }))}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Invoice Date" required>
                <input
                  type="date"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newInvoice.invoice_date}
                  onChange={(e) => setNewInvoice((p) => ({ ...p, invoice_date: e.target.value }))}
                />
              </FormField>
              <FormField label="Due Date" required>
                <input
                  type="date"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice((p) => ({ ...p, due_date: e.target.value }))}
                />
              </FormField>
              <FormField label="Currency">
                <select
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newInvoice.currency}
                  onChange={(e) => setNewInvoice((p) => ({ ...p, currency: e.target.value }))}
                >
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </FormField>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Line Items</span>
                <Button variant="ghost" size="sm" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {newInvoice.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 items-end">
                    <FormField label={idx === 0 ? 'Description' : ''}>
                      <input
                        placeholder="Item description"
                        className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      />
                    </FormField>
                    <FormField label={idx === 0 ? 'Qty' : ''}>
                      <input
                        type="number"
                        min={1}
                        className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                      />
                    </FormField>
                    <FormField label={idx === 0 ? 'Unit Price' : ''}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                        value={line.unit_price}
                        onChange={(e) => updateLine(idx, 'unit_price', Number(e.target.value))}
                      />
                    </FormField>
                    <div className={cn('text-right text-xs font-bold py-2', idx === 0 && 'mt-5')}>
                      {lineTotal(line).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <button
                      onClick={() => removeLine(idx)}
                      className={cn('p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive', idx === 0 && 'mt-5')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-3 text-sm font-bold">
                Total: {newInvoice.currency} {formTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <FormField label="Notes">
              <textarea
                className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary min-h-[60px]"
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice((p) => ({ ...p, notes: e.target.value }))}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newInvoice.lines.some((l) => l.description.trim())}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Record Payment Dialog ---- */}
      <Dialog open={!!paymentDialog} onOpenChange={(v) => { if (!v) setPaymentDialog(null); }}>
        <DialogContent
          title={`Record Payment — ${paymentDialog?.invoiceNumber ?? ''}`}
          onClose={() => setPaymentDialog(null)}
        >
          <div className="space-y-4">
            <FormField label="Amount" required>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentDialog(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleRecordPayment}
                disabled={paymentMutation.isPending || !paymentAmount}
              >
                {paymentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
