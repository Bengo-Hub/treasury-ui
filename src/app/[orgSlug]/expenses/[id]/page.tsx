'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { EditExpenseModal } from '@/components/expenses/EditExpenseModal';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useExpense } from '@/hooks/use-expenses';
import { formatCurrency } from '@/lib/utils/currency';
import { ArrowLeft, ExternalLink, Loader2, Pencil } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary'> = {
  draft: 'secondary',
  submitted: 'default',
  approved: 'success',
  rejected: 'error',
  reimbursed: 'success',
  paid: 'success',
  cancelled: 'outline',
};

/** One labelled value in the details grid. */
function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground break-words">{children}</dd>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

const metaString = (meta: Record<string, unknown> | undefined, ...keys: string[]) => {
  for (const k of keys) {
    const v = meta?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const expenseId = (params?.id as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data: expense, isLoading, error } = useExpense(effectiveTenant, expenseId, !!effectiveTenant);
  // ?edit=1 (the old /edit route redirects here) opens the edit modal straight away.
  const [editOpen, setEditOpen] = useState(searchParams?.get('edit') === '1');

  const back = () => router.push(`/${orgSlug}/expenses`);
  const meta = expense?.metadata as Record<string, unknown> | undefined;
  const vendorName = metaString(meta, 'vendor_name', 'supplier_name');
  const vendorPin = metaString(meta, 'supplier_kra_pin', 'supplier_pin', 'vendor_kra_pin');
  const vendorEmail = metaString(meta, 'vendor_email');
  const isDraft = expense?.status === 'draft';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={back}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">{expense?.expense_number ?? 'Expense'}</h1>
              {expense && <Badge variant={statusVariant[expense.status] ?? 'outline'}>{expense.status}</Badge>}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5 truncate">{expense?.description || 'Expense detail'}</p>
          </div>
        </div>
        {isDraft && (
          <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
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
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="py-4">
              <h3 className="font-bold text-sm uppercase tracking-tight">Details</h3>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Description" className="sm:col-span-2 xl:col-span-3">{expense.description || '—'}</Field>
                <Field label="Category">{expense.category_name || '—'}</Field>
                <Field label="Expense Date">{fmtDate(expense.expense_date)}</Field>
                <Field label="Currency">{expense.currency}</Field>
                <Field label="Amount">{formatCurrency(Number(expense.amount), expense.currency)}</Field>
                <Field label="Tax">{formatCurrency(Number(expense.tax_amount), expense.currency)}</Field>
                <Field label="Total">
                  <span className="font-bold tabular-nums">{formatCurrency(Number(expense.total_amount), expense.currency)}</span>
                </Field>
                <Field label="Billable">{expense.billable ? (expense.billed ? 'Billed' : 'Billable') : 'No'}</Field>
                <Field label="Created">{fmtDate(expense.created_at)}</Field>
                {expense.invoice_id && (
                  <Field label="Linked Invoice">
                    <button
                      type="button"
                      onClick={() => router.push(`/${orgSlug}/invoices/${expense.invoice_id}`)}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      View invoice <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </Field>
                )}
                {expense.receipt_url && (
                  <Field label="Receipt">
                    <a
                      href={expense.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      Open receipt <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Field>
                )}
                {expense.rejection_reason && (
                  <Field label="Rejection Reason" className="sm:col-span-2 xl:col-span-3">
                    <span className="text-destructive">{expense.rejection_reason}</span>
                  </Field>
                )}
              </dl>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="py-4">
                <h3 className="font-bold text-sm uppercase tracking-tight">Vendor &amp; Tax</h3>
              </CardHeader>
              <CardContent className="pt-0">
                {meta?.is_self_expense === true ? (
                  <p className="text-sm text-muted-foreground">Self / internal expense, no external vendor.</p>
                ) : (
                  <dl className="space-y-4">
                    <Field label="Vendor">{vendorName || '—'}</Field>
                    {vendorEmail && <Field label="Email">{vendorEmail}</Field>}
                    <Field label="Supplier KRA PIN">
                      {vendorPin ? (
                        <span className="font-mono">{vendorPin}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          Not set. {isDraft ? 'Edit the expense to add it; ' : ''}without it a paid taxable expense is not recorded as an eTIMS purchase.
                        </span>
                      )}
                    </Field>
                  </dl>
                )}
              </CardContent>
            </Card>

            {meta && Object.keys(meta).length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <details>
                    <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Technical details
                    </summary>
                    <dl className="mt-3 space-y-1.5">
                      {Object.entries(meta).map(([k, v]) => (
                        <div key={k} className="flex items-start justify-between gap-3 text-xs">
                          <dt className="text-muted-foreground shrink-0">{k}</dt>
                          <dd className="font-medium text-foreground text-right break-all">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <EditExpenseModal
        tenant={effectiveTenant}
        expense={editOpen && isDraft ? expense ?? null : null}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}
