'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useCreateJournalEntry, useJournalEntries } from '@/hooks/use-ledger';
import type { JournalEntry, JournalLine } from '@/lib/api/ledger';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Loader2, Plus, Receipt, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface LineInput {
  account_id: string;
  debit_amount: string;
  credit_amount: string;
  description: string;
}

const voucherTypes = ['payment', 'receipt', 'journal', 'sales', 'purchase'] as const;
const voucherLabels: Record<string, string> = {
  payment: 'Payment Voucher',
  receipt: 'Receipt Voucher',
  journal: 'Journal Voucher',
  sales: 'Sales Voucher',
  purchase: 'Purchase Voucher',
};

const statusOptions = ['all', 'draft', 'submitted', 'approved', 'posted', 'reversed'] as const;

export default function VouchersPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useJournalEntries(
    effectiveTenant,
    statusFilter !== 'all' ? { status: statusFilter } : undefined,
  );
  const createMutation = useCreateJournalEntry();

  const entries = data?.entries ?? [];
  const voucherEntries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return entries.filter((entry) => {
      const meta = (entry.metadata as Record<string, unknown> | undefined) ?? {};
      const voucherType = String(meta.voucher_type ?? entry.reference_type ?? '').toLowerCase();
      const matchesType = typeFilter === 'all' || voucherType === typeFilter;
      const matchesSearch =
        entry.entry_number.toLowerCase().includes(query) ||
        entry.description?.toLowerCase().includes(query) ||
        voucherType.includes(query);
      return matchesType && matchesSearch;
    });
  }, [entries, searchQuery, typeFilter]);

  const summaryByType = useMemo(() => {
    return voucherTypes.reduce(
      (acc, type) => {
        acc[type] = entries.filter((entry) => {
          const meta = (entry.metadata as Record<string, unknown> | undefined) ?? {};
          return String(meta.voucher_type ?? entry.reference_type ?? '').toLowerCase() === type;
        }).length;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [entries]);

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-background/80 p-3 shadow-sm">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Voucher book</p>
              <h1 className="text-3xl font-bold tracking-tight">Vouchers</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Capture payment, receipt, sales, purchase, and journal vouchers in the same ledger workflow used for journals and reporting.
              </p>
            </div>
          </div>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Voucher
          </Button>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam ? (
        <div className="rounded-2xl border border-dashed border-border bg-accent/10 px-6 py-10 text-center text-sm text-muted-foreground">
          Select a tenant to view their voucher book and posting workflow.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total vouchers</p>
                <p className="mt-2 text-2xl font-bold">{entries.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Tracked through the same ledger engine</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment / receipt</p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  Payments {summaryByType.payment} · Receipts {summaryByType.receipt}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow</p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">Drafts, approvals, posting, and reversal handled together</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voucher number or description..."
                  className="w-full rounded-lg border border-border bg-accent/30 py-2 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['all', ...voucherTypes].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-bold capitalize transition-all',
                      typeFilter === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {type === 'all' ? 'All' : voucherLabels[type]}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading vouchers...
                </div>
              ) : error ? (
                <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Failed to load vouchers. Check your connection and try again.
                </div>
              ) : voucherEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-accent/30">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">No vouchers found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create a new voucher to start building your voucher book.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {voucherEntries.map((entry) => {
                    const meta = (entry.metadata as Record<string, unknown> | undefined) ?? {};
                    const voucherType = String(meta.voucher_type ?? entry.reference_type ?? '').toLowerCase();
                    const totalDebit = (entry.lines ?? []).reduce((sum, line) => sum + Number(line.debit_amount || 0), 0);
                    return (
                      <div key={entry.id} className="flex items-center justify-between px-6 py-4 hover:bg-accent/5 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-muted-foreground">{entry.entry_number}</span>
                            <Badge className="capitalize">{voucherLabels[voucherType] ?? (voucherType || 'Voucher')}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{entry.description || 'No description'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{totalDebit.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                          <p className="text-xs text-muted-foreground">{entry.status}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <CreateVoucherDialog open={createOpen} onOpenChange={setCreateOpen} tenantSlug={effectiveTenant} />
    </div>
  );
}

function CreateVoucherDialog({
  open,
  onOpenChange,
  tenantSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}) {
  const createMutation = useCreateJournalEntry();
  const [voucherType, setVoucherType] = useState('payment');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineInput[]>([
    { account_id: '', debit_amount: '', credit_amount: '', description: '' },
    { account_id: '', debit_amount: '', credit_amount: '', description: '' },
  ]);

  const { data: accountsData } = useQuery({
    queryKey: ['ledger-accounts-list', tenantSlug],
    queryFn: () => apiClient.get<{ accounts: LedgerAccount[] }>(`/api/v1/${tenantSlug}/ledger/accounts`),
    enabled: !!tenantSlug && open,
  });
  const accounts = accountsData?.accounts ?? [];

  function updateLine(index: number, field: keyof LineInput, value: string) {
    setLines((prev) => prev.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { account_id: '', debit_amount: '', credit_amount: '', description: '' }]);
  }

  function handleSubmit() {
    createMutation.mutate(
      {
        tenantSlug,
        data: {
          entry_date: entryDate,
          description,
          reference_type: voucherType,
          reference_id: referenceNumber || undefined,
          metadata: { voucher_type: voucherType, source: 'treasury-ui-voucher-book' },
          lines: lines
            .filter((line) => line.account_id)
            .map((line) => ({
              account_id: line.account_id,
              debit_amount: parseFloat(line.debit_amount) || 0,
              credit_amount: parseFloat(line.credit_amount) || 0,
              description: line.description,
            })),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setVoucherType('payment');
          setReferenceNumber('');
          setEntryDate(new Date().toISOString().slice(0, 10));
          setDescription('');
          setLines([
            { account_id: '', debit_amount: '', credit_amount: '', description: '' },
            { account_id: '', debit_amount: '', credit_amount: '', description: '' },
          ]);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New Voucher" description="Create a ledger voucher using the same posting workflow as journals." onClose={() => onOpenChange(false)} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Voucher Type" required>
              <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm">
                {voucherTypes.map((type) => (
                  <option key={type} value={type}>
                    {voucherLabels[type]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Reference Number">
              <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" placeholder="e.g. PV-001" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Voucher Date" required>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Description">
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" placeholder="Purpose or narration" />
            </FormField>
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-accent/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Voucher lines</p>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Add line
              </Button>
            </div>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-border/60 bg-background/80 p-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
                <select value={line.account_id} onChange={(e) => updateLine(index, 'account_id', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm">
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
                <input value={line.debit_amount} onChange={(e) => updateLine(index, 'debit_amount', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" placeholder="Debit" />
                <input value={line.credit_amount} onChange={(e) => updateLine(index, 'credit_amount', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" placeholder="Credit" />
                <input value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" placeholder="Narration" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Voucher
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
