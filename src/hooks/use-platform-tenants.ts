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
  });
}
