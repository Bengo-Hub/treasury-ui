'use client';

import { CreditCard, X } from 'lucide-react';
import type { Bill } from '@/lib/api/bills';
import { formatCurrency } from '@/lib/utils/currency';

const billBalance = (b: Bill) => Number(b.balance_due ?? b.total_amount) || 0;
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '—');

/**
 * Pick which of a vendor's open bills to pay, from the Vendors list's "Pay" action. Payments in
 * treasury are recorded against a specific bill (PayBillDialog), so a vendor with several open
 * bills needs this one step; a vendor with a single open bill skips straight to PayBillDialog.
 * Oldest due first, so the default choice clears the most overdue debt.
 */
export function VendorOpenBillsDialog({ vendorName, bills, onPick, onClose }: {
  vendorName: string;
  bills: Bill[];
  onPick: (bill: Bill) => void;
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
              {bills.length} open bill{bills.length === 1 ? '' : 's'} · {formatCurrency(total, currency)} owed in total — pick the bill this payment is for
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
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
