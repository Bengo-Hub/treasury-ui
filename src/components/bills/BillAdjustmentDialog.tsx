'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCreateBillAdjustment, type BillAdjustmentKind } from '@/hooks/use-bills';
import type { Bill } from '@/lib/api/bills';
import { formatCurrency } from '@/lib/utils/currency';
import { FileMinus, FilePlus, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-1.5 px-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

const round2 = (n: number) => Math.round(n * 100) / 100;

interface BillAdjustmentDialogProps {
  tenant: string;
  kind: BillAdjustmentKind;
  bill: Bill | null;
  onClose: () => void;
  onRaised?: (doc: Bill) => void;
}

const COPY: Record<BillAdjustmentKind, { title: string; intro: string; column: string; total: string; reasonHint: string }> = {
  vendor_credit: {
    title: 'Raise vendor credit',
    intro:
      'Enter how much of each line to credit (returned, overcharged or not delivered). The credit reduces what you owe this supplier and is applied first when you settle their bills. Its PDF is the Debit Note you send the supplier.',
    column: 'Credit qty',
    total: 'Vendor credit total',
    reasonHint: 'e.g. 2 cartons returned damaged',
  },
  supplementary_bill: {
    title: 'Raise supplementary bill',
    intro:
      'Enter the amount the supplier undercharged on each line, before VAT. VAT is added at the line’s own rate. The supplementary bill is owed on top of this bill, on its terms.',
    column: 'Extra (excl. VAT)',
    total: 'Supplementary bill total',
    reasonHint: 'e.g. price increase confirmed by the supplier',
  },
};

/**
 * Raises an adjustment against a received bill, as QuickBooks and Zoho Books name them:
 * - a vendor credit picks a quantity of each line (net unit price kept, the line's VAT pro-rated);
 *   the server caps all vendor credits at the bill total;
 * - a supplementary bill takes the undercharged amount per line, with VAT at the line's own rate.
 * Either is queued for KRA eTIMS against the bill's purchase when that purchase is already there.
 * Mount it with key={bill.id + kind} so each opening starts with a clean form.
 */
export function BillAdjustmentDialog({ tenant, kind, bill, onClose, onRaised }: BillAdjustmentDialogProps) {
  const create = useCreateBillAdjustment(tenant, kind);
  const [input, setInput] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const copy = COPY[kind];

  const lines = useMemo(() => bill?.lines ?? [], [bill]);
  const picked = useMemo(
    () =>
      lines
        .map((l) => {
          const lineQty = Number(l.quantity) || 1;
          const unit = Number(l.unit_price);
          const value = Math.max(Number(input[l.id] ?? 0) || 0, 0);
          if (kind === 'vendor_credit') {
            const q = Math.min(value, lineQty);
            const tax = round2((Number(l.tax_amount) / lineQty) * q);
            return { line: l, description: l.description, q, unit, tax, total: round2(unit * q + tax) };
          }
          // Supplementary: one line per undercharged line, VAT at that line's rate.
          const base = unit * lineQty;
          const rate = base > 0 ? Number(l.tax_amount) / base : 0;
          const extra = round2(value);
          const tax = round2(extra * rate);
          return { line: l, description: `${l.description} (undercharge)`, q: extra > 0 ? 1 : 0, unit: extra, tax, total: round2(extra + tax) };
        })
        .filter((p) => p.q > 0),
    [lines, input, kind],
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
            description: p.description,
            quantity: String(p.q),
            unit_price: String(p.unit),
            tax_amount: p.tax.toFixed(2),
          })),
        },
      },
      {
        onSuccess: (doc) => {
          onRaised?.(doc);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={!!bill} onOpenChange={(o) => !o && close()}>
      {bill && (
        <DialogContent
          title={copy.title}
          description={`Against ${bill.bill_number} · ${bill.vendor_name ?? ''} · ${formatCurrency(Number(bill.total_amount), bill.currency)}`}
          onClose={close}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{copy.intro}</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-accent/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                    <th className="px-3 py-2 text-right font-semibold">Billed qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Unit price</th>
                    <th className="px-3 py-2 text-right font-semibold w-32">{copy.column}</th>
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
                          max={kind === 'vendor_credit' ? Number(l.quantity) || 1 : undefined}
                          step="any"
                          inputMode="decimal"
                          className={`${inputClass} text-right`}
                          value={input[l.id] ?? ''}
                          placeholder="0"
                          onChange={(e) => setInput((prev) => ({ ...prev, [l.id]: e.target.value }))}
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
                placeholder={copy.reasonHint}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-sm">
                {copy.total}: <span className="font-bold tabular-nums">{formatCurrency(total, bill.currency)}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={close} disabled={create.isPending}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={create.isPending || picked.length === 0}>
                  {create.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : kind === 'vendor_credit' ? (
                    <FileMinus className="h-4 w-4 mr-1" />
                  ) : (
                    <FilePlus className="h-4 w-4 mr-1" />
                  )}
                  {copy.title}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
