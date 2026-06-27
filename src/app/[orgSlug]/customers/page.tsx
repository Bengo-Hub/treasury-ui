'use client';

import { ClientsManager } from '@/components/clients/ClientsManager';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';

export default function CustomersPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  return (
    <ClientsManager
      tenant={effectiveTenant}
      showOwnOrgHint={isPlatformOwner && !tenantQueryParam}
    />
  );
}
