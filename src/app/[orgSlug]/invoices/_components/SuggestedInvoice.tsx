'use client';

import { useInvoices } from '@/hooks/use-invoices';
import { Lightbulb, FileText, ArrowRight, Loader2 } from 'lucide-react';

interface SuggestedInvoiceProps {
  effectiveTenant: string;
  onCreateFromSuggestion?: (customerId: string) => void;
}

export function SuggestedInvoice({ effectiveTenant, onCreateFromSuggestion }: SuggestedInvoiceProps) {
  // Show invoices that are overdue — these customers need a follow-up / new invoice
  const { data, isLoading } = useInvoices(
    effectiveTenant,
    { status: 'overdue', limit: 10, page: 1 },
    !!effectiveTenant,
  );

  const overdue = data?.invoices ?? [];

  if (!effectiveTenant) return null;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <Lightbulb className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Suggested Invoices</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customers with overdue invoices who may need a new invoice or follow-up.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading suggestions…
        </div>
      )}

      {!isLoading && overdue.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-accent/30 px-6 py-10 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No suggestions right now</p>
          <p className="text-xs text-muted-foreground mt-1">
            Suggestions appear when customers have overdue or unpaid invoices.
          </p>
        </div>
      )}

      {!isLoading && overdue.length > 0 && (
        <div className="space-y-2">
          {overdue.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {inv.customer_name || 'Unknown Customer'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {inv.invoice_number} · overdue since {new Date(inv.due_date ?? inv.invoice_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onCreateFromSuggestion?.(inv.customer_id ?? '')}
                className="shrink-0 ml-3 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                Create Invoice <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
