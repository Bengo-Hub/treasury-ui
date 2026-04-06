'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Pagination } from '@/components/ui/pagination';
import {
  useQuotations,
  useCreateQuotation,
  useSendQuotation,
  useAcceptQuotation,
  useDeclineQuotation,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { Quotation, CreateQuotationRequest, LineRequest } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import {
  Filter,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' {
  switch (status) {
    case 'accepted': return 'success';
    case 'sent': return 'default';
    case 'draft': return 'secondary';
    case 'expired': return 'warning';
    case 'declined': return 'error';
    case 'converted': return 'success';
    default: return 'outline';
  }
}

const emptyLine = (): LineRequest => ({ description: '', quantity: 1, unit_price: 0 });

export default function QuotationsPage() {
  const { tenantPathId } = useResolvedTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const filters = useMemo(() => ({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    page,
    limit: ITEMS_PER_PAGE,
  }), [statusFilter, page]);

  const { data, isLoading, error } = useQuotations(tenantPathId, filters, !!tenantPathId);
  const quotations = data?.quotations ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return quotations;
    const q = searchQuery.toLowerCase();
    return quotations.filter(
      (qt: Quotation) =>
        qt.quote_number?.toLowerCase().includes(q) ||
        qt.customer_name?.toLowerCase().includes(q) ||
        qt.customer_email?.toLowerCase().includes(q)
    );
  }, [quotations, searchQuery]);

  useMemo(() => { setPage(1); }, [searchQuery, statusFilter]);

  const statusOptions = ['all', 'draft', 'sent', 'accepted', 'declined', 'expired', 'converted'];

  // ---- Create Dialog ----
  const [createOpen, setCreateOpen] = useState(false);
  const [newQuote, setNewQuote] = useState<{
    customer_name: string;
    customer_email: string;
    quote_date: string;
    valid_until: string;
    currency: string;
    notes: string;
    terms: string;
    lines: LineRequest[];
  }>({
    customer_name: '',
    customer_email: '',
    quote_date: new Date().toISOString().slice(0, 10),
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    currency: 'KES',
    notes: '',
    terms: '',
    lines: [emptyLine()],
  });

  const createMutation = useCreateQuotation(tenantPathId);

  const handleCreate = useCallback(() => {
    const body: CreateQuotationRequest = {
      customer_name: newQuote.customer_name,
      customer_email: newQuote.customer_email,
      quote_date: newQuote.quote_date,
      valid_until: newQuote.valid_until,
      currency: newQuote.currency,
      notes: newQuote.notes,
      terms: newQuote.terms,
      lines: newQuote.lines.filter((l) => l.description.trim()),
    };
    createMutation.mutate(body, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewQuote({
          customer_name: '',
          customer_email: '',
          quote_date: new Date().toISOString().slice(0, 10),
          valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          currency: 'KES',
          notes: '',
          terms: '',
          lines: [emptyLine()],
        });
      },
    });
  }, [newQuote, createMutation]);

  const addLine = () => {
    setNewQuote((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));
  };

  const removeLine = (idx: number) => {
    setNewQuote((prev) => ({
      ...prev,
      lines: prev.lines.length > 1 ? prev.lines.filter((_, i) => i !== idx) : prev.lines,
    }));
  };

  const updateLine = (idx: number, field: keyof LineRequest, value: any) => {
    setNewQuote((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }));
  };

  // ---- Row Actions ----
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const sendMutation = useSendQuotation(tenantPathId);
  const acceptMutation = useAcceptQuotation(tenantPathId);
  const declineMutation = useDeclineQuotation(tenantPathId);

  const lineTotal = (l: LineRequest) => Number(l.quantity || 0) * Number(l.unit_price || 0);
  const formTotal = newQuote.lines.reduce((sum, l) => sum + lineTotal(l), 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground mt-1">Create and manage sales quotations and estimates.</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Quotation
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load quotations. Check your connection and try again.
        </div>
      )}

      {/* Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by quote number or customer..."
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
                <Loader2 className="h-5 w-5 animate-spin" /> Loading quotations...
              </div>
            )}
            {!isLoading && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Quote #</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Customer</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Quote Date</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Valid Until</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((qt: Quotation) => (
                    <tr key={qt.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          {qt.quote_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div>{qt.customer_name || '--'}</div>
                        {qt.customer_email && (
                          <div className="text-muted-foreground text-[11px]">{qt.customer_email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-xs">
                        {qt.currency} {Number(qt.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={statusBadgeVariant(qt.status)}>{qt.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(qt.quote_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {new Date(qt.valid_until).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center relative">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === qt.id ? null : qt.id)}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenuId === qt.id && (
                          <div className="absolute right-6 top-12 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                            {qt.status === 'draft' && (
                              <button
                                className="w-full text-left px-4 py-2 text-xs hover:bg-accent flex items-center gap-2"
                                onClick={() => { sendMutation.mutate(qt.id); setActionMenuId(null); }}
                              >
                                <Send className="h-3.5 w-3.5" /> Send Quotation
                              </button>
                            )}
                            {(qt.status === 'sent' || qt.status === 'draft') && (
                              <button
                                className="w-full text-left px-4 py-2 text-xs hover:bg-accent flex items-center gap-2 text-green-600"
                                onClick={() => { acceptMutation.mutate(qt.id); setActionMenuId(null); }}
                              >
                                <Check className="h-3.5 w-3.5" /> Accept (Convert to Invoice)
                              </button>
                            )}
                            {qt.status !== 'declined' && qt.status !== 'converted' && (
                              <button
                                className="w-full text-left px-4 py-2 text-xs hover:bg-accent text-destructive flex items-center gap-2"
                                onClick={() => { declineMutation.mutate(qt.id); setActionMenuId(null); }}
                              >
                                <X className="h-3.5 w-3.5" /> Decline
                              </button>
                            )}
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
              <div className="p-12 text-center text-muted-foreground">No quotations match your filters.</div>
            )}
          </div>
          {!isLoading && total > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

      {/* ---- Create Quotation Dialog ---- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Create Quotation" onClose={() => setCreateOpen(false)} className="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Customer Name" required>
                <input
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newQuote.customer_name}
                  onChange={(e) => setNewQuote((p) => ({ ...p, customer_name: e.target.value }))}
                />
              </FormField>
              <FormField label="Customer Email">
                <input
                  type="email"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newQuote.customer_email}
                  onChange={(e) => setNewQuote((p) => ({ ...p, customer_email: e.target.value }))}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Quote Date" required>
                <input
                  type="date"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newQuote.quote_date}
                  onChange={(e) => setNewQuote((p) => ({ ...p, quote_date: e.target.value }))}
                />
              </FormField>
              <FormField label="Valid Until" required>
                <input
                  type="date"
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newQuote.valid_until}
                  onChange={(e) => setNewQuote((p) => ({ ...p, valid_until: e.target.value }))}
                />
              </FormField>
              <FormField label="Currency">
                <select
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
                  value={newQuote.currency}
                  onChange={(e) => setNewQuote((p) => ({ ...p, currency: e.target.value }))}
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
                {newQuote.lines.map((line, idx) => (
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
                Total: {newQuote.currency} {formTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Notes">
                <textarea
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary min-h-[60px]"
                  value={newQuote.notes}
                  onChange={(e) => setNewQuote((p) => ({ ...p, notes: e.target.value }))}
                />
              </FormField>
              <FormField label="Terms">
                <textarea
                  className="w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary min-h-[60px]"
                  value={newQuote.terms}
                  onChange={(e) => setNewQuote((p) => ({ ...p, terms: e.target.value }))}
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newQuote.lines.some((l) => l.description.trim())}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Quotation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
