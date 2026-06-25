import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listSettings,
  updateSetting,
  getFiscalYear,
  updateFiscalYear,
  getFYClosePreview,
  postFYClose,
} from '@/lib/api/settings';
import type { ServiceConfig } from '@/lib/api/settings';

export function useSettings(tenantSlug: string) {
  return useQuery({
    queryKey: ['settings', tenantSlug],
    queryFn: () => listSettings(tenantSlug),
    enabled: !!tenantSlug,
  });
}

export function useUpdateSetting(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, configType }: { key: string; value: any; configType?: string }) =>
      updateSetting(tenantSlug, key, value, configType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', tenantSlug] }),
  });
}

/** Read the tenant's fiscal-year config + the derived current FY window. */
export function useFiscalYear(tenantSlug: string) {
  return useQuery({
    queryKey: ['fiscal-year', tenantSlug],
    queryFn: () => getFiscalYear(tenantSlug),
    enabled: !!tenantSlug,
  });
}

/** Upsert the tenant's fiscal-year config (start month/day). */
export function useUpdateFiscalYear(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { start_month: number; start_day: number }) =>
      updateFiscalYear(tenantSlug, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-year', tenantSlug] }),
  });
}

/**
 * Fetch the write-free fiscal-year close preview. Disabled until `enabled` so the
 * (read-only but compute-heavy) endpoint is only hit when the user opens the panel.
 */
export function useFYClosePreview(tenantSlug: string, fiscalYear: number, enabled: boolean) {
  return useQuery({
    queryKey: ['fy-close-preview', tenantSlug, fiscalYear],
    queryFn: () => getFYClosePreview(tenantSlug, fiscalYear),
    enabled: !!tenantSlug && !!fiscalYear && enabled,
    retry: false,
  });
}

/** Post the fiscal-year close (confirm:true posts to the GL). Idempotent server-side. */
export function useFYClose(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { fiscal_year: number; confirm: boolean; post_opening_balances?: boolean }) =>
      postFYClose(tenantSlug, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['fy-close-preview', tenantSlug, vars.fiscal_year] });
      qc.invalidateQueries({ queryKey: ['fiscal-year', tenantSlug] });
    },
  });
}

/** Helper to parse a setting value from the settings list. */
export function getSettingValue(
  settings: ServiceConfig[] | undefined,
  key: string,
  fallback: any = '',
): any {
  if (!settings) return fallback;
  const found = settings.find((s) => s.config_key === key);
  if (!found) return fallback;
  try {
    return JSON.parse(found.config_value);
  } catch {
    return found.config_value;
  }
}
