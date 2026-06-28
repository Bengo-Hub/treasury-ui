'use client';

/**
 * LinkedCostsPanel — business-only view of the COSTS linked to an invoice (expenses with
 * invoice_id == this invoice), e.g. the delivery/transport cost recorded as a Freight & Shipping
 * (5500) expense when the invoice was sent. Surfaces what previously hid in the GL only: the
 * business's own delivery cost now shows here AND on the Expenses page, linked to the invoice.
 *
 * INTERNAL ONLY — never rendered on the customer-facing PDF.
 */

import Link from 'next/link';
import { Truck } from 'lucide-react';
import { useExpenses } from '@/hooks/use-expenses';
import { cn } from '@/lib/utils';

interface Props {
  tenant: string;
  invoiceId: string;
  currency?: string;
  className?: string;
}

const fmt = (n: number) =>
  n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusTone: Record<string, string> = {
  approved: 'text-emerald-600 dark:text-emerald-400',
  reimbursed: 'text-emerald-600 dark:text-emerald-400',
  submitted: 'text-amber-600 dark:text-amber-400',
  draft: 'text-muted-foreground',
  rejected: 'text-destructive',
  cancelled: 'text-muted-foreground',
};

export function LinkedCostsPanel({ tenant, invoiceId, currency = 'KES', className }: Props) {
  const { data } = useExpenses(tenant, { invoice_id: invoiceId }, !!tenant && !!invoiceId);
  const expenses = data?.expenses ?? [];
  if (expenses.length === 0) return null;

  const total = expenses.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);

  return (
    <div className={cn('rounded-xl border border-dashed border-border bg-accent/20 overflow-hidden', className)}>
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border bg-accent/30">
        <Truck className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-black text-foreground">Linked Costs</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
          Internal only
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">Delivery &amp; other costs booked against this invoice</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left px-4 py-2 font-bold">Expense #</th>
              <th className="text-left px-3 py-2 font-bold">Description</th>
              <th className="text-right px-3 py-2 font-bold">Amount</th>
              <th className="text-center px-3 py-2 font-bold">Billable</th>
              <th className="text-right px-4 py-2 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2 font-medium text-foreground">
                  <Link href={`/${tenant}/expenses/${e.id}`} className="hover:underline">
                    {e.expense_number}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground truncate max-w-[220px]">{e.description}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {e.currency || currency} {fmt(Number(e.total_amount) || 0)}
                </td>
                <td className="px-3 py-2 text-center">
                  {e.billable ? (
                    <span className="text-[10px] font-bold text-primary">Billable</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </td>
                <td className={cn('px-4 py-2 text-right font-semibold capitalize', statusTone[e.status] ?? 'text-muted-foreground')}>
                  {e.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-border bg-accent/30 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total linked cost</p>
        <p className="text-xs font-black text-foreground tabular-nums">{currency} {fmt(total)}</p>
      </div>
    </div>
  );
}
