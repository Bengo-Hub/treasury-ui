'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useAccounts } from '@/hooks/use-accounts';
import { useCreateJournalEntry } from '@/hooks/use-ledger';
import type { CreateJournalEntryRequest } from '@/lib/api/ledger';
import type { ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { emptyVoucherLine, toNumber, VoucherLinesEditor, type VoucherLineState } from './VoucherLinesEditor';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyLines = (): VoucherLineState[] => [emptyVoucherLine(), emptyVoucherLine()];

/**
 * New manual journal entry: a debit and credit grid (the same editor the voucher book uses for
 * journal vouchers) that must balance before it is created as a draft.
 */
export function CreateLedgerEntryDialog({
  open,
  onOpenChange,
  tenantSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}) {
  const createMutation = useCreateJournalEntry();
  const [entryDate, setEntryDate] = useState(todayLocal());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<VoucherLineState[]>(emptyLines());

  const { data: accountsData } = useAccounts(open ? tenantSlug : '');
  const accountOptions = useMemo<ComboboxOption[]>(
    () =>
      (accountsData?.accounts ?? [])
        .filter((a) => a.is_active !== false)
        .map((a) => ({ value: a.id, label: `${a.account_code} - ${a.account_name}`, hint: a.account_type })),
    [accountsData],
  );

  const used = lines.filter((l) => l.account_id && (toNumber(l.debit) > 0 || toNumber(l.credit) > 0));
  const totalDebit = used.reduce((sum, l) => sum + toNumber(l.debit), 0);
  const totalCredit = used.reduce((sum, l) => sum + toNumber(l.credit), 0);
  const isBalanced = used.length >= 2 && totalDebit > 0 && Math.round((totalDebit - totalCredit) * 100) === 0;

  function reset() {
    setEntryDate(todayLocal());
    setDescription('');
    setLines(emptyLines());
  }

  function handleSubmit() {
    const data: CreateJournalEntryRequest = {
      entry_date: entryDate,
      description,
      lines: used.map((l) => ({
        account_id: l.account_id,
        debit_amount: toNumber(l.debit),
        credit_amount: toNumber(l.credit),
        description: l.description,
      })),
    };
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="New Journal Entry"
        description="Create a new double-entry journal entry. Payments, receipts and transfers are easier as vouchers."
        onClose={() => onOpenChange(false)}
        className="max-w-3xl"
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
                placeholder="e.g. Month-end accrual"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </FormField>
          </div>

          <VoucherLinesEditor mode="grid" kind="other" lines={lines} accountOptions={accountOptions} onChange={setLines} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || !isBalanced}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
