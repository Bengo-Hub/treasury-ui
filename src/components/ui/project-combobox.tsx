'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Combobox } from '@/components/ui/combobox';
import { listProjectOptions } from '@/lib/api/projects';

/**
 * Searchable picker over the tenant's projects. Tagging spend with a project is what puts it in
 * the project's budget actuals and profitability, so every spend form offers it. Closed projects
 * stay selectable only when already chosen.
 */
export function ProjectCombobox({
  tenant,
  value,
  onChange,
  placeholder = 'No project',
  disabled,
}: {
  tenant: string;
  value: string | undefined;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['project-options', tenant],
    queryFn: () => listProjectOptions(tenant),
    enabled: !!tenant,
    staleTime: 60 * 1000,
  });
  const options = useMemo(
    () =>
      (data ?? [])
        .filter((p) => p.id === value || !['completed', 'closed', 'cancelled', 'archived'].includes(p.status ?? ''))
        .map((p) => ({ value: p.id, label: p.name, hint: p.status || undefined })),
    [data, value],
  );
  return (
    <Combobox
      options={options}
      value={value ?? ''}
      onChange={onChange}
      loading={isLoading}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder="Search projects"
      emptyText={isError ? 'Projects are unavailable right now' : 'No projects'}
    />
  );
}
