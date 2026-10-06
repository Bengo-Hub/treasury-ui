'use client';

import { Button, Card, CardContent } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { useCreateVendor } from '@/hooks/use-inventory';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { supplierFormToVendorRequest } from '@/lib/api/inventory';
import { SupplierForm } from '@bengo-hub/shared-ui-lib/suppliers';
import { CountrySelect, countryName } from '@bengo-hub/shared-ui-lib/contact';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

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
            {/* CountrySelect's value/onChange are ISO codes; the vendor payload stores a full
                country name (see supplierFormToVendorRequest), so onChange converts back via
                countryName(). A legacy/current name value like "Kenya" doesn't match any ISO
                option, so CountrySelect shows it via its own valueLabel fallback — still
                correct, just not "selected" until the user actively re-picks. */}
            <CountrySelect
              value={country}
              onChange={(iso) => setCountry(countryName(iso))}
              placeholder="-Select a Country-"
            />
          </FormField>

          {/* Shared, props-driven supplier form. Treasury passes its own S2S-backed
              create fn (createVendor → POST /{tenant}/inventory/suppliers) to onSubmit. */}
          <SupplierForm
            submitLabel="Save Vendor"
            onSubmit={async (values) => {
              const vendor = await createVendor.mutateAsync(supplierFormToVendorRequest(values, country));
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
