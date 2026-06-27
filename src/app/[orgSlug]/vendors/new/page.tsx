'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { Combobox } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/form-field';
import { MultiSelect } from '@/components/ui/multi-select';
import { useCRMContacts } from '@/hooks/use-crm-contacts';
import { crmContactDisplayName } from '@/lib/api/crm';
import { useCreateVendor } from '@/hooks/use-inventory';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useSupportedCurrencies } from '@/hooks/use-currencies';
import type { CreateVendorRequest } from '@/lib/api/inventory';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  Loader2,
  X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

// Static reference lists (not sensitive config).
const INDUSTRIES = [
  'Agriculture', 'Automotive', 'Construction', 'Consulting', 'Education',
  'Energy & Utilities', 'Financial Services', 'Food & Beverage', 'Government',
  'Healthcare', 'Hospitality', 'Information Technology', 'Logistics & Transport',
  'Manufacturing', 'Media & Entertainment', 'Non-Profit', 'Real Estate',
  'Retail & Wholesale', 'Telecommunications', 'Other',
];

const COUNTRIES = [
  'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan',
  'Ethiopia', 'Nigeria', 'Ghana', 'South Africa', 'Egypt',
  'United Kingdom', 'United States', 'India', 'United Arab Emirates', 'China',
];

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {title}
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          {badge}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

