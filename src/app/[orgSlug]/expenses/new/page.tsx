'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { Combobox } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/form-field';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { useAccounts } from '@/hooks/use-accounts';
import { useCreateExpense, useExpenses } from '@/hooks/use-expenses';
import { useVendors } from '@/hooks/use-inventory';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useSupportedCurrencies } from '@/hooks/use-currencies';
import type { CreateExpenseRequest } from '@/lib/api/expenses';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, Paperclip, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const ADD_NEW = '__ADD_NEW__';

const TAX_TYPES = [
  { value: 'none', label: 'NONE', rate: 0 },
  { value: 'vat16', label: 'VAT (16%)', rate: 16 },
  { value: 'vat8', label: 'VAT (8%)', rate: 8 },
  { value: 'zero', label: 'Zero Rated (0%)', rate: 0 },
  { value: 'exempt', label: 'Exempt (0%)', rate: 0 },
];

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

const today = () => new Date().toISOString().slice(0, 10);

const STEPS = [
  { n: 1, label: 'Add Details' },
  { n: 2, label: 'Mark Payments' },
  { n: 3, label: 'Customise & Share' },
];

function Stepper({ current = 1 }: { current?: number }) {
  return (
    <div className="flex items-center justify-center overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'h-9 w-9 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors',
                  active && 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30',
                  done && 'border-primary bg-primary/10 text-primary',
                  !active && !done && 'border-border text-muted-foreground',
                )}
              >
                {s.n}
              </span>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  active || done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  'mx-2 sm:mx-4 mb-5 h-0.5 w-10 sm:w-20 rounded-full',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Section header used to break the long form into scannable, card-internal groups. */
