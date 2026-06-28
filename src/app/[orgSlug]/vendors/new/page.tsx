'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { Combobox } from '@/components/ui/combobox';
import { FormField } from '@/components/ui/form-field';
import { useCreateVendor } from '@/hooks/use-inventory';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { CreateVendorRequest } from '@/lib/api/inventory';
import { SupplierForm, type SupplierFormValues } from '@bengo-hub/shared-ui-lib/suppliers';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

// Static reference list (not sensitive config). The shared SupplierForm doesn't capture
// a country, but treasury's vendor (inventory Supplier) create needs one, so we keep a
// small selector here and merge it into the payload.
const COUNTRIES = [
  'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan',
  'Ethiopia', 'Nigeria', 'Ghana', 'South Africa', 'Egypt',
  'United Kingdom', 'United States', 'India', 'United Arab Emirates', 'China',
];

/**
 * Maps the shared SupplierForm payload onto treasury's CreateVendorRequest (the nested
 * vendor shape that src/lib/api/inventory.ts flattens before proxying to inventory-api's
 * POST /{tenant}/inventory/suppliers via the treasury-api S2S route).
 */
function toCreateVendorRequest(v: SupplierFormValues, country: string): CreateVendorRequest {
  const payload: CreateVendorRequest = {
    business_name: v.name.trim(),
    country: country.trim() || 'Kenya',
  };
  if (v.phone?.trim()) payload.phone = v.phone.trim();
  if (v.email?.trim()) payload.email = v.email.trim();
  if (v.notes?.trim()) payload.notes = v.notes.trim();

  const taxId = v.tax_number?.trim() || v.tax_pin?.trim();
  if (taxId) payload.tax_info = { tax_id: taxId };

  if (v.address?.trim()) payload.address = { line1: v.address.trim() };

  const bank: NonNullable<CreateVendorRequest['bank_details']> = {};
  if (v.bank_name?.trim()) bank.bank_name = v.bank_name.trim();
  if (v.bank_account_number?.trim()) bank.account_number = v.bank_account_number.trim();
  if (v.bank_branch?.trim()) bank.branch = v.bank_branch.trim();
  if (Object.keys(bank).length) payload.bank_details = bank;

  if (v.payment_terms_days != null) {
    payload.account_details = { payment_terms_days: v.payment_terms_days };
  }

  return payload;
}

export default function AddVendorPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const createVendor = useCreateVendor(effectiveTenant);
  const [country, setCountry] = useState('Kenya');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${orgSlug}/vendors`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Vendor</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create a new vendor / supplier record.</p>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Adding to your own organization. Drill into a tenant via the filter above to add to theirs.
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Vendor Details</h3>
            <p className="text-xs text-muted-foreground/70">Where the vendor is based and how to reach them.</p>
          </div>

          <FormField label="Country" required className="max-w-md">
            <Combobox
              options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              value={country}
              onChange={setCountry}
              placeholder="-Select a Country-"
              clearable={false}
            />
          </FormField>

          {/* Shared, props-driven supplier form. Treasury passes its own S2S-backed
              create fn (createVendor → POST /{tenant}/inventory/suppliers) to onSubmit. */}
          <SupplierForm
            submitLabel="Save Vendor"
            onSubmit={async (values) => {
              const vendor = await createVendor.mutateAsync(toCreateVendorRequest(values, country));
              return { id: vendor.id, name: vendor.business_name };
            }}
            onSuccess={(supplier) => {
              toast.success(`Vendor "${supplier?.name ?? 'vendor'}" created`);
              router.push(`/${orgSlug}/vendors`);
            }}
            onError={(message) => toast.error(message || 'Failed to create vendor. Please try again.')}
            onCancel={() => router.push(`/${orgSlug}/vendors`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
