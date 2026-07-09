import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { useParams } from 'next/navigation';

/**
 * Returns the tenant identifier to use for API calls.
 *
 * - **Platform owners**: the global TenantFilter (dropdown-driven "My Treasury" / pick-a-
 *   tenant / "All Tenants") only applies while browsing the platform owner's OWN org shell
 *   (`orgSlug === 'codevertex'`). The moment the URL names a SPECIFIC tenant slug (e.g.
 *   `/masterspace/invoices`, reached via a deep link, bookmark, or cross-tenant "View
 *   Details"), that slug is AUTHORITATIVE and wins over any stale/leftover dropdown
 *   selection — otherwise a create/list call can silently target a different tenant than
 *   the one shown in the URL/branding, and documents created there become unreachable from
 *   the intended tenant's UI (see [[treasury-tenant-resolution-consistency]]).
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
      routingSlug: orgSlug,
      orgSlug,
    };
  }

  // Only trust the global TenantFilter store while on the owner's own shell — a URL that
  // already names a specific tenant must never be overridden by a leftover dropdown pick.
  const onOwnShell = orgSlug === 'codevertex';

  return {
    isPlatformOwner: true,
    /** Explicit cross-tenant aggregate mode (only meaningful on the owner's own shell). */
    isAllTenants: onOwnShell && allTenants,
    tenantPathId: orgSlug,
    /** Single-tenant compat: ID of the first selected tenant, but ONLY on the own-shell
     *  route — undefined elsewhere so callers fall back to the URL's orgSlug. */
    tenantQueryParam: onOwnShell ? firstSelected?.id : undefined,
    /** Comma-separated UUIDs for multi-tenant ?tenant_ids= param (own-shell only). */
    tenantIdsParam: onOwnShell ? (tenantIdsParam || undefined) : undefined,
    hasTenant: onOwnShell ? !!tenantIdsParam : true,
    /** Slug to build a tenant-scoped ROUTE with (e.g. "View Details" links). On the owner's
     *  own shell with a single tenant drilled into via the dropdown, that tenant's own slug
     *  (not "codevertex") — so the link lands on a URL whose orgSlug matches the tenant the
     *  document actually belongs to. Elsewhere, the URL's own orgSlug (already correct). */
    routingSlug: onOwnShell ? (firstSelected?.slug ?? orgSlug) : orgSlug,
    orgSlug,
  };
}