function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{children}</h3>
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export default function NewExpenditurePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const createExpense = useCreateExpense(effectiveTenant);
  const { data: vendorData } = useVendors(effectiveTenant, undefined, !!effectiveTenant);
  const { data: accountsData } = useAccounts(effectiveTenant);
  const { data: currencyData } = useSupportedCurrencies();
  const { data: existingExpenses } = useExpenses(effectiveTenant, undefined, !!effectiveTenant);

  const vendorOptions = useMemo(() => {
    const vendors = (vendorData?.vendors ?? []).map((v) => ({ value: v.id, label: v.business_name }));
    return [{ value: ADD_NEW, label: '+ Add New Vendor' }, ...vendors];
  }, [vendorData]);

  const ledgerOptions = useMemo(
    () =>
      (accountsData?.accounts ?? [])
        .filter((a) => a.account_type === 'expense')
        .map((a) => ({ value: a.id, label: a.account_name, hint: a.account_code })),
    [accountsData],
  );

  const currencyOptions = useMemo(() => {
    const codes = (currencyData?.currencies ?? []).map((c) => c.code).filter(Boolean);
    const list = codes.length ? codes : ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'];
    return list.map((code) => ({ value: code, label: code }));
  }, [currencyData]);

  const suggestedExpenseNo = useMemo(() => {
    const n = (existingExpenses?.total ?? existingExpenses?.expenses?.length ?? 0) + 1;
    return `A${String(n).padStart(5, '0')}`;
  }, [existingExpenses]);

  const [expenseDate, setExpenseDate] = useState(today());
  // Self / internal expense — no external vendor; the create payload omits vendor_id.
  const [selfExpense, setSelfExpense] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseNo, setExpenseNo] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [taxType, setTaxType] = useState('none');
  const [amount, setAmount] = useState('');
  const [ledgerId, setLedgerId] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [errors, setErrors] = useState<{ vendor?: string; amount?: string }>({});

  const onSelectVendor = (value: string) => {
    if (value === ADD_NEW) {
      router.push(`/${orgSlug}/vendors/new`);
      return;
    }
    setVendorId(value);
    setErrors((e) => ({ ...e, vendor: undefined }));
    const v = vendorData?.vendors?.find((x) => x.id === value);
    if (v) {
      setVendorName(v.business_name);
      if (v.email) setVendorEmail(v.email);
    }
  };

  const onAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachmentName(file.name);
  };

  const buildPayload = (): CreateExpenseRequest | null => {
    const nextErrors: typeof errors = {};
    if (!selfExpense && !vendorId && !vendorName.trim()) nextErrors.vendor = 'Select a vendor, name one, or mark this as a self / internal expense';
    if (!amount.trim() || !(parseFloat(amount) > 0)) nextErrors.amount = 'Enter the amount spent';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    const amt = parseFloat(amount) || 0;
    const rate = TAX_TYPES.find((t) => t.value === taxType)?.rate ?? 0;
    const tax = Number(((amt * rate) / 100).toFixed(2));

    return {
      description: notes.trim() || `Expense ${expenseNo.trim() || suggestedExpenseNo}`,
      amount: amt,
      tax_amount: tax || undefined,
      currency,
      expense_date: expenseDate,
      category_id: categoryId || undefined,
      // Self / internal expense → omit vendor_id entirely (backend treats it as optional).
      vendor_id: selfExpense ? undefined : (vendorId || undefined),
      account_id: ledgerId || undefined,
      metadata: {
        expense_number: expenseNo.trim() || suggestedExpenseNo,
        invoice_number: invoiceNo.trim() || undefined,
        vendor_name: selfExpense ? undefined : (vendorName.trim() || undefined),
        vendor_email: selfExpense ? undefined : (vendorEmail.trim() || undefined),
        is_self_expense: selfExpense || undefined,
        tax_type: taxType,
        is_recurring: isRecurring,
        attachment_name: attachmentName || undefined,
      },
    };
  };

  const reset = () => {
    setExpenseDate(today());
    setSelfExpense(false);
    setVendorId('');
    setVendorName('');
    setVendorEmail('');
    setCategoryId('');
    setExpenseNo('');
    setInvoiceNo('');
    setTaxType('none');
    setAmount('');
    setLedgerId('');
    setNotes('');
    setAttachmentName(null);
    setIsRecurring(false);
    setErrors({});
  };

  const save = (after: 'list' | 'new' | 'payment') => {
    const payload = buildPayload();
    if (!payload) return;
    createExpense.mutate(payload, {
      onSuccess: (expense) => {
        toast.success(`Expenditure ${expense?.expense_number ?? ''} created`);
        if (after === 'new') reset();
        else router.push(`/${orgSlug}/expenses`);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error ?? 'Failed to create expenditure. Please try again.');
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${orgSlug}/expenses`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Expenditure</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Record a new expense and route it for payment.</p>
        </div>
      </div>

      {/* Step indicator in its own card so it reads as a clear progress band. */}
      <Card>
        <CardContent className="py-5">
          <Stepper current={1} />
        </CardContent>
      </Card>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Creating for your own organization. Drill into a tenant via the filter above to create for theirs.
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-8">
          {/* ---- Section: Details ---- */}
          <section className="space-y-5">
            <SectionTitle hint="When the spend happened and how to classify it.">Expenditure Details</SectionTitle>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Expense Date" required>
                <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={inputClass} />
              </FormField>

              <FormField label="Category" description="Group this spend for reporting (e.g. Travel, Utilities).">
                <CategoryCombobox tenantIdOrSlug={effectiveTenant} value={categoryId} onChange={setCategoryId} />
              </FormField>

              <FormField label="Expense Number" required>
                <input value={expenseNo} onChange={(e) => setExpenseNo(e.target.value)} placeholder={suggestedExpenseNo} className={inputClass} />
              </FormField>

              <FormField label="Invoice Number">
                <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputClass} />
              </FormField>
            </div>
          </section>

          <hr className="border-border" />

          {/* ---- Section: Vendor ---- */}
          <section className="space-y-5">
            <SectionTitle hint="Who you paid — or mark it as internal spend with no external supplier.">Vendor</SectionTitle>

            {/* Self / internal expense toggle — when on, no external vendor is sent. */}
            <button
              type="button"
              onClick={() => {
                setSelfExpense((s) => {
                  const next = !s;
                  if (next) {
                    setVendorId('');
                    setVendorName('');
                    setVendorEmail('');
                    setErrors((e) => ({ ...e, vendor: undefined }));
                  }
                  return next;
                });
              }}
              className="flex items-start gap-3 text-left w-full rounded-lg border border-border p-4 hover:bg-accent/10 transition-colors"
            >
              <span className={cn('mt-0.5 h-5 w-9 rounded-full transition-colors relative shrink-0', selfExpense ? 'bg-primary' : 'bg-accent')}>
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', selfExpense ? 'left-[18px]' : 'left-0.5')} />
              </span>
              <span>
                <span className="block text-sm font-semibold">Self / internal (no external vendor)</span>
                <span className="block text-xs text-muted-foreground">For internal spend with no external supplier (e.g. petty cash, reimbursements). No vendor is recorded.</span>
              </span>
            </button>

            {!selfExpense && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <FormField label="Select Vendor" error={errors.vendor} className="md:col-span-2">
                  <Combobox
                    options={vendorOptions}
                    value={vendorId}
                    onChange={onSelectVendor}
                    placeholder="Select Vendor"
                    searchPlaceholder="Search vendors…"
                    emptyText="No vendors yet"
                  />
                </FormField>

                <FormField label="Vendor's Name">
                  <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className={inputClass} />
                </FormField>

                <FormField label="Vendor's Email">
                  <input type="email" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} className={inputClass} />
                </FormField>
              </div>
            )}
          </section>

          <hr className="border-border" />

          {/* ---- Section: Amount & Posting ---- */}
          <section className="space-y-5">
            <SectionTitle hint="The amount spent, applicable tax, and the ledger it posts to.">Amount &amp; Posting</SectionTitle>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FormField label="Amount Spent" required error={errors.amount}>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrors((er) => ({ ...er, amount: undefined }));
                  }}
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

              <FormField label="Expense Ledger">
                <SubscriptionGate feature="ledger_posting" mode="overlay">
                  <Combobox
                    options={ledgerOptions}
                    value={ledgerId}
                    onChange={setLedgerId}
                    placeholder="Select Expense Ledger"
                    searchPlaceholder="Search ledger accounts…"
                    emptyText="No expense accounts found"
                  />
                </SubscriptionGate>
              </FormField>
            </div>
          </section>

          <hr className="border-border" />

          {/* ---- Section: Notes & Attachments ---- */}
          <section className="space-y-5">
            <SectionTitle>Notes &amp; Attachments</SectionTitle>

            <FormField label="Notes">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={cn(inputClass, 'resize-y')} />
            </FormField>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Attachments</p>
              <p className="text-[11px] text-muted-foreground/70">
                Attachments won&apos;t appear as separate documents; instead, they&apos;ll be accessible as clickable links within the invoice.
              </p>
              <label className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <Plus className="h-5 w-5" />
                <input type="file" className="hidden" onChange={onAttachmentChange} />
              </label>
              {attachmentName && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" /> {attachmentName}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsRecurring((r) => !r)}
              className="flex items-start gap-3 text-left w-full rounded-lg border border-border p-4 hover:bg-accent/10 transition-colors"
            >
              <span className={cn('mt-0.5 h-5 w-9 rounded-full transition-colors relative shrink-0', isRecurring ? 'bg-primary' : 'bg-accent')}>
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', isRecurring ? 'left-[18px]' : 'left-0.5')} />
              </span>
              <span>
                <span className="block text-sm font-semibold">This is a Recurring expenditure</span>
                <span className="block text-xs text-muted-foreground">A draft expenditure will be created with the same details every next period.</span>
              </span>
            </button>
          </section>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
            <Button variant="primary" onClick={() => save('list')} disabled={createExpense.isPending}>
              {createExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save &amp; Continue
            </Button>
            <Button variant="outline" onClick={() => save('new')} disabled={createExpense.isPending}>
              Save &amp; Create New
            </Button>
            <Button variant="outline" onClick={() => save('payment')} disabled={createExpense.isPending}>
              Save &amp; Mark Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
