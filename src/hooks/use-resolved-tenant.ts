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
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);

  if (!isPlatformOwner) {
    // Regular tenant: use orgSlug in URL path
    return {
      isPlatformOwner: false,
      /** Tenant slug or ID to put in the URL path (e.g. /api/v1/{tenantPathId}/...) */
      tenantPathId: orgSlug,
      /** Query param for ?tenantId= (not used for regular tenants) */
      tenantQueryParam: undefined as string | undefined,
      /** Whether a specific tenant is selected (always true for regular tenants) */
      hasTenant: !!orgSlug,
      /** The orgSlug from URL */
      orgSlug,
    };
  }

  // Platform owner: use filter selection
  return {
    isPlatformOwner: true,
    /** For platform owners, use orgSlug in path (backend will recognize codevertex as platform) */
    tenantPathId: orgSlug,
    /** Query param for ?tenantId= override. undefined means "all tenants". */
    tenantQueryParam: selectedTenant?.id,
    /** Whether a specific tenant is selected */
    hasTenant: !!selectedTenant,
    orgSlug,
  };
}
