import { apiClient } from './client';

const BASE = '/api/v1/platform';

export interface AuditLogEntry {
  id: string;
  tenant_id?: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes?: string;
  ip_address?: string;
  created_at: string;
}

export interface AuditLogsResponse {
  audit_logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogsParams {
  resource_type?: string;
  user_id?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
}

export function getAuditLogs(params?: AuditLogsParams): Promise<AuditLogsResponse> {
  return apiClient.get<AuditLogsResponse>(`${BASE}/audit-logs`, params as Record<string, unknown>);
}
