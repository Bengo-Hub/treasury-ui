'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useApplyCustomerCreditToDebt } from '@/hooks/use-invoices';
import type { CustomerBalance } from '@/lib/api/invoices';
import { formatCurrency } from '@/lib/utils/currency';
import { Loader2, X } from 'lucide-react';

interface ApplyCreditToDebtModalProps {
  tenant: string;
  target: CustomerBalance;
  onClose: () => void;
}

/**
 * Modal to net a customer's EXISTING stored credit against their OWN outstanding debit — the
 * explicit, visible action that replaces the old silent behaviour where an unrelated cash
 * payment could drive balance_due to zero while a store-credit grant stayed stranded and
 * invisible (the boi-enterprises incident: 48,000 stored credit + a separately-cleared debt,
 * with no button able to net them). POST /ar/customers/{contactID}/apply-to-debt.
 */
export function ApplyCreditToDebtModal({ tenant, target, onClose }: ApplyCreditToDebtModalProps) {
  const applyToDebt = useApplyCustomerCreditToDebt(tenant);
  const available = parseFloat(target.store_credit_balance) || 0;
  const owed = parseFloat(target.outstanding_debit) || 0;
  const cap = Math.min(available, owed);
  const [amount, setAmount] = useState(String(cap));
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (amt > cap + 0.0001) {
      setError(`Amount exceeds the lesser of available credit and outstanding debit (${formatCurrency(cap, target.currency)}).`);
      return;
    }
    const contactId = target.crm_contact_id || target.customer_identifier || target.id;
    applyToDebt.mutate(
      { contactId, amount: amt, reference: reference || undefined },
      {
        onSuccess: () => onClose(),
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Failed to apply credit.'),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !applyToDebt.isPending && onClose()}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <h3 className="text-base font-bold">Apply store credit to debt</h3>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={applyToDebt.isPending}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-accent/20 px-3 py-2 text-sm space-y-1">
              <p className="font-semibold">{target.customer_name || target.customer_identifier || 'Customer'}</p>
              <p className="text-xs text-muted-foreground">
                Available credit: {formatCurrency(available, target.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Outstanding debit: {formatCurrency(owed, target.currency)}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Amount ({target.currency})</label>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Reference (optional)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Note for the ledger entry"
                className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={applyToDebt.isPending}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={submit} disabled={applyToDebt.isPending}>
                {applyToDebt.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
