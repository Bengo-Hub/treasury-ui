import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, type AuditLogsParams } from '@/lib/api/audit';

export function useAuditLogs(params?: AuditLogsParams, enabled = true) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => getAuditLogs(params),
    enabled,
    staleTime: 30_000,
  });
}
