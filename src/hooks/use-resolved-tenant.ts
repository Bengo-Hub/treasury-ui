import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { useParams } from 'next/navigation';

/**
 * Returns the tenant identifier to use for API calls.
 *
 * - **Platform owners**: returns the TenantFilter selection (or undefined for "all").
 *   API calls should pass `?tenantId=<id>` instead of putting the tenant in the URL path.
 * - **Regular tenants**: returns the orgSlug from the URL (for path-based routing).
 */
export function useResolvedTenant() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = orgSlug === 'codevertex' || !!user?.isPlatformOwner;
  const tenantIdsParam = useTenantFilterStore((s) => s.tenantIdsParam)();
  const firstSelected = useTenantFilterStore((s) => s.selectedTenants[0]);

  if (!isPlatformOwner) {
    return {
      isPlatformOwner: false,
      tenantPathId: orgSlug,
      tenantQueryParam: undefined as string | undefined,
      tenantIdsParam: undefined as string | undefined,
      hasTenant: !!orgSlug,
      orgSlug,
    };
  }

  return {
    isPlatformOwner: true,
    tenantPathId: orgSlug,
    /** Single-tenant compat: ID of the first selected tenant. undefined means "all tenants". */
    tenantQueryParam: firstSelected?.id,
    /** Comma-separated UUIDs for multi-tenant ?tenant_ids= param. */
    tenantIdsParam: tenantIdsParam || undefined,
    hasTenant: !!tenantIdsParam,
    orgSlug,
  };
}
