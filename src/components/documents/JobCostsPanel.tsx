'use client';

/**
 * JobCostsPanel: what the invoice's sale cost the business and whether that money has left the
 * bank. INTERNAL ONLY, never on the customer PDF. Renders nothing when the invoice has no goods
 * or service cost.
 *
 * Goods: the invoice expensed their costed price. They must have been bought: from stock already
 * held, through the purchase orders raised for this sale, or bought directly here ("Buy goods for
 * this job": paid from a bank against Inventory, the goods received into stock for the sale).
 * Closing the purchasing posts the difference between the actual and the costed price to cost of
 * sales. Services (labour, subcontractors): accrued with the revenue; paid from a bank, or covered
 * by own staff whose wages are already on payroll (the wages are reassigned to the job, no bank
 * movement, so labour is never expensed twice).
 */

import { useMemo, useState } from 'react';
import { Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useCloseInvoiceJobGoods, useInvoiceJobCosts, usePayInvoiceJobCost } from '@/hooks/use-expenses';
import { usePaidFromAccounts } from '@/hooks/use-paid-from-accounts';
import type { JobCostKind, JobGoodsLine } from '@/lib/api/expenses';
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
  const closeGoods = useCloseInvoiceJobGoods(tenant);
  const [paying, setPaying] = useState<'goods' | 'service' | null>(null);
  if (!data) return null;
  const g = data.goods;
  const goods = {
    cost: Number(g.cost), fromStock: Number(g.from_stock), bought: Number(g.bought),
    toBuy: Number(g.to_buy), variance: Number(g.variance),
  };
  const services = {
    accrued: Number(data.services.accrued), paid: Number(data.services.paid),
    ownStaff: Number(data.services.own_staff), outstanding: Number(data.services.outstanding),
  };
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
          <div className="flex items-center gap-2 min-w-28">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold">Goods</span>
            {g.closed && <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded">Closed</span>}
          </div>
          <div className="flex flex-wrap gap-6 text-xs flex-1">
            <Figure label="Cost of goods" value={goods.cost} currency={currency} />
            <Figure label="From stock" value={goods.fromStock} currency={currency} tone="text-sky-600" />
            <Figure label="Bought" value={goods.bought} currency={currency} tone="text-emerald-600" />
            {g.closed
              ? <Figure label={goods.variance >= 0 ? 'Cost over estimate' : 'Saved on estimate'} value={Math.abs(goods.variance)} currency={currency} tone={goods.variance > 0 ? 'text-rose-600' : 'text-emerald-600'} />
              : <Figure label="Still to buy" value={goods.toBuy} currency={currency} tone={goods.toBuy > 0 ? 'text-amber-600' : 'text-muted-foreground'} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {!g.closed && goods.toBuy > 0 && <Button size="sm" onClick={() => setPaying('goods')}>Buy goods for this job</Button>}
            {!g.closed && (
              <Button size="sm" variant="outline" disabled={closeGoods.isPending}
                title="Purchasing for this job is complete: the difference between what the goods actually cost and their costed price goes to cost of sales."
                onClick={() => closeGoods.mutate({ invoiceId, closed: true })}>
                Close purchasing
              </Button>
            )}
            {g.closed && (
              <Button size="sm" variant="ghost" disabled={closeGoods.isPending} onClick={() => closeGoods.mutate({ invoiceId, closed: false })}>
                Reopen
              </Button>
            )}
          </div>
          {!g.closed && ((!g.evaluated && goods.toBuy > 0) || g.po_numbers.length > 0) && (
            <p className="w-full text-[11px] text-muted-foreground">
              {g.po_numbers.length > 0
                ? `Purchase orders raised in inventory: ${g.po_numbers.join(', ')}. Receiving them records the purchase; buying here instead withdraws what you bought from them.`
                : 'Stock on hand not checked yet: every good counts as still to buy until inventory reports.'}
            </p>
          )}
        </div>
      )}

      {services.accrued > 0 && (
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-28">
            <Wrench className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold">Services &amp; labour</span>
          </div>
          <div className="flex flex-wrap gap-6 text-xs flex-1">
            <Figure label="Accrued" value={services.accrued} currency={currency} />
            <Figure label="Paid" value={services.paid} currency={currency} tone="text-emerald-600" />
            {services.ownStaff > 0 && <Figure label="Own staff" value={services.ownStaff} currency={currency} tone="text-sky-600" />}
            <Figure label="Outstanding" value={services.outstanding} currency={currency} tone={services.outstanding > 0 ? 'text-amber-600' : 'text-muted-foreground'} />
          </div>
          {services.outstanding > 0 && (
            <Button size="sm" variant="outline" onClick={() => setPaying('service')}>Settle service cost</Button>
          )}
        </div>
      )}

      {paying === 'goods' && (
        <BuyGoodsModal tenant={tenant} invoiceId={invoiceId} currency={currency} toBuy={goods.toBuy}
          lines={g.to_buy_lines} invoiceNumber={invoiceNumber} onClose={() => setPaying(null)} />
      )}
      {paying === 'service' && (
        <SettleServiceModal tenant={tenant} invoiceId={invoiceId} currency={currency} outstanding={services.outstanding}
          invoiceNumber={invoiceNumber} onClose={() => setPaying(null)} />
      )}
    </div>
  );
}

