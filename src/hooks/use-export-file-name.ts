'use client';

import { useCallback } from 'react';
import { useBranding } from '@/providers/branding-provider';
import { useOutletFilterStore } from '@/store/outlet-filter';
import { exportFileName } from '@/lib/utils/export-file-name';

/**
 * exportFileName bound to the current tenant (branding context) and, for outlet-scoped exports,
 * the outlet picked in the header filter (the data is filtered to it, so the file says so). Pass
 * `{ outletScoped: false }` for exports that are tenant-wide whatever the filter (e.g. payouts).
 */
export function useExportFileName({ outletScoped = true }: { outletScoped?: boolean } = {}) {
  const { tenant } = useBranding();
  const name = tenant?.name || tenant?.orgName || '';
  const outlet = useOutletFilterStore((s) => s.selectedOutlet?.name);
  const outletName = outletScoped ? outlet ?? '' : '';
  return useCallback((document: string, ext: string) => exportFileName(name, outletName, document, ext), [name, outletName]);
}
