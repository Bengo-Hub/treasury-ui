'use client';

import { CreditCard, Layers, X } from 'lucide-react';
import type { Bill } from '@/lib/api/bills';
import { formatCurrency } from '@/lib/utils/currency';

const billBalance = (b: Bill) => Number(b.balance_due ?? b.total_amount) || 0;
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '—');

/**
 * The Vendors list's "Pay" action for a supplier with several open bills (or credit to use):
 * either settle them all, or part of the total, in ONE payment (onSettleAll opens
 * SettleVendorDialog, which spreads the amount oldest due first after applying the supplier's
 * credit), or pick one bill to pay on its own (PayBillDialog). Oldest due first.
 */
export function VendorOpenBillsDialog({ vendorName, bills, onPick, onSettleAll, onClose }: {
  vendorName: string;
  bills: Bill[];
  onPick: (bill: Bill) => void;
  onSettleAll: () => void;
  onClose: () => void;
}) {
  const currency = bills[0]?.currency || 'KES';
  const total = bills.reduce((s, b) => s + billBalance(b), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-black text-foreground">Pay {vendorName}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {bills.length} open bill{bills.length === 1 ? '' : 's'} · {formatCurrency(total, currency)} owed on bills
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/5 px-6 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Pay several bills in one payment</p>
            <p className="text-[11px] text-muted-foreground">
              Pay all or part of the total; credits are used first, then the oldest bills are cleared.
            </p>
          </div>
          <button
            type="button"
            onClick={onSettleAll}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Layers className="h-3 w-3" /> Settle together
          </button>
        </div>
        <p className="px-6 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Or pay one bill</p>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {bills.map((b) => {
            const overdue = b.status === 'overdue';
            return (
              <div key={b.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{b.bill_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Billed {fmtDate(b.bill_date)} · Due{' '}
                    <span className={overdue ? 'text-red-600 font-semibold' : ''}>{fmtDate(b.due_date)}</span>
                    {Number(b.amount_paid) > 0 && <> · {formatCurrency(Number(b.amount_paid), b.currency)} already paid</>}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold tabular-nums text-amber-600">{formatCurrency(billBalance(b), b.currency)}</span>
                  <button
                    type="button"
                    onClick={() => onPick(b)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    <CreditCard className="h-3 w-3" /> Pay
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
