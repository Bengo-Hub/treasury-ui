'use client';

import { useMemo } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useCostCenters } from '@/hooks/use-cost-centers';

/**
 * Searchable picker over the tenant's active cost centres. Tagging spend with a cost centre is
 * what lets budgets and the cost-centre profit report count it, so every spend form uses this.
 */
export function CostCenterCombobox({
  tenant,
  value,
  onChange,
  placeholder = 'No cost centre',
}: {
  tenant: string;
  value: string | undefined;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const { data, isLoading } = useCostCenters(tenant, { active_only: true });
  const options = useMemo(
    () => (data?.cost_centers ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.code || undefined })),
    [data],
  );
  return (
    <Combobox
      options={options}
      value={value ?? ''}
      onChange={onChange}
      loading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="Search cost centres"
      emptyText="No cost centres. Add them under Settings."
    />
  );
}
