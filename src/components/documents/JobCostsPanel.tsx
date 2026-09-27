'use client';

/**
 * JobCostsPanel: what the invoice's sale cost the business and whether that money has left the
 * bank. INTERNAL ONLY, never on the customer PDF. Renders nothing when the invoice has no goods
 * or service cost.
 *
 * Goods: the invoice expensed their cost (COGS). They must have been bought: from stock already
 * held, through the purchase orders raised for this sale, or bought directly here ("Buy goods for
 * this job" pays them from a bank against Inventory). What is left is still to buy.
 * Services: SERVICE / VOUCHER line costs are accrued with the revenue; "Pay service cost" pays
 * them from a bank against the accrual, so the cost is never expensed twice.
 */

import { useState } from 'react';
import { Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useInvoiceJobCosts, usePayInvoiceJobCost } from '@/hooks/use-expenses';
import { usePaidFromAccounts } from '@/hooks/use-paid-from-accounts';
import type { JobCostKind } from '@/lib/api/expenses';
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

function Figure({ label, value, currency, tone }: { label: string; value: number; currency: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('font-black tabular-nums', tone)}>{formatCurrency(value, currency)}</p>
    </div>
  );
}

export function JobCostsPanel({ tenant, invoiceId, invoiceNumber, currency = 'KES', className }: Props) {
  const { data } = useInvoiceJobCosts(tenant, invoiceId);
  const [paying, setPaying] = useState<JobCostKind | null>(null);
  if (!data) return null;
  const goods = {
    cost: Number(data.goods.cost), fromStock: Number(data.goods.from_stock),
    bought: Number(data.goods.bought), toBuy: Number(data.goods.to_buy),
  };
  const services = { accrued: Number(data.services.accrued), paid: Number(data.services.paid), outstanding: Number(data.services.outstanding) };
  if (goods.cost <= 0 && services.accrued <= 0) return null;

  return (
    <div className={cn('rounded-xl border border-dashed border-border bg-accent/20 overflow-hidden', className)}>
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-2 border-b border-border bg-accent/30">
        <span className="text-xs font-black text-foreground">Job Costs</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          Internal only
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">The bank falls when the goods are bought and the costs paid</span>
      </div>

      {goods.cost > 0 && (
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 last:border-b-0">
          <div className="flex items-center gap-2 min-w-[7rem]">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold">Goods</span>
          </div>
          <div className="flex flex-wrap gap-6 text-xs flex-1">
            <Figure label="Cost of goods" value={goods.cost} currency={currency} />
            <Figure label="From stock" value={goods.fromStock} currency={currency} tone="text-sky-600" />
            <Figure label="Bought" value={goods.bought} currency={currency} tone="text-emerald-600" />
            <Figure label="Still to buy" value={goods.toBuy} currency={currency} tone={goods.toBuy > 0 ? 'text-amber-600' : 'text-muted-foreground'} />
          </div>
          {goods.toBuy > 0 && (
            <Button size="sm" onClick={() => setPaying('goods')}>Buy goods for this job</Button>
          )}
          {(!data.goods.evaluated || data.goods.po_numbers.length > 0) && (
            <p className="w-full text-[11px] text-muted-foreground">
              {data.goods.po_numbers.length > 0
                ? `Purchase orders raised in inventory: ${data.goods.po_numbers.join(', ')}. Receiving them records the purchase; buying here instead cancels the drafts.`
                : 'Stock on hand not checked yet: every good counts as still to buy until inventory reports.'}
            </p>
          )}
        </div>
      )}

      {services.accrued > 0 && (
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-[7rem]">
            <Wrench className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold">Services</span>
          </div>
          <div className="flex flex-wrap gap-6 text-xs flex-1">
            <Figure label="Accrued" value={services.accrued} currency={currency} />
            <Figure label="Paid" value={services.paid} currency={currency} tone="text-emerald-600" />
            <Figure label="Outstanding" value={services.outstanding} currency={currency} tone={services.outstanding > 0 ? 'text-amber-600' : 'text-muted-foreground'} />
          </div>
          {services.outstanding > 0 && (
            <Button size="sm" variant="outline" onClick={() => setPaying('service')}>Pay service cost</Button>
          )}
        </div>
      )}

      {paying && (
        <PayJobCostModal
          tenant={tenant}
          invoiceId={invoiceId}
          kind={paying}
          currency={currency}
          unpaid={paying === 'goods' ? goods.toBuy : services.outstanding}
          defaultDescription={`${paying === 'goods' ? 'Goods bought for' : 'Service cost for'} ${invoiceNumber ?? 'this job'}`}
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  );
}

function PayJobCostModal({ tenant, invoiceId, kind, currency, unpaid, defaultDescription, onClose }: {
  tenant: string;
  invoiceId: string;
  kind: JobCostKind;
  currency: string;
  unpaid: number;
  defaultDescription: string;
  onClose: () => void;
}) {
  const { options, defaultAccountId } = usePaidFromAccounts(tenant);
  const pay = usePayInvoiceJobCost(tenant);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState(String(unpaid));
  const [paidAtLocal, setPaidAtLocal] = useState(nowDatetimeLocal());
  const [description, setDescription] = useState(defaultDescription);
  const effective = accountId || defaultAccountId;
  const value = Number(amount);
  const valid = !!effective && value > 0 && value <= unpaid;
  const input = 'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none';
  const goods = kind === 'goods';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-foreground">{goods ? 'Buy goods for this job' : 'Pay service cost'}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {goods
                ? `Still to buy ${formatCurrency(unpaid, currency)}. Records the purchase paid from the account below, so the bank falls now and the job's profit is real.`
                : `Outstanding ${formatCurrency(unpaid, currency)}`}
            </p>
          </div>
          <FormField label="Amount" required description={goods ? 'Up to what is still to buy.' : 'Up to the outstanding service cost.'}>
            <input type="number" min={0} max={unpaid} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} />
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
                  { invoiceId, kind, amount: value, paid_from_account_id: effective, paid_at: datetimeLocalToISO(paidAtLocal), description },
                  { onSuccess: onClose },
                )
              }
            >
              {pay.isPending ? 'Posting…' : goods ? 'Record purchase' : 'Pay'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
