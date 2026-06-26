import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, type AuditLogsParams } from '@/lib/api/audit';

// useAuditLogs fetches audit logs scoped to the caller. Tenant users hit the tenant-scoped
// endpoint (own books); platform owners hit the cross-tenant platform endpoint.
export function useAuditLogs(
  tenant: string,
  isPlatformOwner: boolean,
  params?: AuditLogsParams,
  enabled = true,
) {
  return useQuery({
    queryKey: ['audit-logs', tenant, isPlatformOwner, params],
    queryFn: () => getAuditLogs(tenant, isPlatformOwner, params),
    // Tenant users need a tenant; platform owners can query cross-tenant with no specific tenant.
    enabled: enabled && (isPlatformOwner || !!tenant),
    staleTime: 30_000,
  });
}
