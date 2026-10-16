'use client';

import { InfoTip } from '@/components/ui/info-tip';
import { useVendors, useVendorSearch } from '@/hooks/use-inventory';
import { crmContactDisplayName, searchCRMContacts } from '@/lib/api/crm';
import { listStaffPayees, type PayeeType } from '@/lib/api/ledger';
import { vendorOptionHint } from '@/lib/vendor-balance';
import { cn } from '@/lib/utils';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

export type PayeeSource = PayeeType | 'other';

export interface PayeeValue {
  source: PayeeSource;
  /** Linked record id; empty for a name typed for someone not in the system. */
  id: string;
  name: string;
}

export const emptyPayee = (source: PayeeSource = 'supplier'): PayeeValue => ({ source, id: '', name: '' });

const SOURCES: { value: PayeeSource; label: string }[] = [
  { value: 'supplier', label: 'Supplier' },
  { value: 'customer', label: 'Customer' },
  { value: 'staff', label: 'Staff' },
  { value: 'other', label: 'Not in system' },
];

/**
 * Who was paid (or who paid). Pick a supplier, a CRM customer or one of the business's own users
 * from a searchable list, or type the name of someone not in the system, such as a casual worker.
 * A picked payee is stored as a link (id and type); a typed one only as a name.
 */
export function PayeePicker({
  tenant,
  label,
  value,
  onChange,
  compact = false,
}: {
  tenant: string;
  label: string;
  value: PayeeValue;
  onChange: (v: PayeeValue) => void;
  /** For a table cell (a voucher line): the type is a small select above the field, with no heading. */
  compact?: boolean;
}) {
  const { data: vendorData } = useVendors(tenant, undefined, !!tenant && value.source === 'supplier');
  const searchVendors = useVendorSearch(tenant);
  const supplierOptions = useMemo<ComboboxOption[]>(
    () => (vendorData?.vendors ?? []).map((v) => ({ value: v.id, label: v.business_name, hint: vendorOptionHint(v) })),
    [vendorData],
  );
  const searchCustomers = useCallback(
    async (q: string): Promise<ComboboxOption[]> => {
      if (q.trim().length < 2) return [];
      const rows = await searchCRMContacts(tenant, q.trim(), 20);
      return rows.map((c) => ({ value: c.id, label: crmContactDisplayName(c), hint: c.phone || c.email || undefined }));
    },
    [tenant],
  );
  // Staff is a short list: the first page is shown as soon as the picker opens.
  const { data: staffData } = useQuery({
    queryKey: ['staff-payees', tenant],
    queryFn: () => listStaffPayees(tenant),
    enabled: !!tenant && value.source === 'staff',
    staleTime: 60_000,
  });
  const staffOptions = useMemo<ComboboxOption[]>(
    () => (staffData?.staff ?? []).map((u) => ({ value: u.id, label: u.email })),
    [staffData],
  );
  const searchStaff = useCallback(
    async (q: string): Promise<ComboboxOption[]> => {
      const res = await listStaffPayees(tenant, q.trim());
      return (res.staff ?? []).map((u) => ({ value: u.id, label: u.email }));
    },
    [tenant],
  );

  const pick = (id: string, option?: ComboboxOption) =>
    onChange({ source: value.source, id, name: id ? option?.label ?? value.name : '' });

  const field = value.source === 'other' ? (
    <input
      value={value.name}
      onChange={(e) => onChange({ source: 'other', id: '', name: e.target.value })}
      placeholder={compact ? 'Name, e.g. John Otieno' : 'Full name, for example John Otieno (casual)'}
      aria-label={compact ? `${label} name` : undefined}
      className={compact
        ? 'w-full rounded border border-input bg-transparent px-2 py-1.5 text-xs'
        : 'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm'}
    />
  ) : (
    <SearchableCombobox
      key={value.source}
      options={value.source === 'supplier' ? supplierOptions : value.source === 'staff' ? staffOptions : []}
      value={value.id}
      valueLabel={value.name || undefined}
      onChange={pick}
      onRemoteSearch={value.source === 'supplier' ? searchVendors : value.source === 'customer' ? searchCustomers : searchStaff}
      remoteThreshold={value.source === 'customer' ? 1000 : 5}
      placeholder={value.source === 'supplier' ? 'Search suppliers' : value.source === 'customer' ? 'Type a customer name' : 'Search staff by email'}
      searchPlaceholder="Type to search"
      emptyText="No match. Choose Not in system to type a name."
      clearable
    />
  );

  if (compact) {
    return (
      <div className="space-y-1">
        <select
          value={value.source}
          onChange={(e) => onChange(emptyPayee(e.target.value as PayeeSource))}
          aria-label={`${label}: type`}
          className="w-full rounded border border-input bg-transparent px-1.5 py-1 text-[11px] text-muted-foreground"
        >
          {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {field}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-sm font-medium">
          {label}
          <InfoTip
            align="left"
            text="Pick a supplier, a customer or a staff member from the list, or choose Not in system and type the name, for example a casual worker paid in cash."
          />
        </span>
        <div className="flex rounded-lg border border-border p-0.5 text-[11px]" role="group" aria-label="Payee type">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={value.source === s.value}
              onClick={() => onChange(emptyPayee(s.value))}
              className={cn(
                'rounded-md px-2 py-0.5 font-medium transition-colors',
                value.source === s.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {field}
    </div>
  );
}
