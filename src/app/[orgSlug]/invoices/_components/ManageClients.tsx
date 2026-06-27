'use client';

import { ClientsManager } from '@/components/clients/ClientsManager';

interface ManageClientsProps {
  effectiveTenant: string;
}

/**
 * Thin re-export of the shared ClientsManager so the doc "Manage Clients" tabs keep
 * a single, deduped implementation. The CRM-only list this used to render is gone —
 * ClientsManager merges doc-derived customers + CRM contacts in one place.
 */
export function ManageClients({ effectiveTenant }: ManageClientsProps) {
  return <ClientsManager tenant={effectiveTenant} />;
}