export default function AddVendorPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const createVendor = useCreateVendor(effectiveTenant);
  const { data: currencyData } = useSupportedCurrencies();
  const currencyOptions = useMemo(() => {
    const codes = (currencyData?.currencies ?? []).map((c) => c.code).filter(Boolean);
    const list = codes.length ? codes : ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'];
    return list.map((code) => ({ value: code, label: code }));
  }, [currencyData]);

  // Required
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [city, setCity] = useState('');

  // Logo (preview only — binary upload requires a dedicated endpoint).
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Tax
  const [taxId, setTaxId] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  // Address
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Contact / additional
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');

  // Linked contacts (CRM)
  const [contactQuery, setContactQuery] = useState('');
  const [linkedContacts, setLinkedContacts] = useState<string[]>([]);
  const { data: crmContacts = [] } = useCRMContacts(effectiveTenant, contactQuery);
  const contactOptions = useMemo(
    () => crmContacts.map((c) => ({ value: c.id, label: crmContactDisplayName(c) })),
    [crmContacts],
  );

  // Bank
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [swift, setSwift] = useState('');

  // Account details
  const [currency, setCurrency] = useState('KES');
  const [openingBalance, setOpeningBalance] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const [errors, setErrors] = useState<{ businessName?: string; country?: string }>({});

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = () => {
    const nextErrors: typeof errors = {};
    if (!businessName.trim()) nextErrors.businessName = 'Business name is required';
    if (!country.trim()) nextErrors.country = 'Country is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const clean = <T extends Record<string, unknown>>(obj: T): T | undefined => {
      const entries = Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null);
      return entries.length ? (Object.fromEntries(entries) as T) : undefined;
    };

    const payload: CreateVendorRequest = {
      business_name: businessName.trim(),
      country: country.trim(),
      ...(industry ? { industry } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(website.trim() ? { website: website.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(linkedContacts.length ? { linked_contact_ids: linkedContacts } : {}),
    };

    const taxInfo = clean({ tax_id: taxId.trim(), vat_number: vatNumber.trim() });
    if (taxInfo) payload.tax_info = taxInfo;

    const address = clean({
      line1: line1.trim(),
      line2: line2.trim(),
      state: state.trim(),
      postal_code: postalCode.trim(),
    });
    if (address) payload.address = address;

    const bank = clean({
      bank_name: bankName.trim(),
      account_name: accountName.trim(),
      account_number: accountNumber.trim(),
      branch: branch.trim(),
      swift_bic: swift.trim(),
    });
    if (bank) payload.bank_details = bank;

    const account = clean({
      currency,
      opening_balance: openingBalance.trim(),
      ...(paymentTerms.trim() ? { payment_terms_days: Number(paymentTerms) } : {}),
    });
    if (account) payload.account_details = account;

    createVendor.mutate(payload, {
      onSuccess: (vendor) => {
        toast.success(`Vendor "${vendor?.business_name ?? businessName}" created`);
        router.push(`/${orgSlug}/vendors`);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error ?? 'Failed to create vendor. Please try again.');
      },
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${orgSlug}/vendors`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Vendor</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create a new vendor record.</p>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Adding to your own organization. Drill into a tenant via the filter above to add to theirs.
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Logo uploader */}
          <div>
            <label className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-accent/10 px-6 py-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Vendor logo preview" className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ImagePlus className="h-6 w-6" />
                </div>
              )}
              <span className="text-sm font-semibold text-foreground">Upload Logo</span>
              <span className="text-xs text-muted-foreground">JPG or PNG, Dimensions 1080×1080px and file size up to 20MB</span>
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogoChange} />
            </label>
            {logoPreview && (
              <button
                type="button"
                onClick={() => setLogoPreview(null)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" /> Remove logo
              </button>
            )}
          </div>

          {/* Core fields */}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Vendor's Business Name" required error={errors.businessName}>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Business Name (Required)"
                className={inputClass}
              />
            </FormField>
            <FormField label="Vendor Industry">
              <Combobox
                options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
                value={industry}
                onChange={setIndustry}
                placeholder="-Select an Industry-"
              />
            </FormField>
            <FormField label="Select Country" required error={errors.country}>
              <Combobox
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                value={country}
                onChange={setCountry}
                placeholder="-Select a Country-"
                clearable={false}
              />
            </FormField>
            <FormField label="City/Town">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City/Town Name"
                className={inputClass}
              />
            </FormField>
          </div>

          {/* Collapsible optional sections */}
          <div className="-mb-2">
            <Section title="Tax Information">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Tax ID / PIN">
                  <input value={taxId} onChange={(e) => setTaxId(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="VAT Number">
                  <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className={inputClass} />
                </FormField>
              </div>
            </Section>

            <Section title="Address">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Address Line 1" className="sm:col-span-2">
                  <input value={line1} onChange={(e) => setLine1(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Address Line 2" className="sm:col-span-2">
                  <input value={line2} onChange={(e) => setLine2(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="State / Region">
                  <input value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Postal Code">
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputClass} />
                </FormField>
              </div>
            </Section>

            <Section
              title="Linked Contacts"
              badge={
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {linkedContacts.length}
                </span>
              }
            >
              <div className="space-y-3">
                <FormField label="Search CRM Contacts" description="Link existing contacts to this vendor.">
                  <input
                    value={contactQuery}
                    onChange={(e) => setContactQuery(e.target.value)}
                    placeholder="Type a name or email…"
                    className={inputClass}
                  />
                </FormField>
                <MultiSelect
                  options={contactOptions}
                  value={linkedContacts}
                  onChange={setLinkedContacts}
                  placeholder="Select contacts to link"
                />
              </div>
            </Section>

            <Section title="Additional Details">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Phone">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Website">
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Notes" className="sm:col-span-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className={cn(inputClass, 'resize-y')}
                  />
                </FormField>
              </div>
            </Section>

            <Section title="Bank Accounting Details">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Bank Name">
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Account Name">
                  <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Account Number">
                  <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Branch">
                  <input value={branch} onChange={(e) => setBranch(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="SWIFT / BIC">
                  <input value={swift} onChange={(e) => setSwift(e.target.value)} className={inputClass} />
                </FormField>
              </div>
            </Section>

            <Section title="Account Details">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Currency">
                  <Combobox
                    options={currencyOptions}
                    value={currency}
                    onChange={setCurrency}
                    placeholder="Select currency"
                    clearable={false}
                  />
                </FormField>
                <FormField label="Opening Balance">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Payment Terms (days)">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className={inputClass}
                  />
                </FormField>
              </div>
            </Section>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="primary" onClick={handleSave} disabled={createVendor.isPending}>
              {createVendor.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/${orgSlug}/vendors`)} disabled={createVendor.isPending}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
