import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listSettings, updateSetting } from '@/lib/api/settings';
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
