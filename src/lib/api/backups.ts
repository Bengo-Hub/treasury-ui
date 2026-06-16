import { apiClient } from './client';

const BASE = '/api/v1';

/** A single tenant-scoped backup artifact (gzipped-JSON export of this tenant's rows). */
export interface Backup {
  id?: string;
  name: string;
  size: number;
  status?: string;
  created_at: string;
}

/** Tenant auto-backup settings. auto_enabled is OFF by default on the backend. */
export interface BackupSettings {
  auto_enabled: boolean;
  schedule_hour: number;
  retention_days: number;
}

/** List this tenant's backups. */
export function listBackups(tenantSlug: string): Promise<{ backups: Backup[] }> {
  return apiClient.get<{ backups: Backup[] }>(`${BASE}/${tenantSlug}/backups`);
}

/** Trigger an on-demand backup of this tenant's data. */
export function createBackup(tenantSlug: string): Promise<Backup> {
  return apiClient.post<Backup>(`${BASE}/${tenantSlug}/backups`, {});
}

/** Fetch the tenant's auto-backup settings. */
export function getBackupSettings(tenantSlug: string): Promise<BackupSettings> {
  return apiClient.get<BackupSettings>(`${BASE}/${tenantSlug}/backups/settings`);
}

/** Update the tenant's auto-backup settings (enable/disable, hour, retention). */
export function updateBackupSettings(
  tenantSlug: string,
  data: BackupSettings,
): Promise<BackupSettings> {
  return apiClient.put<BackupSettings>(`${BASE}/${tenantSlug}/backups/settings`, data);
}

/** Delete a backup by file name. */
export function deleteBackup(tenantSlug: string, name: string): Promise<void> {
  return apiClient.delete<void>(`${BASE}/${tenantSlug}/backups/${encodeURIComponent(name)}`);
}

/**
 * Download a backup. Uses the shared client's getBlob helper so auth + tenant
 * headers (and 401-refresh) apply, then triggers a browser download via an
 * anchor click.
 */
export async function downloadBackup(tenantSlug: string, name: string): Promise<void> {
  const { blob, fileName } = await apiClient.getBlob(
    `${BASE}/${tenantSlug}/backups/${encodeURIComponent(name)}/download`,
    name,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
