'use client';

/**
 * CreditNoteDialog — line-level credit-note creation. Pick the lines (and quantities) to
 * credit; submitting all lines at full quantity issues the legacy FULL credit note (empty
 * request body), anything less posts a PARTIAL credit note with the selected lines. The
 * backend rejects credits above the source's un-credited remainder — that error surfaces
 * inside the dialog.
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { CreditNoteLineRequest, Invoice } from '@/lib/api/invoices';
import { FileMinus, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface LinePick {
  selected: boolean;
  qty: string; // editable, ≤ original
}

function lineTotal(qty: number, unitPrice: number, discount: number, taxRate: number, originalQty: number) {
  // Mirror the backend: net = qty*price − discount (discount scales with the credited
  // fraction), tax = net × rate.
  const fraction = originalQty > 0 ? qty / originalQty : 0;
  const net = qty * unitPrice - discount * fraction;
  return net + (net * taxRate) / 100;
}

export function CreditNoteDialog({
  invoice,
  open,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onSubmit: (lines?: CreditNoteLineRequest[]) => void;
  pending: boolean;
  error?: string;
}) {
  const lines = useMemo(() => invoice.lines ?? [], [invoice.lines]);
  const [picks, setPicks] = useState<LinePick[]>(() => lines.map(() => ({ selected: true, qty: '' })));

  // Re-derive defaults when the dialog opens for a different invoice.
  const [seenId, setSeenId] = useState(invoice.id);
  if (seenId !== invoice.id) {
    setSeenId(invoice.id);
    setPicks(lines.map(() => ({ selected: true, qty: '' })));
  }

  const fmt = (v: number) =>
    `${invoice.currency} ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rows = lines.map((l, i) => {
    const originalQty = Number(l.quantity) || 0;
    const pick = picks[i] ?? { selected: true, qty: '' };
    const qty = pick.qty === '' ? originalQty : Math.min(Math.max(Number(pick.qty) || 0, 0), originalQty);
    return { line: l, pick, qty, originalQty };
  });

  const creditTotal = rows.reduce((sum, r) => {
    if (!r.pick.selected || r.qty <= 0) return sum;
    return sum + lineTotal(r.qty, Number(r.line.unit_price) || 0, Number(r.line.discount_amount) || 0, Number(r.line.tax_rate) || 0, r.originalQty);
  }, 0);

  const isFull = rows.every((r) => r.pick.selected && r.qty === r.originalQty);
  const anySelected = rows.some((r) => r.pick.selected && r.qty > 0);

  function submit() {
    if (!anySelected) return;
    if (isFull) {
      onSubmit(undefined); // legacy full credit note
      return;
    }
    const reqLines: CreditNoteLineRequest[] = rows
      .filter((r) => r.pick.selected && r.qty > 0)
      .map((r) => {
        const fraction = r.originalQty > 0 ? r.qty / r.originalQty : 0;
        return {
          description: r.line.description,
          item_id: r.line.item_id,
          item_sku: r.line.item_sku,
          item_type: r.line.item_type,
          unit: r.line.unit,
          quantity: String(r.qty),
          unit_price: r.line.unit_price,
          tax_code: r.line.tax_code,
          tax_rate: r.line.tax_rate,
          discount_amount: String(((Number(r.line.discount_amount) || 0) * fraction).toFixed(2)),
        };
      });
    onSubmit(reqLines);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent title={`Credit note for ${invoice.invoice_number}`} onClose={onClose}>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Select the lines (and quantities) to credit. Crediting everything issues a full
            credit note; the total may never exceed the invoice&apos;s un-credited remainder.
          </p>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted text-left">
                <tr>
                  <th className="w-8 px-2 py-2" />
                  <th className="px-2 py-2 font-semibold text-muted-foreground">Line</th>
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Qty to credit</th>
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Credit amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r, i) => (
                  <tr key={r.line.id ?? i} className={r.pick.selected ? '' : 'opacity-50'}>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={r.pick.selected}
                        onChange={(e) => setPicks((p) => p.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)))}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-foreground">{r.line.description}</div>
                      <div className="text-muted-foreground">
                        {r.originalQty.toLocaleString()} × {fmt(Number(r.line.unit_price) || 0)}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        min={0.01}
                        max={r.originalQty}
                        step="any"
                        disabled={!r.pick.selected}
                        value={r.pick.qty === '' ? r.originalQty : r.pick.qty}
                        onChange={(e) => setPicks((p) => p.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
                        className="w-20 rounded-md border border-input bg-transparent px-2 py-1 text-right text-xs tabular-nums disabled:opacity-50"
                      />
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {r.pick.selected && r.qty > 0
                        ? fmt(lineTotal(r.qty, Number(r.line.unit_price) || 0, Number(r.line.discount_amount) || 0, Number(r.line.tax_rate) || 0, r.originalQty))
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Credit total {isFull && <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Full credit note</span>}
            </span>
            <span className="font-bold tabular-nums">{fmt(creditTotal)}</span>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPicks(lines.map(() => ({ selected: true, qty: '' })))}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              Select all (full)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !anySelected}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileMinus className="h-3.5 w-3.5" />}
              Issue credit note
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
