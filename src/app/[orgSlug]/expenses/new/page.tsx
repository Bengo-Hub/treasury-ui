'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { Combobox } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/form-field';
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
  { n: 1, label: 'Add Expenditure Details' },
  { n: 2, label: 'Mark Payments' },
  { n: 3, label: 'Customise & Share' },
];

function Stepper() {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                'h-8 w-8 rounded-full border-2 flex items-center justify-center text-sm font-bold',
                s.n === 1 ? 'border-primary text-primary' : 'border-border text-muted-foreground',
              )}
            >
              {s.n}
            </span>
            <span className={cn('text-xs font-medium', s.n === 1 ? 'text-foreground' : 'text-muted-foreground')}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <span className="mx-3 mb-5 h-0.5 w-16 sm:w-28 bg-border" />}
        </div>
      ))}
    </div>
  );
}

export default function NewExpenditurePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

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
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
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

  const noTenant = isPlatformOwner && !tenantQueryParam;

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
    if (!vendorId && !vendorName.trim()) nextErrors.vendor = 'Select or name a vendor';
    if (!amount.trim() || !(parseFloat(amount) > 0)) nextErrors.amount = 'Enter the amount spent';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;
    if (noTenant) {
      toast.error('Select a tenant before creating an expenditure.');
      return null;
    }

    const amt = parseFloat(amount) || 0;
    const rate = TAX_TYPES.find((t) => t.value === taxType)?.rate ?? 0;
    const tax = Number(((amt * rate) / 100).toFixed(2));

    return {
      description: notes.trim() || `Expense ${expenseNo.trim() || suggestedExpenseNo}`,
      amount: amt,
      tax_amount: tax || undefined,
      currency,
      expense_date: expenseDate,
      vendor_id: vendorId || undefined,
      account_id: ledgerId || undefined,
      metadata: {
        expense_number: expenseNo.trim() || suggestedExpenseNo,
        invoice_number: invoiceNo.trim() || undefined,
        vendor_name: vendorName.trim() || undefined,
        vendor_email: vendorEmail.trim() || undefined,
        tax_type: taxType,
        is_recurring: isRecurring,
        attachment_name: attachmentName || undefined,
      },
    };
  };

  const reset = () => {
    setExpenseDate(today());
    setVendorId('');
    setVendorName('');
    setVendorEmail('');
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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${orgSlug}/expenses`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create Expenditure</h1>
      </div>

      <Stepper />

      {noTenant && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-4 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above before creating an expenditure.
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-5">
          <h2 className="text-center text-2xl font-black text-primary">Expenditures</h2>

          <FormField label="Expense Date" required>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={inputClass} />
          </FormField>

          <FormField label="Select Vendor" required error={errors.vendor}>
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

          <FormField label="Expense Number" required>
            <input value={expenseNo} onChange={(e) => setExpenseNo(e.target.value)} placeholder={suggestedExpenseNo} className={inputClass} />
          </FormField>

          <FormField label="Invoice Number">
            <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputClass} />
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

          <FormField label="Expense Ledger">
            <Combobox
              options={ledgerOptions}
              value={ledgerId}
              onChange={setLedgerId}
              placeholder="Select Expense Ledger"
              searchPlaceholder="Search ledger accounts…"
              emptyText="No expense accounts found"
            />
          </FormField>

          <FormField label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={cn(inputClass, 'resize-y')} />
          </FormField>

          {/* Attachments */}
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

          {/* Recurring */}
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

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="primary" onClick={() => save('list')} disabled={createExpense.isPending || noTenant}>
              {createExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save &amp; Continue
            </Button>
            <Button variant="outline" onClick={() => save('new')} disabled={createExpense.isPending || noTenant}>
              Save &amp; Create New
            </Button>
            <Button variant="outline" onClick={() => save('payment')} disabled={createExpense.isPending || noTenant}>
              Save &amp; Mark Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
