'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdjustCustomerStoreCredit } from '@/hooks/use-invoices';
import type { CustomerBalance } from '@/lib/api/invoices';
import { formatCurrency } from '@/lib/utils/currency';

interface RemoveStoreCreditModalProps {
  tenant: string;
  target: CustomerBalance;
  onClose: () => void;
}

/**
 * Manually remove/reduce a customer's stored credit as a staff correction — e.g. an over-grant
 * entered by mistake. Deliberately NOT a wrapper over SettlementModal: unlike Pay-out Credit (real
 * cash leaves via a channel) this posts no GL entry at all, mirroring WriteOffDebt's own
 * established precedent for a pure admin correction with no matching cash movement — so there's no
 * payment method/channel to pick, just an amount (capped at what's available) and a mandatory
 * reason. Reused by ClientsManager.
 */
export function RemoveStoreCreditModal({ tenant, target, onClose }: RemoveStoreCreditModalProps) {
  const adjust = useAdjustCustomerStoreCredit(tenant);
  const contactId = target.crm_contact_id || target.customer_identifier || target.id;
  const available = parseFloat(target.store_credit_balance) || 0;

  const [amount, setAmount] = useState(String(available));
  const [reason, setReason] = useState('');

  const parsedAmount = parseFloat(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= available;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-black text-foreground">Remove store credit</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {target.customer_name || target.customer_identifier || 'Customer'} — available {formatCurrency(available, target.currency)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-muted-foreground">
            This is a correction, not a payout — no cash leaves the business and nothing is recorded on the
            general ledger. To actually pay the credit out to the customer, use &quot;Pay out credit&quot; instead.
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-500">Amount to remove</label>
            <input
              type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
              min={0} max={available} step="0.01"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
            {!amountValid && amount !== '' && (
              <p className="mt-1 text-[11px] text-red-600">Enter an amount between 0 and {formatCurrency(available, target.currency)}.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Reason</label>
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. correcting an over-grant entered by mistake"
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-accent/10">
          <button className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background hover:bg-accent" onClick={onClose}>
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            disabled={!amountValid || !reason.trim() || adjust.isPending}
            onClick={() =>
              adjust.mutate(
                { contactId, amount: parsedAmount, direction: 'debit', reason: reason.trim() },
                {
                  onSuccess: () => { toast.success('Store credit removed'); onClose(); },
                  onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to remove store credit'),
                },
              )
            }
          >
            {adjust.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Remove credit
          </button>
        </div>
      </div>
    </div>
  );
}
