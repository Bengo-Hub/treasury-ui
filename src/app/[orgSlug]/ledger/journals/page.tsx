'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useJournalEntries,
  useCreateJournalEntry,
  useSubmitJournalEntry,
  useApproveJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
  useTrialBalance,
} from '@/hooks/use-ledger';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { apiClient } from '@/lib/api/client';
import type { JournalEntry, JournalLine } from '@/lib/api/ledger';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Stamp,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: string;
}

const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'error' | 'secondary'> = {
  draft: 'secondary',
  submitted: 'warning',
  approved: 'default',
  posted: 'success',
  reversed: 'error',
};

export default function JournalsPage() {
  const { tenantPathId } = useResolvedTenant();
  const [view, setView] = useState<'entries' | 'trial-balance'>('entries');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useJournalEntries(tenantPathId, statusFilter !== 'all' ? { status: statusFilter } : undefined);
  const entries = data?.entries ?? [];

  const filtered = useMemo(() => entries, [entries]);

  const statusOptions = ['all', 'draft', 'submitted', 'approved', 'posted', 'reversed'];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground mt-1">Manage journal entries and view the trial balance.</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'entries' | 'trial-balance')}>
            <TabsList>
              <TabsTrigger value="entries">Entries</TabsTrigger>
              <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'entries' && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Entry
            </Button>
          )}
        </div>
      </div>

      {view === 'entries' ? (
        <JournalEntriesList
          entries={filtered}
          isLoading={isLoading}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          statusOptions={statusOptions}
          tenantSlug={tenantPathId}
        />
      ) : (
        <TrialBalanceView tenantSlug={tenantPathId} />
      )}

      <CreateJournalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        tenantSlug={tenantPathId}
      />
    </div>
  );
}

// ---- Journal Entries Table ----

function JournalEntriesList({
  entries,
  isLoading,
  statusFilter,
  setStatusFilter,
  statusOptions,
  tenantSlug,
}: {
  entries: JournalEntry[];
  isLoading: boolean;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  statusOptions: string[];
  tenantSlug: string;
}) {
  const submitMutation = useSubmitJournalEntry();
  const approveMutation = useApproveJournalEntry();
  const postMutation = usePostJournalEntry();
  const reverseMutation = useReverseJournalEntry();

  function totalDebit(e: JournalEntry) {
    return (e.lines ?? []).reduce((sum, l) => sum + Number(l.debit_amount || 0), 0);
  }
  function totalCredit(e: JournalEntry) {
    return (e.lines ?? []).reduce((sum, l) => sum + Number(l.credit_amount || 0), 0);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Entries</h3>
        </div>
        <div className="flex gap-2">
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
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading journal entries...
          </div>
        )}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/5">
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Entry #</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Debit</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Credit</th>
                  <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold">{entry.entry_number}</td>
                    <td className="px-6 py-4 text-xs">{new Date(entry.entry_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-xs max-w-[200px] truncate">{entry.description || '---'}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold">{totalDebit(entry).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold">{totalCredit(entry).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={statusVariant[entry.status] ?? 'outline'}>{entry.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {entry.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => submitMutation.mutate({ tenantSlug, entryID: entry.id })}
                            disabled={submitMutation.isPending}
                            title="Submit"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {entry.status === 'submitted' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => approveMutation.mutate({ tenantSlug, entryID: entry.id })}
                            disabled={approveMutation.isPending}
                            title="Approve"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {entry.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => postMutation.mutate({ tenantSlug, entryID: entry.id })}
                            disabled={postMutation.isPending}
                            title="Post"
                          >
                            <Stamp className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {entry.status === 'posted' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => reverseMutation.mutate({ tenantSlug, entryID: entry.id })}
                            disabled={reverseMutation.isPending}
                            title="Reverse"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && entries.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">No journal entries found.</div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Trial Balance View ----

function TrialBalanceView({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading } = useTrialBalance(tenantSlug);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Trial Balance</h3>
        </div>
        {data && (
          <Badge variant={data.is_balanced ? 'success' : 'error'}>
            {data.is_balanced ? 'Balanced' : 'Unbalanced'}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading trial balance...
          </div>
        )}
        {!isLoading && data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/5">
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Code</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Account</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Debit</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data.rows ?? []).map((row) => (
                  <tr key={row.account_id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs">{row.account_code}</td>
                    <td className="px-6 py-3 text-xs">{row.account_name}</td>
                    <td className="px-6 py-3 text-xs capitalize text-muted-foreground">{row.account_type}</td>
                    <td className="px-6 py-3 text-right text-xs font-bold">
                      {Number(row.debit) > 0 ? Number(row.debit).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="px-6 py-3 text-right text-xs font-bold">
                      {Number(row.credit) > 0 ? Number(row.credit).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-accent/10 font-bold">
                  <td colSpan={3} className="px-6 py-3 text-xs uppercase">Total</td>
                  <td className="px-6 py-3 text-right text-xs">{Number(data.total_debit).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-3 text-right text-xs">{Number(data.total_credit).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Create Journal Entry Dialog ----

interface LineInput {
  account_id: string;
  debit_amount: string;
  credit_amount: string;
  description: string;
}

function CreateJournalDialog({
  open,
  onOpenChange,
  tenantSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}) {
  const createMutation = useCreateJournalEntry();
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

  function updateLine(i: number, field: keyof LineInput, value: string) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { account_id: '', debit_amount: '', credit_amount: '', description: '' }]);
  }

  function removeLine(i: number) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  function handleSubmit() {
    createMutation.mutate(
      {
        tenantSlug,
        data: {
          entry_date: entryDate,
          description,
          lines: lines
            .filter((l) => l.account_id)
            .map((l) => ({
              account_id: l.account_id,
              debit_amount: parseFloat(l.debit_amount) || 0,
              credit_amount: parseFloat(l.credit_amount) || 0,
              description: l.description,
            })),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
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
      <DialogContent
        title="New Journal Entry"
        description="Create a new double-entry journal entry."
        onClose={() => onOpenChange(false)}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Entry Date" required>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Description">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly rent payment"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lines</p>
              <Button size="sm" variant="ghost" onClick={addLine} className="gap-1">
                <Plus className="h-3 w-3" /> Add Line
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent/5 border-b border-border">
                    <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground">Account</th>
                    <th className="text-right px-3 py-2 text-xs font-bold text-muted-foreground">Debit</th>
                    <th className="text-right px-3 py-2 text-xs font-bold text-muted-foreground">Credit</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground">Memo</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <select
                          value={line.account_id}
                          onChange={(e) => updateLine(i, 'account_id', e.target.value)}
                          className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs"
                        >
                          <option value="">Select account...</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit_amount}
                          onChange={(e) => updateLine(i, 'debit_amount', e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit_amount}
                          onChange={(e) => updateLine(i, 'credit_amount', e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(i, 'description', e.target.value)}
                          placeholder="Memo"
                          className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs"
                        />
                      </td>
                      <td className="px-1 py-2">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          disabled={lines.length <= 2}
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
                    <td className="px-3 py-2 text-xs uppercase">Total</td>
                    <td className="px-3 py-2 text-right text-xs">{totalDebit.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-xs">{totalCredit.toFixed(2)}</td>
                    <td colSpan={2} className="px-3 py-2 text-xs">
                      {isBalanced ? (
                        <span className="text-green-500">Balanced</span>
                      ) : totalDebit > 0 || totalCredit > 0 ? (
                        <span className="text-destructive">
                          Diff: {Math.abs(totalDebit - totalCredit).toFixed(2)}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isBalanced || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
