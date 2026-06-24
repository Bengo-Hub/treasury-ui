'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/base';
import { useVendorStatement, useCustomerStatement } from '@/hooks/use-arpa';
import type { StatementLine } from '@/lib/api/arpa';
import { formatCurrency } from '@/lib/utils/currency';
import { Loader2 } from 'lucide-react';

interface BaseProps {
  open: boolean;
  onClose: () => void;
  tenant: string;
  /** The CRM contact / vendor UUID used by the statement endpoint. */
  entityId: string;
  /** Display name shown in the dialog header. */
  name?: string;
}

type StatementDialogProps =
  | (BaseProps & { kind: 'vendor' })
  | (BaseProps & { kind: 'customer' });

const num = (v?: string) => (v ? parseFloat(v) || 0 : 0);

/**
 * StatementDialog renders an AR (customer) or AP (vendor) period statement:
 * opening balance, the dated transaction lines with running balance, and the
 * closing balance. Defaults to the backend's last-90-days window.
 */
export function StatementDialog(props: StatementDialogProps) {
  const { open, onClose, tenant, entityId, name, kind } = props;

  const vendorQuery = useVendorStatement(
    tenant,
    entityId,
    undefined,
    open && kind === 'vendor',
  );
  const customerQuery = useCustomerStatement(
    tenant,
    entityId,
    undefined,
    open && kind === 'customer',
  );

  const isVendor = kind === 'vendor';
  const query = isVendor ? vendorQuery : customerQuery;
  const { data, isLoading, isError } = query;

  const lines: StatementLine[] = data?.lines ?? [];
  const closingBalance = num(data?.closing_balance);
  // Statement DTOs carry no currency field; treasury defaults to KES.
  const currency = 'KES';

  // Opening balance = closing balance minus the net movement of all lines in the period.
  const netMovement = lines.reduce(
    (sum, l) => sum + num(l.debit) - num(l.credit),
    0,
  );
  const openingBalance = closingBalance - netMovement;

  const heading = isVendor ? 'Vendor Statement' : 'Customer Statement';
  const total = isVendor
    ? num((data as { total_billed?: string } | undefined)?.total_billed)
    : num((data as { total_invoiced?: string } | undefined)?.total_invoiced);
  const totalLabel = isVendor ? 'Total billed' : 'Total invoiced';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={heading}
        description={name || data?.from ? `${name ?? ''}` : undefined}
        onClose={onClose}
        className="max-w-2xl"
      >
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading statement...
          </div>
        )}

        {!isLoading && isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load the statement. Please try again.
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="space-y-4">
            {/* Period + summary strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-accent/5 px-3 py-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Opening</p>
                <p className="text-sm font-bold tabular-nums">{formatCurrency(openingBalance, currency)}</p>
              </div>
              <div className="rounded-lg border border-border bg-accent/5 px-3 py-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{totalLabel}</p>
                <p className="text-sm font-bold tabular-nums">{formatCurrency(total, currency)}</p>
              </div>
              <div className="rounded-lg border border-border bg-primary/5 px-3 py-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Closing</p>
                <p className="text-sm font-bold tabular-nums text-primary">{formatCurrency(closingBalance, currency)}</p>
              </div>
              <div className="rounded-lg border border-border bg-accent/5 px-3 py-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Lines</p>
                <p className="text-sm font-bold tabular-nums">{lines.length}</p>
              </div>
            </div>

            {data.from && data.to && (
              <p className="text-xs text-muted-foreground">
                Period: {new Date(data.from).toLocaleDateString()} – {new Date(data.to).toLocaleDateString()}
              </p>
            )}

            {/* Transaction lines */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Reference</th>
                    <th className="text-right px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Debit</th>
                    <th className="text-right px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Credit</th>
                    <th className="text-right px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Balance</th>
                    <th className="text-center px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((l, i) => (
                    <tr key={`${l.reference}-${i}`} className="hover:bg-accent/5 transition-colors">
                      <td className="px-3 py-2 text-xs whitespace-nowrap">{new Date(l.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-xs font-mono">{l.reference || '—'}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">{num(l.debit) ? formatCurrency(num(l.debit), currency) : '—'}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">{num(l.credit) ? formatCurrency(num(l.credit), currency) : '—'}</td>
                      <td className="px-3 py-2 text-right text-xs font-bold tabular-nums">{formatCurrency(num(l.balance), currency)}</td>
                      <td className="px-3 py-2 text-center">
                        {l.status ? <Badge variant="outline">{l.status}</Badge> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lines.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No transactions in this period.
                </div>
              )}
            </div>

            {/* Closing footer */}
            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3 font-bold border border-primary/20">
              <span className="text-sm uppercase tracking-tight">Closing Balance</span>
              <span className="text-lg tabular-nums">{formatCurrency(closingBalance, currency)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
