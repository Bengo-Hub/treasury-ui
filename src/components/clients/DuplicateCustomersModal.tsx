'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { useDuplicateCustomerBalances, useReconcileCustomerBalances } from '@/hooks/use-invoices';
import { formatCurrency } from '@/lib/utils/currency';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { DuplicateCustomerGroup, DuplicateCustomerRow } from '@/lib/api/invoices';

interface DuplicateCustomersModalProps {
  tenant: string;
  open: boolean;
  onClose: () => void;
}

/**
 * DuplicateCustomersModal — reusable "why are these customers duplicated?" review surface for the
 * Customers page banner. Fetches GET /ar/customers/duplicates (the SAME grouping/ambiguity logic
 * treasury-api's actual merge uses, see arpa.analyzeCustomerGroup) so a group's `mergeable` flag
 * here always matches what clicking "Merge duplicates" actually does — no separate client-side
 * duplicate-detection heuristic to drift out of sync with the backend.
 *
 * Kept generic (tenant + open/onClose only, fetches its own data) so it can be dropped in
 * anywhere a duplicate-AR-row review is useful, not just this one banner.
 */
export function DuplicateCustomersModal({ tenant, open, onClose }: DuplicateCustomersModalProps) {
  const { data: groups = [], isLoading, isFetching, refetch } = useDuplicateCustomerBalances(tenant, open);
  const reconcile = useReconcileCustomerBalances(tenant);

  const mergeableCount = groups.filter((g) => g.mergeable).length;

  const handleMergeAll = () => {
    reconcile.mutate(false, {
      onSuccess: (r) => {
        toast.success(
          r.rows_merged > 0
            ? `Merged ${r.rows_merged} duplicate customer record${r.rows_merged === 1 ? '' : 's'}`
            : 'No duplicates to merge',
        );
        void refetch();
      },
      onError: () => toast.error('Failed to merge duplicate customers. Please try again.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Duplicate customers"
        description="The same customer appearing as more than one AR row, and why."
        onClose={onClose}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Checking for duplicates…
            </div>
          ) : groups.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-6 text-sm text-emerald-700 dark:text-emerald-300 justify-center">
              <CheckCircle2 className="h-5 w-5" /> No duplicate customer records found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {groups.map((g) => (
                <DuplicateGroupCard key={g.customer_name} group={g} tenantCurrency={g.rows[0]?.currency} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => void refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={reconcile.isPending}>
                Close
              </Button>
              <Button
                onClick={handleMergeAll}
                disabled={reconcile.isPending || mergeableCount === 0}
                className="gap-2"
                title={mergeableCount === 0 ? 'No group here is safely mergeable yet' : undefined}
              >
                {reconcile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Merge {mergeableCount > 0 ? mergeableCount : ''} duplicate{mergeableCount === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DuplicateGroupCard({ group, tenantCurrency }: { group: DuplicateCustomerGroup; tenantCurrency?: string }) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 ${group.mergeable ? 'border-border bg-accent/10' : 'border-amber-500/40 bg-amber-500/10'}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-semibold text-sm">{group.customer_name}</p>
        {group.mergeable ? (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Safe to merge
          </span>
        ) : (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Needs review
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{group.reason}</p>
      <div className="space-y-1">
        {group.rows.map((r) => (
          <DuplicateRowLine key={r.id} row={r} currency={tenantCurrency} />
        ))}
      </div>
    </div>
  );
}

function DuplicateRowLine({ row, currency }: { row: DuplicateCustomerRow; currency?: string }) {
  const key = row.crm_contact_id
    ? 'Linked to CRM contact'
    : row.customer_identifier
      ? `Identifier: ${row.customer_identifier}`
      : 'No key';
  const balance = parseFloat(row.balance_due) || 0;
  return (
    <div className="flex items-center justify-between gap-2 text-xs rounded bg-background/60 px-2 py-1.5">
      <span className="text-muted-foreground">{key}</span>
      <span className="tabular-nums">{formatCurrency(balance, currency ?? row.currency)}</span>
      <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>
    </div>
  );
}
