'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { Combobox } from '@/components/ui/combobox';
import { CostCenterCombobox } from '@/components/ui/cost-center-combobox';
import { useCostCenterDefault } from '@/hooks/use-cost-centers';
import { ProjectCombobox } from '@/components/ui/project-combobox';
import { FormField } from '@/components/ui/form-field';
import { SubscriptionGate } from '@/components/subscription/subscription-gate';
import { useAccounts } from '@/hooks/use-accounts';
import { useCreateExpense } from '@/hooks/use-expenses';
import { useInvoices } from '@/hooks/use-invoices';
import { useSelectedVendor, useVendors, useVendorSearch } from '@/hooks/use-inventory';
import { vendorKraPin as kraPinOf } from '@/lib/api/inventory';
import { VendorFormDialog } from '@/components/vendors/VendorFormDialog';
import { ExpenseWizardFollowUp } from '@/components/expenses/ExpenseWizardFollowUp';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useCurrencyOptions, useTenantCurrency } from '@/hooks/use-currencies';
import { usePreviewNextNumber } from '@/hooks/use-sequences';
import type { CreateExpenseRequest } from '@/lib/api/expenses';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, Paperclip, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { vendorOptionHint } from '@/lib/vendor-balance';

const ADD_NEW = '__ADD_NEW__';

const TAX_TYPES = [
  { value: 'none', label: 'NONE', rate: 0 },
  { value: 'vat16', label: 'VAT (16%)', rate: 16 },
  { value: 'vat8', label: 'VAT (8%)', rate: 8 },
  { value: 'zero', label: 'Zero Rated (0%)', rate: 0 },
  { value: 'exempt', label: 'Exempt (0%)', rate: 0 },
];

const RECURRING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

