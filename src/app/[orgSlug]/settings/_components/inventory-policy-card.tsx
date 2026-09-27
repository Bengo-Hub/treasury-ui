'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { useInventoryPolicy, useUpdateInventoryPolicy } from '@/hooks/use-settings';
import type { StockOutOn } from '@/lib/api/settings';
import { cn } from '@/lib/utils';
import { Loader2, Truck } from 'lucide-react';
import { toast } from 'sonner';

const OPTIONS: { value: StockOutOn; label: string; hint: string }[] = [
  {
    value: 'invoice',
    label: 'When the invoice is issued (default)',
    hint: 'Counter and same-day sales. Goods leave stock with the invoice whether or not a delivery note follows. A delivery note sent before the invoice (e.g. from a sales order) takes its own goods out and the invoice takes the rest.',
  },
  {
    value: 'delivery',
    label: 'When a delivery note is dispatched',
    hint: 'Businesses that invoice ahead of, or apart from, delivery. Stock moves only on dispatch; goods invoiced but not yet delivered wait in Goods Delivered Not Invoiced.',
  },
];

/**
 * InventoryPolicyCard sets when sold goods leave stock. Either way the invoice carries the cost of
 * sales in the period of the sale; the difference in timing sits in account 1510 Goods Delivered
 * Not Invoiced until the sale is both invoiced and delivered.
 */
export function InventoryPolicyCard({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading } = useInventoryPolicy(tenantSlug);
  const update = useUpdateInventoryPolicy(tenantSlug);
  const current = data?.stock_out_on ?? 'invoice';

  const choose = (value: StockOutOn) => {
    if (value === current) return;
    update.mutate(
      { stock_out_on: value },
      {
        onSuccess: () => toast.success('Stock policy saved. It applies to documents issued or dispatched from now on.'),
        onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to save the stock policy'),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="border-b border-border/50 py-4">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">When sold goods leave stock</h3>
          {(isLoading || update.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="p-6 grid gap-3 md:grid-cols-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={update.isPending}
            onClick={() => choose(o.value)}
            aria-pressed={current === o.value}
            className={cn(
              'rounded-xl border p-4 text-left transition-colors',
              current === o.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/40',
            )}
          >
            <p className="text-sm font-semibold">{o.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{o.hint}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
