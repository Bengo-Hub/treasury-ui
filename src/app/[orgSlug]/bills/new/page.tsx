'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { Combobox } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/form-field';
import { useBills, useCreateBill } from '@/hooks/use-bills';
import { useVendors } from '@/hooks/use-inventory';
import { useOrgBranding } from '@/hooks/use-org-branding';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useSupportedCurrencies } from '@/hooks/use-currencies';
import type { CreateBillRequest } from '@/lib/api/bills';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface PurchaseLine {
  description: string;
  taxRate: string;
  quantity: string;
  rate: string;
}

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const emptyLine = (): PurchaseLine => ({ description: '', taxRate: '0', quantity: '1', rate: '0' });

function lineAmounts(line: PurchaseLine) {
  const qty = parseFloat(line.quantity) || 0;
  const rate = parseFloat(line.rate) || 0;
  const taxRate = parseFloat(line.taxRate) || 0;
  const amount = qty * rate;
  const tax = (amount * taxRate) / 100;
  return { amount, tax, total: amount + tax };
}

export default function NewPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const { data: brand } = useOrgBranding(orgSlug);
  const orgName = brand?.orgName || brand?.name || 'Your Business';

  const createBill = useCreateBill(effectiveTenant);
  const { data: vendorData } = useVendors(effectiveTenant, undefined, !!effectiveTenant);
  const vendorOptions = useMemo(
    () => (vendorData?.vendors ?? []).map((v) => ({ value: v.id, label: v.business_name, hint: v.country })),
    [vendorData],
  );

  const { data: currencyData } = useSupportedCurrencies();
  const currencyOptions = useMemo(() => {
    const codes = (currencyData?.currencies ?? []).map((c) => c.code).filter(Boolean);
    const list = codes.length ? codes : ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'];
    return list.map((code) => ({ value: code, label: code }));
  }, [currencyData]);

  // Auto-suggest the next expense number from existing bills count.
  const { data: existingBills } = useBills(effectiveTenant, undefined, !!effectiveTenant);
  const suggestedExpenseNo = useMemo(() => {
    const n = (existingBills?.total ?? existingBills?.bills?.length ?? 0) + 1;
    return `A${String(n).padStart(5, '0')}`;
  }, [existingBills]);

  const [title, setTitle] = useState('Purchase');
  const [expenseNo, setExpenseNo] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [dueDate, setDueDate] = useState(plusDays(15));
  const [vendorId, setVendorId] = useState<string>('');
  const [currency, setCurrency] = useState('KES');
  const [lines, setLines] = useState<PurchaseLine[]>([emptyLine()]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [displayUnitAs, setDisplayUnitAs] = useState('merge');
  const [showTaxSummary, setShowTaxSummary] = useState('hide');
  const [errors, setErrors] = useState<{ vendor?: string; lines?: string }>({});

  const selectedVendor = vendorData?.vendors?.find((v) => v.id === vendorId);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        const { amount, tax, total } = lineAmounts(l);
        acc.amount += amount;
        acc.tax += tax;
        acc.total += total;
        return acc;
      },
      { amount: 0, tax: 0, total: 0 },
    );
  }, [lines]);

  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== idx) : ls));
  const updateLine = (idx: number, field: keyof PurchaseLine, value: string) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLogoPreview(URL.createObjectURL(file));
  };

  const buildPayload = (): CreateBillRequest | null => {
    const nextErrors: typeof errors = {};
    if (!vendorId) nextErrors.vendor = 'Select a vendor';
    const validLines = lines.filter((l) => l.description.trim() && (parseFloat(l.quantity) || 0) > 0);
    if (validLines.length === 0) nextErrors.lines = 'Add at least one item with a description and quantity';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    return {
      vendor_id: vendorId || undefined,
      vendor_name: selectedVendor?.business_name,
      document_type: 'bill',
      bill_date: purchaseDate,
      due_date: dueDate,
      currency,
      lines: validLines.map((l) => {
        const { tax } = lineAmounts(l);
        return {
          description: l.description.trim(),
          quantity: parseFloat(l.quantity) || 0,
          unit_price: parseFloat(l.rate) || 0,
          tax_amount: Number(tax.toFixed(2)),
        };
      }),
      metadata: {
        title: title.trim() || 'Purchase',
        expense_no: expenseNo.trim() || suggestedExpenseNo,
        invoice_no: invoiceNo.trim() || undefined,
        is_recurring: isRecurring,
        display: { display_unit_as: displayUnitAs, show_tax_summary: showTaxSummary },
      },
    };
  };

  const save = (after: 'list' | 'new') => {
    const payload = buildPayload();
    if (!payload) return;
    createBill.mutate(payload, {
      onSuccess: (bill) => {
        toast.success(`Purchase ${bill?.bill_number ?? ''} created`);
        if (after === 'new') {
          setTitle('Purchase');
          setExpenseNo('');
          setInvoiceNo('');
          setPurchaseDate(today());
          setDueDate(plusDays(15));
          setVendorId('');
          setLines([emptyLine()]);
          setIsRecurring(false);
          setLogoPreview(null);
          setErrors({});
        } else {
          router.push(`/${orgSlug}/bills`);
        }
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error ?? 'Failed to create purchase. Please try again.');
      },
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${orgSlug}/bills`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create New Purchase</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
          Purchase Details
        </span>
        <span className="text-muted-foreground">›</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-6 w-6 rounded-full bg-accent flex items-center justify-center text-xs">2</span>
          Design &amp; Share <span className="text-xs">(optional)</span>
        </span>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Creating for your own organization. Drill into a tenant via the filter above to create for theirs.
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-8">
          {/* Title */}
          <div className="text-center">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-3xl font-black text-center bg-transparent border-b border-dashed border-border focus:border-primary focus:outline-none px-2 pb-1"
              aria-label="Purchase title"
            />
          </div>

          {/* Meta + logo */}
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <div className="space-y-4 max-w-md">
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <label className="text-sm font-semibold">Expense No<span className="text-destructive">*</span></label>
                <input value={expenseNo} onChange={(e) => setExpenseNo(e.target.value)} placeholder={suggestedExpenseNo} className={inputClass} />
                <label className="text-sm font-semibold">Invoice No</label>
                <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Enter Invoice Number" className={inputClass} />
                <label className="text-sm font-semibold">Purchase Date<span className="text-destructive">*</span></label>
                <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputClass} />
                <label className="text-sm font-semibold">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
              </div>
            </div>

            <label className="group flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-accent/10 px-6 py-6 text-center cursor-pointer hover:border-primary/50 transition-colors h-fit w-56">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Business logo preview" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              <span className="text-sm font-semibold">Add Business Logo</span>
              <span className="text-[11px] text-muted-foreground">Resolution up to 1080×1080px. PNG or JPEG file.</span>
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogoChange} />
            </label>
          </div>

          {/* Billed To / Billed By */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold border-b-2 border-primary inline-block pb-0.5 mb-3">
                Billed To <span className="font-normal text-muted-foreground">(Your Details)</span>
              </h3>
              <div className="rounded-lg border border-border bg-accent/10 px-4 py-3">
                <p className="font-bold text-sm">{orgName}</p>
                <p className="text-xs text-muted-foreground mt-1">Your registered business details.</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold border-b-2 border-primary inline-block pb-0.5 mb-3">
                Billed By <span className="font-normal text-muted-foreground">(Vendor&apos;s Details)</span>
              </h3>
              <Combobox
                options={vendorOptions}
                value={vendorId}
                onChange={(v) => {
                  setVendorId(v);
                  setErrors((e) => ({ ...e, vendor: undefined }));
                }}
                placeholder="Select Vendor"
                searchPlaceholder="Search vendors…"
                emptyText="No vendors yet"
              />
              {errors.vendor && <p className="text-[11px] text-destructive font-medium mt-1">{errors.vendor}</p>}
              <div className="rounded-lg border border-border bg-accent/10 px-4 py-4 mt-3 text-center">
                {selectedVendor ? (
                  <div className="text-left">
                    <p className="font-bold text-sm">{selectedVendor.business_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[selectedVendor.city, selectedVendor.country].filter(Boolean).join(', ')}
                    </p>
                    {selectedVendor.email && <p className="text-xs text-muted-foreground">{selectedVendor.email}</p>}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Select Vendor/Business from the list</p>
                    <p className="text-xs text-muted-foreground my-1">OR</p>
                    <Button variant="primary" size="sm" onClick={() => router.push(`/${orgSlug}/vendors/new`)}>
                      <UserPlus className="h-4 w-4 mr-1.5" /> Add New Vendor
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Currency */}
          <div className="flex justify-end">
            <FormField label="Currency" required className="w-56">
              <Combobox options={currencyOptions} value={currency} onChange={setCurrency} clearable={false} />
            </FormField>
          </div>

          {/* Line items */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left px-4 py-3 font-semibold">Item</th>
                  <th className="text-right px-3 py-3 font-semibold w-24">TAX Rate</th>
                  <th className="text-right px-3 py-3 font-semibold w-20">Quantity</th>
                  <th className="text-right px-3 py-3 font-semibold w-28">Rate</th>
                  <th className="text-right px-3 py-3 font-semibold w-28">Amount</th>
                  <th className="text-right px-3 py-3 font-semibold w-28">TAX</th>
                  <th className="text-right px-4 py-3 font-semibold w-32">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((line, idx) => {
                  const { amount, tax, total } = lineAmounts(line);
                  return (
                    <tr key={idx} className="align-top">
                      <td className="px-4 py-3">
                        <input
                          value={line.description}
                          onChange={(e) => updateLine(idx, 'description', e.target.value)}
                          placeholder="Item Name / SKU Id"
                          className={inputClass}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={line.taxRate}
                            onChange={(e) => updateLine(idx, 'taxRate', e.target.value)}
                            className={cn(inputClass, 'text-right')}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                          className={cn(inputClass, 'text-right')}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={line.rate}
                          onChange={(e) => updateLine(idx, 'rate', e.target.value)}
                          className={cn(inputClass, 'text-right')}
                        />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(amount, currency)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(tax, currency)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold">{formatCurrency(total, currency)}</td>
                      <td className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {errors.lines && <p className="text-[11px] text-destructive font-medium -mt-4">{errors.lines}</p>}

          <Button variant="outline" onClick={addLine} className="w-full border-dashed">
            <Plus className="h-4 w-4 mr-1.5" /> Add New Line
          </Button>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 rounded-lg border border-border p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="tabular-nums">{formatCurrency(totals.amount, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TAX</span>
                <span className="tabular-nums">{formatCurrency(totals.tax, currency)}</span>
              </div>
              <div className="flex justify-between text-base font-black border-t border-border pt-2">
                <span>Total ({currency})</span>
                <span className="tabular-nums">{formatCurrency(totals.total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Recurring */}
          <button
            type="button"
            onClick={() => setIsRecurring((r) => !r)}
            className="flex items-start gap-3 text-left w-full rounded-lg border border-border p-4 hover:bg-accent/10 transition-colors"
          >
            <span
              className={cn(
                'mt-0.5 h-5 w-9 rounded-full transition-colors relative shrink-0',
                isRecurring ? 'bg-primary' : 'bg-accent',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
                  isRecurring ? 'left-[18px]' : 'left-0.5',
                )}
              />
            </span>
            <span>
              <span className="block text-sm font-semibold">This is a Recurring purchase</span>
              <span className="block text-xs text-muted-foreground">A draft purchase will be created with the same details every next period.</span>
            </span>
          </button>

          {/* Advanced options */}
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-bold">Advanced options</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showAdvanced && 'rotate-180')} />
            </button>
            {showAdvanced && (
              <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
                <FormField label="Display unit as">
                  <select value={displayUnitAs} onChange={(e) => setDisplayUnitAs(e.target.value)} className={inputClass}>
                    <option value="merge">Merge with quantity</option>
                    <option value="separate">Separate column</option>
                    <option value="hidden">Do not show</option>
                  </select>
                </FormField>
                <FormField label="Show tax summary in invoice">
                  <select value={showTaxSummary} onChange={(e) => setShowTaxSummary(e.target.value)} className={inputClass}>
                    <option value="hide">Do not show</option>
                    <option value="show">Show</option>
                  </select>
                </FormField>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="primary" onClick={() => save('list')} disabled={createBill.isPending}>
              {createBill.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save &amp; Continue
            </Button>
            <Button variant="outline" onClick={() => save('new')} disabled={createBill.isPending}>
              Save &amp; Create New
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/${orgSlug}/bills`)} disabled={createBill.isPending}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
