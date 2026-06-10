import { listPlatformTenants, type TenantResponse } from '@/lib/api/tenant';
import { useQuery } from '@tanstack/react-query';

/**
 * Fetches all active tenants from auth-api GET /api/v1/admin/tenants.
 * Requires platform-owner / admin JWT.
 */
export function usePlatformTenants() {
  return useQuery<TenantResponse[]>({
    queryKey: ['platform-tenants'],
    queryFn: () => listPlatformTenants(),
    staleTime: 5 * 60 * 1000,
    // Don't hammer auth-api on a 401/403 (missing admin scope); one retry for transient errors.
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 1;
    },
  });
}
