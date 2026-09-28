/** Projects for pickers, read through treasury-api's lookups proxy (projects-api owns projects). */

import { apiClient } from './client';

export interface ProjectOption {
  id: string;
  name: string;
  status?: string;
}

export async function listProjectOptions(tenant: string): Promise<ProjectOption[]> {
  const raw = await apiClient.get<{ data?: ProjectOption[] }>(`/api/v1/${tenant}/lookups/projects`);
  return raw?.data ?? [];
}
