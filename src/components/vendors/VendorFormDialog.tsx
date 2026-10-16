'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useCreateVendor, useSupplierRecord, useUpdateVendor } from '@/hooks/use-inventory';
import { supplierRecordToForm, type Vendor } from '@/lib/api/inventory';
import { CountrySelect, countryName } from '@bengo-hub/shared-ui-lib/contact';
import { SupplierForm } from '@bengo-hub/shared-ui-lib/suppliers';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  tenant: string;
  /** Edit this vendor instead of adding one. */
  vendorId?: string | null;
  /** Prefill for the supplier name when adding (e.g. what the user was searching for). */
  initialName?: string;
  /** Subtitle; defaults to the picker wording (the new vendor is selected on the calling form). */
  description?: string;
  onClose: () => void;
  /** The created or updated vendor (inventory supplier master). */
  onCreated: (vendor: Vendor) => void;
}

/**
 * Add or edit a vendor with the shared SupplierForm. Vendors live in the inventory-api supplier
 * master, reached through treasury-api's proxy. Adding hands the new vendor back so a calling form
 * can select it; editing starts from the stored record so fields the form does not show are kept.
 */
export function VendorFormDialog({
  open,
  tenant,
  vendorId,
  initialName,
  description,
  onClose,
  onCreated,
}: Props) {
  const editing = !!vendorId;
  const createVendor = useCreateVendor(tenant);
  const updateVendor = useUpdateVendor(tenant);
  const { data: record, isLoading } = useSupplierRecord(tenant, open && editing ? vendorId ?? null : null);
  const seeded = useMemo(() => (record ? supplierRecordToForm(record) : null), [record]);
  const [country, setCountry] = useState('Kenya');
  const saved = useRef<Vendor | null>(null);

  useEffect(() => {
    if (seeded) setCountry(seeded.country);
    else if (!editing) setCountry('Kenya');
  }, [seeded, editing, open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={editing ? 'Edit Vendor' : 'Add New Vendor'}
        description={
          description ??
          (editing ? 'Changes are saved to your supplier list.' : 'Saved to your supplier list and selected on this form.')
        }
        className="max-w-2xl"
        onClose={onClose}
      >
        {editing && (isLoading || !seeded) ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the vendor…
          </div>
        ) : (
          <div className="space-y-5">
            <FormField label="Country" required className="max-w-md">
              <CountrySelect
                value={country}
                onChange={(iso) => setCountry(countryName(iso))}
                placeholder="-Select a Country-"
              />
            </FormField>
            <SupplierForm
              key={editing ? `edit-${vendorId}` : 'add'}
              isEdit={editing}
              initialValues={editing ? seeded?.values : initialName ? { name: initialName } : undefined}
              submitLabel={editing ? 'Save Changes' : 'Save Vendor'}
              onSubmit={async (values) => {
                const vendor = editing
                  ? await updateVendor.mutateAsync({ id: vendorId as string, values, country })
                  : await createVendor.mutateAsync({ values, country });
                saved.current = vendor as Vendor;
                return { id: (vendor as Vendor).id, name: (vendor as Vendor).business_name };
              }}
              onSuccess={() => {
                const vendor = saved.current;
                if (!vendor) return;
                toast.success(editing ? `Vendor "${vendor.business_name}" updated` : `Vendor "${vendor.business_name}" created`);
                onCreated(vendor);
              }}
              onError={(message) =>
                toast.error(message || (editing ? 'Failed to update the vendor.' : 'Failed to create vendor. Please try again.'))
              }
              onCancel={onClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
