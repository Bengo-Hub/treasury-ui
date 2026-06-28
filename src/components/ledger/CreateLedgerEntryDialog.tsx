'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useAccounts } from '@/hooks/use-accounts';
import { useCreateJournalEntry } from '@/hooks/use-ledger';
import type { CreateJournalEntryRequest } from '@/lib/api/ledger';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface LineInput {
  account_id: string;
  debit_amount: string;
  credit_amount: string;
  description: string;
}

type Account = { id: string; account_code: string; account_name: string };

const voucherTypes = ['payment', 'receipt', 'journal', 'sales', 'purchase'] as const;
const voucherLabels: Record<string, string> = {
  payment: 'Payment Voucher',
  receipt: 'Receipt Voucher',
  journal: 'Journal Voucher',
  sales: 'Sales Voucher',
  purchase: 'Purchase Voucher',
};

function emptyLines(): LineInput[] {
  return [
    { account_id: '', debit_amount: '', credit_amount: '', description: '' },
    { account_id: '', debit_amount: '', credit_amount: '', description: '' },
  ];
}

export function CreateLedgerEntryDialog({
  open,
  onOpenChange,
  tenantSlug,
  variant = 'journal',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  variant?: 'journal' | 'voucher';
}) {
  const isVoucher = variant === 'voucher';
  const createMutation = useCreateJournalEntry();
  const [voucherType, setVoucherType] = useState('payment');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineInput[]>(emptyLines());

  const { data: accountsData } = useAccounts(tenantSlug);
  const accounts = (accountsData?.accounts ?? []) as Account[];

  function updateLine(index: number, field: keyof LineInput, value: string) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { account_id: '', debit_amount: '', credit_amount: '', description: '' }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  function reset() {
    setVoucherType('payment');
    setReferenceNumber('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setDescription('');
    setLines(emptyLines());
  }

  function handleSubmit() {
    const data: CreateJournalEntryRequest = {
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
    };

    if (isVoucher) {
      data.reference_type = voucherType;
      data.reference_id = referenceNumber || undefined;
      data.metadata = { voucher_type: voucherType, source: 'treasury-ui-voucher-book' };
    }

    createMutation.mutate(
      { tenantSlug, data },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      },
    );
  }

  // The journals dialog enforces a balanced entry before allowing submit; the voucher
  // dialog only guards against in-flight submissions. Preserve both behaviors.
  const submitDisabled = createMutation.isPending || (!isVoucher && !isBalanced);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isVoucher ? 'New Voucher' : 'New Journal Entry'}
        description={
          isVoucher
            ? 'Create a ledger voucher using the same posting workflow as journals.'
            : 'Create a new double-entry journal entry.'
        }
        onClose={() => onOpenChange(false)}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {isVoucher && (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Voucher Type" required>
                <select
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                >
                  {voucherTypes.map((type) => (
                    <option key={type} value={type}>
                      {voucherLabels[type]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Reference Number">
                <input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder="e.g. PV-001"
                />
              </FormField>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label={isVoucher ? 'Voucher Date' : 'Entry Date'} required>
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
                placeholder={isVoucher ? 'Purpose or narration' : 'e.g. Monthly rent payment'}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
          </div>

          <LinesEditor
            lines={lines}
            accounts={accounts}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
            isBalanced={isBalanced}
            onUpdate={updateLine}
            onAdd={addLine}
            onRemove={removeLine}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitDisabled}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isVoucher ? 'Save Voucher' : 'Create Entry'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinesEditor({
  lines,
  accounts,
  totalDebit,
  totalCredit,
  isBalanced,
  onUpdate,
  onAdd,
  onRemove,
}: {
  lines: LineInput[];
  accounts: Account[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  onUpdate: (index: number, field: keyof LineInput, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lines</p>
        <Button size="sm" variant="ghost" onClick={onAdd} className="gap-1">
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
                    onChange={(e) => onUpdate(i, 'account_id', e.target.value)}
                    className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs"
                  >
                    <option value="">Select account...</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_code} - {a.account_name}
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
                    onChange={(e) => onUpdate(i, 'debit_amount', e.target.value)}
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
                    onChange={(e) => onUpdate(i, 'credit_amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs text-right"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => onUpdate(i, 'description', e.target.value)}
                    placeholder="Memo"
                    className="w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs"
                  />
                </td>
                <td className="px-1 py-2">
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
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
                  <span className="text-destructive">Diff: {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                ) : null}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
