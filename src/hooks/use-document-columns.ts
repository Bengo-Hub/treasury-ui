'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDocumentColumns,
  saveDocumentColumnPrefs,
  type ColumnDef,
  type ColumnPrefs,
} from '@/lib/api/document-columns';

const STALE_12H = 12 * 60 * 60 * 1000;

export const docColKeys = {
  all: (tenant: string) => ['doc-columns', tenant] as const,
  byType: (tenant: string, docType: string) => ['doc-columns', tenant, docType] as const,
};

export function useDocumentColumns(tenant: string, docType: string) {
  return useQuery({
    queryKey: docColKeys.byType(tenant, docType),
    queryFn: () => getDocumentColumns(tenant, docType),
    enabled: !!tenant && !!docType,
    staleTime: STALE_12H,
    select: (data) => ({
      columns: data.columns,
      userPrefs: data.user_prefs,
    }),
  });
}

export function useSaveDocumentColumns(tenant: string, docType: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: ColumnPrefs) =>
      saveDocumentColumnPrefs(tenant, docType, prefs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: docColKeys.byType(tenant, docType) });
    },
  });
}

/** Build localStorage ColumnPrefs shape from backend ColumnDef array (fallback when API unavailable). */
export function defaultPrefsFromDefs(columns: ColumnDef[]): ColumnPrefs {
  return {
    table: columns.filter((c) => c.default_table).map((c) => c.key),
    csv: columns.filter((c) => c.default_csv).map((c) => c.key),
    pdf: columns.filter((c) => c.default_pdf).map((c) => c.key),
  };
}
