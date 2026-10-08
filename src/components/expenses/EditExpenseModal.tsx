'use client';

import { Button } from '@/components/ui/base';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { Combobox } from '@/components/ui/combobox';
import { CostCenterCombobox } from '@/components/ui/cost-center-combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { ProjectCombobox } from '@/components/ui/project-combobox';
import { useCurrencyOptions, useTenantCurrency } from '@/hooks/use-currencies';
import { useUpdateExpense } from '@/hooks/use-expenses';
import { useSelectedVendor, useVendors, useVendorSearch } from '@/hooks/use-inventory';
import type { Expense, UpdateExpenseRequest } from '@/lib/api/expenses';
import { vendorKraPin } from '@/lib/api/inventory';
import { cn } from '@/lib/utils';
import { vendorOptionHint } from '@/lib/vendor-balance';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

const TAX_TYPES = [
  { value: 'none', label: 'NONE', rate: 0 },
  { value: 'vat16', label: 'VAT (16%)', rate: 16 },
  { value: 'vat8', label: 'VAT (8%)', rate: 8 },
  { value: 'zero', label: 'Zero Rated (0%)', rate: 0 },
  { value: 'exempt', label: 'Exempt (0%)', rate: 0 },
];

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</h3>
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

const metaString = (meta: Record<string, unknown> | undefined, key: string) =>
  typeof meta?.[key] === 'string' ? (meta[key] as string) : '';

interface Props {
  tenant: string;
  /** The draft expense to edit; null keeps the modal closed. */
  expense: Expense | null;
  onClose: () => void;
  onSaved?: (expense: Expense) => void;
}

/**
 * Edit a draft expense in place (expenses list row action and the expense detail page). Only
 * drafts are editable; the backend answers 409 for anything else. The vendor and its KRA PIN are
 * editable here too: picking a vendor fills the PIN from the supplier master, and the server also
 * stamps the master PIN on save when none is sent.
 */
export function EditExpenseModal({ tenant, expense, onClose, onSaved }: Props) {
  if (!expense) return null;
  // Keyed on the expense so its fields are seeded once per opened expense, without an effect.
  return <EditExpenseForm key={expense.id} tenant={tenant} expense={expense} onClose={onClose} onSaved={onSaved} />;
}

