'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { Combobox } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/form-field';
import { useExpense, useUpdateExpense } from '@/hooks/use-expenses';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useSupportedCurrencies } from '@/hooks/use-currencies';
import type { UpdateExpenseRequest } from '@/lib/api/expenses';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

const TAX_TYPES = [
  { value: 'none', label: 'NONE', rate: 0 },
  { value: 'vat16', label: 'VAT (16%)', rate: 16 },
  { value: 'vat8', label: 'VAT (8%)', rate: 8 },
  { value: 'zero', label: 'Zero Rated (0%)', rate: 0 },
  { value: 'exempt', label: 'Exempt (0%)', rate: 0 },
];

/** Section header mirroring the Create Expenditure form's grouping. */
function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{children}</h3>
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export default function EditExpenditurePage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const expenseId = (params?.id as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data: expense, isLoading, error } = useExpense(effectiveTenant, expenseId, !!effectiveTenant);
  const updateExpense = useUpdateExpense(effectiveTenant);
  const { data: currencyData } = useSupportedCurrencies();

  const currencyOptions = useMemo(() => {
    const codes = (currencyData?.currencies ?? []).map((c) => c.code).filter(Boolean);
    const list = codes.length ? codes : ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'];
    return list.map((code) => ({ value: code, label: code }));
  }, [currencyData]);

  const [expenseDate, setExpenseDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [taxType, setTaxType] = useState('none');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({});
  const [hydrated, setHydrated] = useState(false);

  // Prefill from the fetched expense once.
  useEffect(() => {
    if (!expense || hydrated) return;
    setExpenseDate(expense.expense_date ? expense.expense_date.slice(0, 10) : '');
    setCategoryId(expense.category_id ?? '');
    setCurrency(expense.currency || 'KES');
    setAmount(expense.amount ?? '');
    setDescription(expense.description ?? '');
    setBillable(!!expense.billable);
    // Best-effort: restore the tax type from metadata if the create form stored it.
    const metaTax = (expense.metadata as Record<string, any> | undefined)?.tax_type;
    if (typeof metaTax === 'string' && TAX_TYPES.some((t) => t.value === metaTax)) {
      setTaxType(metaTax);
    }
    setHydrated(true);
  }, [expense, hydrated]);

  const notDraft = !!expense && expense.status !== 'draft';

  const save = () => {
    const nextErrors: typeof errors = {};
    if (!description.trim()) nextErrors.description = 'Enter a description';
    if (!amount.toString().trim() || !(parseFloat(amount) > 0)) nextErrors.amount = 'Enter the amount spent';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const amt = parseFloat(amount) || 0;
    const rate = TAX_TYPES.find((t) => t.value === taxType)?.rate ?? 0;
    const tax = Number(((amt * rate) / 100).toFixed(2));

    const payload: UpdateExpenseRequest = {
      description: description.trim(),
      amount: amt,
      tax_amount: tax,
      currency,
      expense_date: expenseDate || undefined,
      category_id: categoryId || undefined,
      billable,
      metadata: {
        ...(expense?.metadata ?? {}),
        tax_type: taxType,
      },
    };

    updateExpense.mutate(
      { id: expenseId, data: payload },
      {
        onSuccess: () => {
          toast.success(`Expenditure ${expense?.expense_number ?? ''} updated`);
          router.push(`/${orgSlug}/expenses/${expenseId}`);
        },
        onError: (err: any) => {
          // 409 = the expense is no longer a draft (submitted/approved/...) and is immutable.
          if (err?.response?.status === 409) {
            toast.error('This expense can no longer be edited — only drafts are editable.');
            return;
          }
          toast.error(err?.response?.data?.error ?? 'Failed to update expenditure. Please try again.');
        },
      },
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${orgSlug}/expenses/${expenseId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Expenditure</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Update this draft expense.</p>
        </div>
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

      {notDraft && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          This expense is <strong>{expense?.status}</strong> and is no longer editable. Only draft expenses can be edited.
        </div>
      )}

      {expense && !isLoading && !notDraft && (
        <Card>
          <CardContent className="pt-6 space-y-8">
            <section className="space-y-5">
              <SectionTitle hint="When the spend happened and how to classify it.">Expenditure Details</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <FormField label="Expense Date">
                  <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Category" description="Group this spend for reporting (e.g. Travel, Utilities).">
                  <CategoryCombobox tenantIdOrSlug={effectiveTenant} value={categoryId} onChange={setCategoryId} />
                </FormField>
              </div>
              <FormField label="Description" required error={errors.description}>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setErrors((er) => ({ ...er, description: undefined })); }}
                  rows={3}
                  className={cn(inputClass, 'resize-y')}
                />
              </FormField>
            </section>

            <hr className="border-border" />

            <section className="space-y-5">
              <SectionTitle hint="The amount spent, applicable tax, and currency.">Amount &amp; Posting</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <FormField label="Amount Spent" required error={errors.amount}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setErrors((er) => ({ ...er, amount: undefined })); }}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Currency">
                  <Combobox options={currencyOptions} value={currency} onChange={setCurrency} clearable={false} />
                </FormField>
                <FormField label="Select Tax Type">
                  <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className={inputClass}>
                    {TAX_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <button
                type="button"
                onClick={() => setBillable((b) => !b)}
                className="flex items-start gap-3 text-left w-full rounded-lg border border-border p-4 hover:bg-accent/10 transition-colors"
              >
                <span className={cn('mt-0.5 h-5 w-9 rounded-full transition-colors relative shrink-0', billable ? 'bg-primary' : 'bg-accent')}>
                  <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', billable ? 'left-[18px]' : 'left-0.5')} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Billable to customer</span>
                  <span className="block text-xs text-muted-foreground">Mark this cost to be recharged on the customer&apos;s invoice.</span>
                </span>
              </button>
            </section>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <Button variant="primary" onClick={save} disabled={updateExpense.isPending}>
                {updateExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => router.push(`/${orgSlug}/expenses/${expenseId}`)} disabled={updateExpense.isPending}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
