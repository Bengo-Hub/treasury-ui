'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useSetCustomerCreditTerms } from '@/hooks/use-invoices';
import { formatCurrency } from '@/lib/utils/currency';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface CreditTermsDialogProps {
  tenant: string;
  /** crm_contact_id (or customer_identifier for non-CRM rows) — same key the payment route uses. */
  contactId: string;
  customerName: string;
  currency?: string;
  currentLimit?: number | null;
  currentPeriodDays?: number | null;
  onClose: () => void;
}

/**
 * Modal to set/clear a customer's credit terms (PATCH /ar/customers/{contactID}/credit-terms
 * via useSetCustomerCreditTerms): credit limit (max on-account exposure) and payment period
 * (days until a credit sale falls due). This is the CENTRAL credit-terms editor — POS credit
 * sales read these terms via the treasury S2S credit-terms endpoint, so what is set here
 * governs checkout credit gating everywhere. Zero/empty clears the respective term.
 */
export function CreditTermsDialog({ tenant, contactId, customerName, currency = 'KES', currentLimit, currentPeriodDays, onClose }: CreditTermsDialogProps) {
  const setTerms = useSetCustomerCreditTerms(tenant);
  const [limit, setLimit] = useState(currentLimit && currentLimit > 0 ? String(currentLimit) : '');
  const [periodDays, setPeriodDays] = useState(currentPeriodDays && currentPeriodDays > 0 ? String(currentPeriodDays) : '');
  const [error, setError] = useState('');

  const submit = () => {
    const lim = limit.trim() === '' ? 0 : parseFloat(limit);
    const days = periodDays.trim() === '' ? 0 : parseInt(periodDays, 10);
    if (Number.isNaN(lim) || lim < 0 || Number.isNaN(days) || days < 0) {
      setError('Enter valid non-negative values (empty or 0 clears a term).');
      return;
    }
    setTerms.mutate(
      { contactId, creditLimit: lim, creditPeriodDays: days, customerName },
      {
        onSuccess: () => {
          toast.success(`Credit terms updated for ${customerName}`);
          onClose();
        },
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Failed to update credit terms.'),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !setTerms.isPending && onClose()}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <h3 className="text-base font-bold">Credit terms</h3>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={setTerms.isPending}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-accent/20 px-3 py-2 text-sm">
              <p className="font-semibold">{customerName}</p>
              <p className="text-xs text-muted-foreground">
                {currentLimit && currentLimit > 0
                  ? `Current limit: ${formatCurrency(currentLimit, currency)}`
                  : 'No credit limit set'}
                {currentPeriodDays && currentPeriodDays > 0 ? ` · due in ${currentPeriodDays} days` : ''}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Credit limit ({currency})</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="0 = no limit"
                className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Payment period (days)</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                placeholder="e.g. 30 — stamps the due date on credit sales"
                className="w-full mt-1 bg-accent/30 border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={setTerms.isPending}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={submit} disabled={setTerms.isPending}>
                {setTerms.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save terms
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
