import { apiClient } from './client';

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

// getAuditLogs fetches audit logs scoped correctly to the caller:
//  - platform owner  → GET /api/v1/platform/audit-logs (cross-tenant; optionally filtered to the
//    selected tenant via tenant_ids).
//  - tenant user     → GET /api/v1/{tenant}/audit-logs (the backend forces tenant_id = own tenant).
// This fixes the prior 403 where tenant users hit the platform-only route.
export function getAuditLogs(
  tenant: string,
  isPlatformOwner: boolean,
  params?: AuditLogsParams,
): Promise<AuditLogsResponse> {
  const query: Record<string, unknown> = { ...(params ?? {}) };
  let url: string;
  if (isPlatformOwner) {
    url = `/api/v1/platform/audit-logs`;
    if (tenant) query.tenant_ids = tenant; // narrow the all-tenants view to the selected tenant
  } else {
    url = `/api/v1/${tenant}/audit-logs`;
  }
  return apiClient
    .get<Record<string, unknown>>(url, query)
    .then((resp) => {
      // Normalize the pagination envelope ({data,total,page,page_size}) to the page's shape.
      const list =
        (resp.audit_logs as AuditLogEntry[]) ??
        (resp.data as AuditLogEntry[]) ??
        (resp.items as AuditLogEntry[]) ??
        [];
      return {
        audit_logs: list,
        total: (resp.total as number) ?? list.length,
        page: (resp.page as number) ?? 1,
        limit: (resp.limit as number) ?? (resp.page_size as number) ?? list.length,
      } as AuditLogsResponse;
    });
}