const inputCls = 'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none';

/** Paid-from account + date fields shared by both payment modals. */
function PaymentFields({ tenant, accountId, setAccountId, paidAtLocal, setPaidAtLocal }: {
  tenant: string; accountId: string; setAccountId: (v: string) => void; paidAtLocal: string; setPaidAtLocal: (v: string) => void;
}) {
  const { options, defaultAccountId } = usePaidFromAccounts(tenant);
  return (
    <>
      <FormField label="Paid from account" required description="The bank or cash account the money left.">
        <Combobox
          options={options}
          value={accountId || defaultAccountId}
          onChange={(v) => setAccountId(v ?? '')}
          placeholder={options.length ? 'Select bank / cash account' : 'No bank or cash accounts yet'}
          searchPlaceholder="Search accounts…"
          emptyText="No matching accounts"
        />
      </FormField>
      <FormField label="Payment date & time">
        <input type="datetime-local" value={paidAtLocal} max={nowDatetimeLocal()} onChange={(e) => setPaidAtLocal(e.target.value)} className={inputCls} />
      </FormField>
    </>
  );
}

function BuyGoodsModal({ tenant, invoiceId, currency, toBuy, lines, invoiceNumber, onClose }: {
  tenant: string; invoiceId: string; currency: string; toBuy: number; lines: JobGoodsLine[]; invoiceNumber?: string; onClose: () => void;
}) {
  const { defaultAccountId } = usePaidFromAccounts(tenant);
  const pay = usePayInvoiceJobCost(tenant);
  const [rows, setRows] = useState(() => lines.map((l) => ({ ...l, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) })));
  const costed = useMemo(() => rows.reduce((s, r) => s + r.quantity * r.unit_cost, 0), [rows]);
  const [amountEdited, setAmountEdited] = useState<string | null>(null);
  // Defaults to the lines' costed value (else what is still to buy) until the user types an amount.
  const amount = amountEdited ?? String(Math.round((costed || toBuy) * 100) / 100);
  const [complete, setComplete] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [paidAtLocal, setPaidAtLocal] = useState(nowDatetimeLocal());
  const effective = accountId || defaultAccountId;
  const value = Number(amount);
  const valid = !!effective && value > 0 && (complete || value <= toBuy);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-foreground">Buy goods for this job</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Still to buy {formatCurrency(toBuy, currency)}. The purchase is paid from the account below and the goods are
              received into stock for this sale, so the bank falls now and the job&apos;s profit is real.
            </p>
          </div>
          {rows.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-accent/40 text-muted-foreground">
                  <tr><th className="text-left px-2 py-1.5">Item</th><th className="px-2 py-1.5 w-20">Qty</th><th className="px-2 py-1.5 w-28 text-right">Unit cost</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.item_id ?? r.sku ?? r.description}-${i}`} className="border-t border-border">
                      <td className="px-2 py-1.5 truncate max-w-56">{r.description.split('\n')[0]}</td>
                      <td className="px-2 py-1">
                        <input type="number" min={0} step="any" value={r.quantity}
                          onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))}
                          className="w-full bg-transparent border border-border rounded px-1.5 py-1 text-right" />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" min={0} step="0.01" value={r.unit_cost}
                          onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, unit_cost: Number(e.target.value) } : x)))}
                          className="w-full bg-transparent border border-border rounded px-1.5 py-1 text-right" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <FormField label="Amount paid" required description={complete ? 'What the goods actually cost; any difference from the estimate goes to cost of sales.' : 'Up to what is still to buy.'}>
            <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmountEdited(e.target.value)} className={inputCls} />
          </FormField>
          <PaymentFields tenant={tenant} accountId={accountId} setAccountId={setAccountId} paidAtLocal={paidAtLocal} setPaidAtLocal={setPaidAtLocal} />
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} className="mt-0.5" />
            <span>This completes the purchasing for this job (close it and post any price difference).</span>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={pay.isPending}>Cancel</Button>
            <Button size="sm" disabled={!valid || pay.isPending}
              onClick={() => pay.mutate({
                invoiceId, kind: 'goods', amount: value, paid_from_account_id: effective,
                paid_at: datetimeLocalToISO(paidAtLocal), description: `Goods bought for ${invoiceNumber ?? 'the job'}`,
                lines: rows.filter((r) => r.quantity > 0), close_after_pay: complete,
              }, { onSuccess: onClose })}>
              {pay.isPending ? 'Posting…' : 'Record purchase'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettleServiceModal({ tenant, invoiceId, currency, outstanding, invoiceNumber, onClose }: {
  tenant: string; invoiceId: string; currency: string; outstanding: number; invoiceNumber?: string; onClose: () => void;
}) {
  const { defaultAccountId } = usePaidFromAccounts(tenant);
  const pay = usePayInvoiceJobCost(tenant);
  const [mode, setMode] = useState<'bank' | 'staff'>('bank');
  const [amount, setAmount] = useState(String(outstanding));
  const [accountId, setAccountId] = useState('');
  const [paidAtLocal, setPaidAtLocal] = useState(nowDatetimeLocal());
  const effective = accountId || defaultAccountId;
  const value = Number(amount);
  const valid = value > 0 && value <= outstanding && (mode === 'staff' || !!effective);
  const kind: JobCostKind = mode === 'staff' ? 'service_own_staff' : 'service';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-foreground">Settle service cost</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Outstanding {formatCurrency(outstanding, currency)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([['bank', 'Paid out', 'Casual labour, a subcontractor or a supplier, paid from a bank or cash account.'],
              ['staff', 'Own staff', 'Done by employees already paid through payroll: their wages are reassigned to this job, no money moves.']] as const)
              .map(([m, label, hint]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={cn('rounded-lg border p-2.5 text-left transition-colors', mode === m ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/40')}>
                  <p className="text-xs font-bold">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
                </button>
              ))}
          </div>
          <FormField label="Amount" required description="Up to the outstanding service cost.">
            <input type="number" min={0} max={outstanding} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </FormField>
          {mode === 'bank' && (
            <PaymentFields tenant={tenant} accountId={accountId} setAccountId={setAccountId} paidAtLocal={paidAtLocal} setPaidAtLocal={setPaidAtLocal} />
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} disabled={pay.isPending}>Cancel</Button>
            <Button size="sm" disabled={!valid || pay.isPending}
              onClick={() => pay.mutate({
                invoiceId, kind, amount: value,
                ...(mode === 'bank' ? { paid_from_account_id: effective, paid_at: datetimeLocalToISO(paidAtLocal) } : {}),
                description: `${mode === 'staff' ? 'Own staff labour' : 'Service cost'} for ${invoiceNumber ?? 'the job'}`,
              }, { onSuccess: onClose })}>
              {pay.isPending ? 'Posting…' : mode === 'staff' ? 'Cover with own staff' : 'Pay'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
