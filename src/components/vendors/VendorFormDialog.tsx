'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useCreateVendor } from '@/hooks/use-inventory';
import { supplierFormToVendorRequest, type Vendor } from '@/lib/api/inventory';
import { CountrySelect, countryName } from '@bengo-hub/shared-ui-lib/contact';
import { SupplierForm } from '@bengo-hub/shared-ui-lib/suppliers';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  tenant: string;
  /** Prefill for the supplier name (e.g. what the user was searching for). */
  initialName?: string;
  onClose: () => void;
  /** The created vendor (inventory supplier master), ready to select in the calling form. */
  onCreated: (vendor: Vendor) => void;
}

/**
 * Inline "Add New Vendor" dialog for any vendor picker (expenses, bills). Creates the supplier in
 * the inventory-api master through treasury-api's proxy with the same shared SupplierForm and the
 * same mapper as the Add Vendor page, then hands the created vendor back so the form can select it
 * and prefill its KRA PIN without leaving the page.
 */
export function VendorFormDialog({ open, tenant, initialName, onClose, onCreated }: Props) {
  const createVendor = useCreateVendor(tenant);
  const [country, setCountry] = useState('Kenya');
  const created = useRef<Vendor | null>(null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Add New Vendor"
        description="Saved to your supplier list and selected on this form."
        className="max-w-2xl"
        onClose={onClose}
      >
        <div className="space-y-5">
          <FormField label="Country" required className="max-w-md">
            <CountrySelect
              value={country}
              onChange={(iso) => setCountry(countryName(iso))}
              placeholder="-Select a Country-"
            />
          </FormField>
          <SupplierForm
            initialValues={initialName ? { name: initialName } : undefined}
            submitLabel="Save Vendor"
            onSubmit={async (values) => {
              const vendor = await createVendor.mutateAsync(supplierFormToVendorRequest(values, country));
              created.current = vendor;
              return { id: vendor.id, name: vendor.business_name };
            }}
            onSuccess={() => {
              const vendor = created.current;
              if (!vendor) return;
              toast.success(`Vendor "${vendor.business_name}" created`);
              onCreated(vendor);
            }}
            onError={(message) => toast.error(message || 'Failed to create vendor. Please try again.')}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
