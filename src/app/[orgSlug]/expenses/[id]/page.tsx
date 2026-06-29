'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useExpense } from '@/hooks/use-expenses';
import { formatCurrency } from '@/lib/utils/currency';
import { ArrowLeft, ExternalLink, Loader2, Pencil } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  submitted: 'default',
  approved: 'success',
  rejected: 'error',
  reimbursed: 'success',
  cancelled: 'outline',
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground sm:text-right">{children}</span>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return '---';
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? '---' : parsed.toLocaleDateString();
}

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const expenseId = (params?.id as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data: expense, isLoading, error } = useExpense(effectiveTenant, expenseId, !!effectiveTenant);

  const back = () => router.push(`/${orgSlug}/expenses`);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={back}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {expense?.expense_number ?? 'Expense'}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Read-only expense detail.</p>
          </div>
        </div>
        {expense?.status === 'draft' && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push(`/${orgSlug}/expenses/${expense.id}/edit`)}
          >
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading expense...
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load this expense. It may not exist or you may not have access.
        </div>
      )}

      {expense && !isLoading && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <h3 className="font-bold text-sm uppercase tracking-tight">Details</h3>
            <Badge variant={statusVariant[expense.status] ?? 'outline'}>{expense.status}</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <Row label="Description">{expense.description || '---'}</Row>
            <Row label="Category">{expense.category_name || '---'}</Row>
            <Row label="Amount">
              {formatCurrency(Number(expense.amount), expense.currency)}
            </Row>
            <Row label="Tax">
              {formatCurrency(Number(expense.tax_amount), expense.currency)}
            </Row>
            <Row label="Total">
              <span className="font-bold tabular-nums">
                {formatCurrency(Number(expense.total_amount), expense.currency)}
              </span>
            </Row>
            <Row label="Currency">{expense.currency}</Row>
            <Row label="Expense Date">{fmtDate(expense.expense_date)}</Row>
            <Row label="Billable">
              {expense.billable ? (expense.billed ? 'Billed' : 'Billable') : 'No'}
            </Row>
            {expense.invoice_id && (
              <Row label="Linked Invoice">
                <button
                  type="button"
                  onClick={() => router.push(`/${orgSlug}/invoices/${expense.invoice_id}`)}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  View invoice <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </Row>
            )}
            {expense.rejection_reason && (
              <Row label="Rejection Reason">
                <span className="text-destructive">{expense.rejection_reason}</span>
              </Row>
            )}
            {expense.receipt_url && (
              <Row label="Receipt">
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  Open receipt <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Row>
            )}
            <Row label="Created">{fmtDate(expense.created_at)}</Row>

            {expense.metadata && Object.keys(expense.metadata).length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-accent/5 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Metadata
                </p>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {Object.entries(expense.metadata).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 text-xs">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium text-foreground truncate">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