// The local calendar day; toISOString() is the UTC one, a day behind for EAT just after midnight.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// The steps the page really walks through: save the details, move the expense through
// approval and payment (ExpenseWizardFollowUp), then a summary.
const STEPS = [
  { n: 1, label: 'Details' },
  { n: 2, label: 'Approve & pay' },
  { n: 3, label: 'Done' },
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
  const searchVendors = useVendorSearch(effectiveTenant);
  const { data: accountsData } = useAccounts(effectiveTenant);
  const { data: invoiceData } = useInvoices(effectiveTenant, undefined, !!effectiveTenant);
  // Real server-authoritative preview (document-sequence service) — same source of truth the
  // backend uses at create time. Display-only: never sent as the actual number unless the user
  // explicitly types an override, so it can never collide with what the server assigns.
  const { data: expenseNoPreview } = usePreviewNextNumber(effectiveTenant, 'expense', !!effectiveTenant);

  const vendorOptions = useMemo(() => {
    const vendors = (vendorData?.vendors ?? []).map((v) => ({ value: v.id, label: v.business_name, hint: vendorOptionHint(v) }));
    return [{ value: ADD_NEW, label: '+ Add New Vendor' }, ...vendors];
  }, [vendorData]);

  const ledgerOptions = useMemo(
    () =>
      (accountsData?.accounts ?? [])
        .filter((a) => a.account_type === 'expense')
        .map((a) => ({
          value: a.id,
          label: a.account_name,
          hint: `${a.account_code} · bal. ${Number(a.balance ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })} ${a.currency ?? ''}`,
        })),
    [accountsData],
  );

  const invoiceOptions = useMemo(
    () =>
      (invoiceData?.invoices ?? []).map((inv) => ({
        value: inv.id,
        label: inv.invoice_number,
        hint: inv.customer_name,
      })),
    [invoiceData],
  );

  const currencyOptions = useCurrencyOptions();
  const tenantCurrency = useTenantCurrency(effectiveTenant);

  const suggestedExpenseNo = expenseNoPreview?.next_number ?? '';

  const [expenseDate, setExpenseDate] = useState(today());
  // Budget dimensions: the cost centre and project this spend counts against.
  const [costCenterId, setCostCenterId] = useState('');
  const [projectId, setProjectId] = useState('');
  // Self / internal expense — no external vendor; the create payload omits vendor_id.
  const [selfExpense, setSelfExpense] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  // Supplier KRA PIN — lets a paid taxable expense be recorded as a KRA eTIMS purchase (input VAT).
  const [vendorKraPin, setVendorKraPin] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseNo, setExpenseNo] = useState('');
  // Real link to an existing invoice (invoice_id) — not a free-typed number with no relationship
  // to the actual record.
  const [invoiceId, setInvoiceId] = useState('');
  // The tenant's currency until the user picks another.
  const [pickedCurrency, setCurrency] = useState('');
  const currency = pickedCurrency || tenantCurrency;
  const [taxType, setTaxType] = useState('none');
  const [amount, setAmount] = useState('');
  const [ledgerId, setLedgerId] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [errors, setErrors] = useState<{ vendor?: string; amount?: string }>({});
  // Default cost centre from the category, ledger and project (the rules the ledger posts with).
  const costCenterDefault = useCostCenterDefault(
    effectiveTenant,
    { category_id: categoryId || undefined, account_id: ledgerId || undefined, project_id: projectId || undefined, kind: 'expense' },
    costCenterId,
    setCostCenterId,
  );

  // "+ Add New Vendor" opens the vendor dialog in place; the created vendor is selected on return.
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  // The selected vendor, whether it came from the prefetched page, a remote search or the dialog.
  const selectedVendor = useSelectedVendor(effectiveTenant, vendorId, vendorData?.vendors);
  // Prefill name, email and KRA PIN from the supplier master once per selection. Adjusted during
  // render rather than in an effect (the linter flags setState in effects); a vendor fetched by id
  // after a remote-search pick fills in as soon as it resolves. Switching vendor replaces the
  // previous vendor's PIN instead of leaving it behind.
  const [prefilledFor, setPrefilledFor] = useState('');
  if (selectedVendor && selectedVendor.id !== prefilledFor) {
    setPrefilledFor(selectedVendor.id);
    setVendorName(selectedVendor.business_name);
    setVendorEmail(selectedVendor.email ?? '');
    setVendorKraPin(kraPinOf(selectedVendor));
  }

  const onSelectVendor = (value: string) => {
    if (value === ADD_NEW) {
      setVendorDialogOpen(true);
      return;
    }
    setVendorId(value);
    setErrors((e) => ({ ...e, vendor: undefined }));
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
      // Only sent when the user explicitly overrides it — omitted (undefined) lets the server
      // autogenerate via the document-sequence service, matching invoice/quotation numbering.
      // The displayed placeholder (suggestedExpenseNo) is a live preview, never sent as-is.
      expense_number: expenseNo.trim() || undefined,
      description: notes.trim() || `Expense ${expenseNo.trim() || suggestedExpenseNo}`,
      amount: amt,
      tax_amount: tax || undefined,
      currency,
      expense_date: expenseDate,
      category_id: categoryId || undefined,
      // Self / internal expense → omit vendor_id entirely (backend treats it as optional).
      vendor_id: selfExpense ? undefined : (vendorId || undefined),
      account_id: ledgerId || undefined,
      cost_center_id: costCenterId || undefined,
      invoice_id: invoiceId || undefined,
      // Top-level recurrence fields drive the backend scheduler (persisted to real columns).
      is_recurring: isRecurring || undefined,
      recurring_frequency: isRecurring ? recurringFrequency : undefined,
      metadata: {
        vendor_name: selfExpense ? undefined : (vendorName.trim() || undefined),
        vendor_email: selfExpense ? undefined : (vendorEmail.trim() || undefined),
        // Read by treasury on payment to record the expense as a KRA eTIMS purchase (input VAT).
        supplier_kra_pin: selfExpense ? undefined : (vendorKraPin.trim() || undefined),
        supplier_name: selfExpense ? undefined : (vendorName.trim() || undefined),
        is_self_expense: selfExpense || undefined,
        // Stamped on both GL lines so project budgets and project profitability count it.
        project_id: projectId || undefined,
        tax_type: taxType,
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
    setVendorKraPin('');
    setPrefilledFor('');
    setCategoryId('');
    setExpenseNo('');
    setInvoiceId('');
    setTaxType('none');
    setAmount('');
    setLedgerId('');
    setCostCenterId('');
    costCenterDefault.reset();
    setProjectId('');
    setNotes('');
    setAttachmentName(null);
    setIsRecurring(false);
    setRecurringFrequency('monthly');
    setErrors({});
  };

  // After saving, "continue" walks on to approval and payment; "draft" goes back to the list;
  // "new" clears the form for the next expense.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const save = (after: 'continue' | 'draft' | 'new') => {
    const payload = buildPayload();
    if (!payload) return;
    createExpense.mutate(payload, {
      onSuccess: (expense) => {
        toast.success(`Expenditure ${expense?.expense_number ?? ''} saved`);
        if (after === 'new') reset();
        else if (after === 'continue' && expense?.id) {
          setCreatedId(expense.id);
          setStep(2);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else router.push(`/${orgSlug}/expenses`);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error ?? 'Failed to create expenditure. Please try again.');
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
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
          <Stepper current={step} />
        </CardContent>
      </Card>

      {step > 1 && createdId ? (
        <ExpenseWizardFollowUp
          tenant={effectiveTenant ?? ''}
          orgSlug={orgSlug}
          expenseId={createdId}
          step={step as 2 | 3}
          onStep={setStep}
          onCreateAnother={() => {
            reset();
            setCreatedId(null);
            setStep(1);
          }}
        />
      ) : (
      <>
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

              <FormField label="Expense Number" description="Auto-generated per your document-numbering settings — only fill this in to override it.">
                <input value={expenseNo} onChange={(e) => setExpenseNo(e.target.value)} placeholder={suggestedExpenseNo} className={inputClass} />
              </FormField>

              <FormField label="Linked Invoice" description="Link this cost to an existing invoice for per-invoice cost/margin reporting.">
                <Combobox
                  options={invoiceOptions}
                  value={invoiceId}
                  onChange={setInvoiceId}
                  placeholder="Select invoice (optional)"
                  searchPlaceholder="Search invoices…"
                  emptyText="No invoices found"
                />
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
                    setVendorKraPin('');
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
                    valueLabel={selectedVendor?.business_name}
                    placeholder="Select Vendor"
                    searchPlaceholder="Search vendors…"
                    emptyText="No vendors yet"
                    onRemoteSearch={searchVendors}
                  />
                </FormField>

                <FormField label="Vendor's Name">
                  <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className={inputClass} />
                </FormField>

                <FormField label="Vendor's Email">
                  <input type="email" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} className={inputClass} />
                </FormField>

                <FormField
                  label="Supplier KRA PIN"
                  description="Filled from the vendor's record when it has one. Lets this expense be recorded as a KRA eTIMS purchase (input VAT) when paid."
                >
                  <input value={vendorKraPin} onChange={(e) => setVendorKraPin(e.target.value.toUpperCase())} placeholder="e.g. P051234567X" className={inputClass} />
                </FormField>
              </div>
            )}
            <VendorFormDialog
              open={vendorDialogOpen}
              tenant={effectiveTenant}
              onClose={() => setVendorDialogOpen(false)}
              onCreated={(vendor) => {
                setVendorDialogOpen(false);
                setVendorId(vendor.id);
                setErrors((e) => ({ ...e, vendor: undefined }));
              }}
            />

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

              <FormField
                label="Cost Centre"
                description={
                  costCenterDefault.suggested && costCenterDefault.suggested.id === costCenterId
                    ? 'Suggested from the category and account. Change it if this spend belongs elsewhere.'
                    : 'The department or unit this spend is budgeted under.'
                }
              >
                <CostCenterCombobox tenant={effectiveTenant} value={costCenterId} onChange={costCenterDefault.onUserChange} />
              </FormField>

              <FormField label="Project" description="Counts this spend against the project's budget.">
                <ProjectCombobox tenant={effectiveTenant} value={projectId} onChange={setProjectId} />
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

            {isRecurring && (
              <FormField label="Recurring Cycle" className="max-w-xs">
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                  className={inputClass}
                >
                  {RECURRING_FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </FormField>
            )}
          </section>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
            <Button variant="primary" onClick={() => save('continue')} disabled={createExpense.isPending}>
              {createExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save and continue
            </Button>
            <Button variant="outline" onClick={() => save('draft')} disabled={createExpense.isPending}>
              Save as draft
            </Button>
            <Button variant="ghost" onClick={() => save('new')} disabled={createExpense.isPending}>
              Save and add another
            </Button>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
