import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { useParams } from 'next/navigation';

/**
 * Returns the tenant identifier to use for API calls.
 *
 * - **Platform owners**: by DEFAULT the platform owner sees their OWN tenant (codevertex);
 *   they can drill into a specific tenant via the TenantFilter, or explicitly switch to the
 *   cross-tenant aggregate ("All Tenants", `isAllTenants`).
 *   Tenant-scoped calls pass `?tenantId=<id>` (or the orgSlug path) instead of a path UUID.
 * - **Regular tenants**: returns the orgSlug from the URL (for path-based routing).
 */
export function useResolvedTenant() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = orgSlug === 'codevertex' || !!user?.isPlatformOwner;
  const tenantIdsParam = useTenantFilterStore((s) => s.tenantIdsParam)();
  const firstSelected = useTenantFilterStore((s) => s.selectedTenants[0]);
  const allTenants = useTenantFilterStore((s) => s.allTenants);

  if (!isPlatformOwner) {
    return {
      isPlatformOwner: false,
      isAllTenants: false,
      tenantPathId: orgSlug,
      tenantQueryParam: undefined as string | undefined,
      tenantIdsParam: undefined as string | undefined,
      hasTenant: !!orgSlug,
      orgSlug,
    };
  }

  return {
    isPlatformOwner: true,
    /** Explicit cross-tenant aggregate mode. Default is the platform owner's OWN tenant. */
    isAllTenants: allTenants,
    tenantPathId: orgSlug,
    /** Single-tenant compat: ID of the first selected tenant. undefined = own/all (branch on isAllTenants). */
    tenantQueryParam: firstSelected?.id,
    /** Comma-separated UUIDs for multi-tenant ?tenant_ids= param. */
    tenantIdsParam: tenantIdsParam || undefined,
    hasTenant: !!tenantIdsParam,
    orgSlug,
  };
}