function EditExpenseForm({ tenant, expense, onClose, onSaved }: Props & { expense: Expense }) {
  const meta = expense.metadata as Record<string, unknown> | undefined;
  const updateExpense = useUpdateExpense(tenant);
  const { data: vendorData } = useVendors(tenant, undefined, !!tenant);
  const searchVendors = useVendorSearch(tenant);

  const [expenseDate, setExpenseDate] = useState(expense.expense_date ? expense.expense_date.slice(0, 10) : '');
  const [categoryId, setCategoryId] = useState(expense.category_id ?? '');
  const [description, setDescription] = useState(expense.description ?? '');
  const [amount, setAmount] = useState(String(expense.amount ?? ''));
  const tenantCurrency = useTenantCurrency(tenant);
  const [pickedCurrency, setCurrency] = useState(expense.currency || '');
  const currency = pickedCurrency || tenantCurrency;
  const [taxType, setTaxType] = useState(() => {
    const t = metaString(meta, 'tax_type');
    return TAX_TYPES.some((x) => x.value === t) ? t : 'none';
  });
  const [costCenterId, setCostCenterId] = useState(expense.cost_center_id ?? '');
  const [projectId, setProjectId] = useState(metaString(meta, 'project_id'));
  const [billable, setBillable] = useState(!!expense.billable);
  const [vendorId, setVendorId] = useState(expense.vendor_id ?? '');
  const [vendorName, setVendorName] = useState(metaString(meta, 'vendor_name') || metaString(meta, 'supplier_name'));
  const [vendorPin, setVendorPin] = useState(metaString(meta, 'supplier_kra_pin'));
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({});

  const selectedVendor = useSelectedVendor(tenant, vendorId, vendorData?.vendors);
  // Fill name and PIN from the master when the user picks a different vendor (adjusted during
  // render; the vendor already on the expense keeps whatever was saved with it).
  const [prefilledFor, setPrefilledFor] = useState(expense.vendor_id ?? '');
  if (selectedVendor && selectedVendor.id !== prefilledFor) {
    setPrefilledFor(selectedVendor.id);
    setVendorName(selectedVendor.business_name);
    setVendorPin(vendorKraPin(selectedVendor));
  }
  // The expense's own vendor has no saved PIN yet: offer the master's.
  const pinPlaceholder = vendorKraPin(selectedVendor) || 'e.g. P051234567X';

  const currencyOptions = useCurrencyOptions();
  const vendorOptions = useMemo(
    () => (vendorData?.vendors ?? []).map((v) => ({ value: v.id, label: v.business_name, hint: vendorOptionHint(v) })),
    [vendorData],
  );

  const save = () => {
    const nextErrors: typeof errors = {};
    if (!description.trim()) nextErrors.description = 'Enter a description';
    if (!amount.trim() || !(parseFloat(amount) > 0)) nextErrors.amount = 'Enter the amount spent';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const amt = parseFloat(amount) || 0;
    const rate = TAX_TYPES.find((t) => t.value === taxType)?.rate ?? 0;
    const pin = (vendorPin.trim() || vendorKraPin(selectedVendor)).toUpperCase();

    const payload: UpdateExpenseRequest = {
      description: description.trim(),
      amount: amt,
      tax_amount: Number(((amt * rate) / 100).toFixed(2)),
      currency,
      expense_date: expenseDate || undefined,
      category_id: categoryId || undefined,
      billable,
      // The nil UUID clears a value that was set; undefined leaves it unchanged.
      cost_center_id: costCenterId || (expense.cost_center_id ? NIL_UUID : undefined),
      vendor_id: vendorId || (expense.vendor_id ? NIL_UUID : undefined),
      metadata: {
        ...(expense.metadata ?? {}),
        tax_type: taxType,
        project_id: projectId || undefined,
        vendor_name: vendorName.trim() || undefined,
        supplier_name: vendorName.trim() || undefined,
        supplier_kra_pin: pin || undefined,
      },
    };

    updateExpense.mutate(
      { id: expense.id, data: payload },
      {
        onSuccess: (updated) => {
          toast.success(`Expenditure ${expense.expense_number ?? ''} updated`);
          onSaved?.(updated as Expense);
          onClose();
        },
        onError: (err: any) => {
          if (err?.response?.status === 409) {
            toast.error('This expense can no longer be edited. Only drafts are editable.');
            return;
          }
          toast.error(err?.response?.data?.error ?? 'Failed to update expenditure. Please try again.');
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !updateExpense.isPending && onClose()}>
      <DialogContent
        title={`Edit ${expense.expense_number ?? 'Expenditure'}`}
        description="Update this draft expense."
        className="max-w-3xl"
        onClose={updateExpense.isPending ? undefined : onClose}
      >
        <div className="space-y-6">
          <section className="space-y-4">
            <SectionTitle hint="When the spend happened and how to classify it.">Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              <FormField label="Expense Date">
                <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Category">
                <CategoryCombobox tenantIdOrSlug={tenant} value={categoryId} onChange={setCategoryId} />
              </FormField>
              <FormField label="Description" required error={errors.description} className="md:col-span-2">
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setErrors((er) => ({ ...er, description: undefined })); }}
                  rows={2}
                  className={cn(inputClass, 'resize-y')}
                />
              </FormField>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <SectionTitle hint="Who was paid. The KRA PIN lets a paid taxable expense claim input VAT on eTIMS.">Vendor</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
              <FormField label="Vendor">
                <Combobox
                  options={vendorOptions}
                  value={vendorId}
                  onChange={setVendorId}
                  valueLabel={selectedVendor?.business_name || vendorName || undefined}
                  placeholder="No vendor"
                  searchPlaceholder="Search vendors…"
                  emptyText="No vendors yet"
                  onRemoteSearch={searchVendors}
                />
              </FormField>
              <FormField label="Vendor's Name">
                <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Supplier KRA PIN">
                <input
                  value={vendorPin}
                  onChange={(e) => setVendorPin(e.target.value.toUpperCase())}
                  placeholder={pinPlaceholder}
                  className={inputClass}
                />
              </FormField>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <SectionTitle hint="The amount, tax, currency and where it is budgeted.">Amount &amp; Posting</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
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
              <FormField label="Tax Type">
                <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className={inputClass}>
                  {TAX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Cost Centre">
                <CostCenterCombobox tenant={tenant} value={costCenterId} onChange={setCostCenterId} />
              </FormField>
              <FormField label="Project" className="md:col-span-2">
                <ProjectCombobox tenant={tenant} value={projectId} onChange={setProjectId} />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => setBillable((b) => !b)}
              className="flex items-start gap-3 text-left w-full rounded-lg border border-border p-3 hover:bg-accent/10 transition-colors"
            >
              <span className={cn('mt-0.5 h-5 w-9 rounded-full transition-colors relative shrink-0', billable ? 'bg-primary' : 'bg-accent')}>
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', billable ? 'left-4.5' : 'left-0.5')} />
              </span>
              <span>
                <span className="block text-sm font-semibold">Billable to customer</span>
                <span className="block text-xs text-muted-foreground">Recharge this cost on the customer&apos;s invoice.</span>
              </span>
            </button>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
            <Button variant="outline" onClick={onClose} disabled={updateExpense.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={updateExpense.isPending}>
              {updateExpense.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
