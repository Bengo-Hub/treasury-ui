import { apiClient } from './client';

const BASE = '/api/v1';

export interface ServiceConfig {
  id: string;
  config_key: string;
  config_value: string;
  config_type: string;
  created_at: string;
  updated_at: string;
}

/** List all settings for a tenant. */
export async function listSettings(tenantSlug: string): Promise<{ settings: ServiceConfig[] }> {
  return apiClient.get<{ settings: ServiceConfig[] }>(`${BASE}/${tenantSlug}/settings`);
}

/** Update (upsert) a single setting by key. */
export async function updateSetting(
  tenantSlug: string,
  key: string,
  value: any,
  configType?: string,
): Promise<ServiceConfig> {
  return apiClient.put<ServiceConfig>(`${BASE}/${tenantSlug}/settings/${key}`, {
    config_value: JSON.stringify(value),
    config_type: configType || 'string',
  });
}

/** Delete a setting by key. */
export async function deleteSetting(tenantSlug: string, key: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`${BASE}/${tenantSlug}/settings/${key}`);
}
