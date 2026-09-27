'use client';

/**
 * ServiceCostPanel: the invoice's service cost (its SERVICE / VOUCHER line costs), accrued with the
 * revenue at issuance (Dr 5410 Cost of Services / Cr 2150 Accrued Service Costs). Shows what was
 * accrued, paid and still owed, and "Pay service cost" records paying it from a real bank or cash
 * account: a linked expense against the accrual, so the bank falls and the cost is never expensed
 * twice. INTERNAL ONLY, never on the customer PDF. Renders nothing when the invoice has no service
 * cost.
 */

import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useInvoiceServiceCost, usePayInvoiceServiceCost } from '@/hooks/use-expenses';
import { usePaidFromAccounts } from '@/hooks/use-paid-from-accounts';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { nowDatetimeLocal, datetimeLocalToISO } from '@bengo-hub/shared-ui-lib/payments';

interface Props {
  tenant: string;
  invoiceId: string;
  invoiceNumber?: string;
  currency?: string;
  className?: string;
}

export function ServiceCostPanel({ tenant, invoiceId, invoiceNumber, currency = 'KES', className }: Props) {
  const { data } = useInvoiceServiceCost(tenant, invoiceId);
  const [open, setOpen] = useState(false);
  const accrued = Number(data?.accrued ?? 0);
  if (!data || accrued <= 0) return null;
  const paid = Number(data.paid);
  const outstanding = Number(data.outstanding);

  return (
    <div className={cn('rounded-xl border border-dashed border-border bg-accent/20 overflow-hidden', className)}>
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border bg-accent/30">
        <Wrench className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-black text-foreground">Service Cost</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
          Internal only
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">Accrued with the revenue; the bank falls when you pay it</span>
      </div>
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-6 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Accrued</p>
            <p className="font-black tabular-nums">{formatCurrency(accrued, currency)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Paid</p>
            <p className="font-black tabular-nums text-emerald-600">{formatCurrency(paid, currency)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Outstanding</p>
            <p className={cn('font-black tabular-nums', outstanding > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
              {formatCurrency(outstanding, currency)}
            </p>
          </div>
        </div>
        {outstanding > 0 && (
          <Button size="sm" onClick={() => setOpen(true)}>Pay service cost</Button>
        )}
      </div>
      {open && (
        <PayServiceCostModal
          tenant={tenant}
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          currency={currency}
          outstanding={outstanding}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function PayServiceCostModal({ tenant, invoiceId, invoiceNumber, currency, outstanding, onClose }: {
  tenant: string;
  invoiceId: string;
  invoiceNumber?: string;
  currency: string;
  outstanding: number;
  onClose: () => void;
}) {
  const { options, defaultAccountId } = usePaidFromAccounts(tenant);
  const pay = usePayInvoiceServiceCost(tenant);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState(String(outstanding));
  const [paidAtLocal, setPaidAtLocal] = useState(nowDatetimeLocal());
  const [description, setDescription] = useState(invoiceNumber ? `Service cost for ${invoiceNumber}` : 'Service cost');
  const effective = accountId || defaultAccountId;
  const value = Number(amount);
  const valid = !!effective && value > 0 && value <= outstanding;
  const input = 'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-foreground">Pay service cost</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Outstanding {formatCurrency(outstanding, currency)}</p>
          </div>
          <FormField label="Amount" required description="Up to the outstanding service cost.">
            <input type="number" min={0} max={outstanding} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} />
          </FormField>
          <FormField label="Paid from account" required description="The bank or cash account the money left.">
            <Combobox
              options={options}
              value={effective}
              onChange={(v) => setAccountId(v ?? '')}
              placeholder={options.length ? 'Select bank / cash account' : 'No bank or cash accounts yet'}
              searchPlaceholder="Search accounts…"
              emptyText="No matching accounts"
            />
          </FormField>
          <FormField label="Payment date & time">
            <input type="datetime-local" value={paidAtLocal} max={nowDatetimeLocal()} onChange={(e) => setPaidAtLocal(e.target.value)} className={input} />
          </FormField>
          <FormField label="Description">
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={pay.isPending}>Cancel</Button>
            <Button
              size="sm"
              disabled={!valid || pay.isPending}
              onClick={() =>
                pay.mutate(
                  { invoiceId, amount: value, paid_from_account_id: effective, paid_at: datetimeLocalToISO(paidAtLocal), description },
                  { onSuccess: onClose },
                )
              }
            >
              {pay.isPending ? 'Posting…' : 'Pay'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
