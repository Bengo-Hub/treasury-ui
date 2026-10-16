'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useCreateVendor, useSupplierRecord, useUpdateVendor } from '@/hooks/use-inventory';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { supplierRecordToForm, type Vendor } from '@/lib/api/inventory';
import { fetchTenantDefaults } from '@/lib/api/tenant';
import { selfVendorReason } from '@/lib/vendor-self';
import { useQuery } from '@tanstack/react-query';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

  // The business's own name and KRA PIN, to warn (not block) when a vendor is the business itself.
  const { orgSlug } = useResolvedTenant();
  const ownSlug = tenant && !UUID_RE.test(tenant) ? tenant : orgSlug;
  const { data: own } = useQuery({
    queryKey: ['tenant-defaults', ownSlug],
    queryFn: () => fetchTenantDefaults(ownSlug ?? ''),
    enabled: open && !!ownSlug,
    staleTime: 10 * 60 * 1000,
  });
  const [selfWarning, setSelfWarning] = useState<{ key: string; reason: string } | null>(null);
  useEffect(() => setSelfWarning(null), [open, vendorId]);

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
            {selfWarning && (
              <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                This vendor looks like your own business: {selfWarning.reason}. Buying from yourself is unusual; if this is
                right (for example a branch billing head office), press save again.
              </div>
            )}
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
                // A vendor that matches the business itself needs a second Save with the same details.
                // An edit of a vendor that already matched was kept on purpose; do not ask again.
                const ownBiz = own ? { name: own.name, taxPin: own.taxPin } : null;
                const alreadyKept =
                  editing && !!seeded && !!selfVendorReason({ name: seeded.values.name, taxPin: seeded.values.tax_pin }, ownBiz);
                const reason = alreadyKept ? null : selfVendorReason({ name: values.name, taxPin: values.tax_pin }, ownBiz);
                const key = `${values.name}|${values.tax_pin ?? ''}`;
                if (reason && selfWarning?.key !== key) {
                  setSelfWarning({ key, reason });
                  throw new Error('This vendor looks like your own business. Check the details, then save again to keep it.');
                }
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
