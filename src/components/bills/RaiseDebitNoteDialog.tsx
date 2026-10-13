'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCreateBillDebitNote } from '@/hooks/use-bills';
import type { Bill } from '@/lib/api/bills';
import { formatCurrency } from '@/lib/utils/currency';
import { FileMinus, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-1.5 px-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

const round2 = (n: number) => Math.round(n * 100) / 100;

interface RaiseDebitNoteDialogProps {
  tenant: string;
  bill: Bill | null;
  onClose: () => void;
  onRaised?: (note: Bill) => void;
}

/**
 * Raises a debit note against a received bill: the buyer's document to the supplier for goods
 * returned, an overcharge or a short delivery. Each of the bill's lines can be debited by quantity
 * (net unit price kept, the line's VAT pro-rated). The note becomes a supplier credit that nets
 * against the supplier's open bills; the server caps all debit notes at the bill total. Mount it
 * with key={bill.id} so each bill starts with a clean form.
 */
export function RaiseDebitNoteDialog({ tenant, bill, onClose, onRaised }: RaiseDebitNoteDialogProps) {
  const create = useCreateBillDebitNote(tenant);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');

  const lines = useMemo(() => bill?.lines ?? [], [bill]);
  const picked = useMemo(
    () =>
      lines
        .map((l) => {
          const lineQty = Number(l.quantity) || 1;
          const q = Math.min(Math.max(Number(qty[l.id] ?? 0) || 0, 0), lineQty);
          const unit = Number(l.unit_price);
          const tax = round2((Number(l.tax_amount) / lineQty) * q);
          return { line: l, q, unit, tax, total: round2(unit * q + tax) };
        })
        .filter((p) => p.q > 0),
    [lines, qty],
  );
  const total = round2(picked.reduce((sum, p) => sum + p.total, 0));

  const close = () => {
    if (!create.isPending) onClose();
  };

  const submit = () => {
    if (!bill || picked.length === 0) return;
    create.mutate(
      {
        billId: bill.id,
        data: {
          reason: reason.trim() || undefined,
          lines: picked.map((p) => ({
            description: p.line.description,
            quantity: String(p.q),
            unit_price: String(p.unit),
            tax_amount: p.tax.toFixed(2),
          })),
        },
      },
      {
        onSuccess: (note) => {
          onRaised?.(note);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={!!bill} onOpenChange={(o) => !o && close()}>
      {bill && (
        <DialogContent
          title="Raise debit note"
          description={`Against ${bill.bill_number} · ${bill.vendor_name ?? ''} · ${formatCurrency(Number(bill.total_amount), bill.currency)}`}
          onClose={close}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Enter how much of each line to debit (returned, overcharged or not delivered). The note reduces what
              you owe this supplier and is applied first when you settle their bills.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-accent/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                    <th className="px-3 py-2 text-right font-semibold">Billed qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Unit price</th>
                    <th className="px-3 py-2 text-right font-semibold w-28">Debit qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-3 py-2">{l.description}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(l.quantity)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(Number(l.unit_price), bill.currency)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={Number(l.quantity) || 1}
                          step="any"
                          inputMode="decimal"
                          className={`${inputClass} text-right`}
                          value={qty[l.id] ?? ''}
                          placeholder="0"
                          onChange={(e) => setQty((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <textarea
                className={`${inputClass} min-h-[64px]`}
                value={reason}
                placeholder="e.g. 2 cartons returned damaged"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-sm">
                Debit note total: <span className="font-bold tabular-nums">{formatCurrency(total, bill.currency)}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={close} disabled={create.isPending}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={create.isPending || picked.length === 0}>
                  {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileMinus className="h-4 w-4 mr-1" />}
                  Raise debit note
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
