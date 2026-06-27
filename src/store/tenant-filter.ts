import { create } from 'zustand';

export interface TenantOption {
  id: string;
  slug: string;
  name: string;
}

interface TenantFilterState {
  /**
   * Selected tenants for platform-level drill-down. Empty + `allTenants:false` =
   * the platform owner's OWN tenant (codevertex). Empty + `allTenants:true` = the
   * cross-tenant aggregate.
   */
  selectedTenants: TenantOption[];
  /** Explicit "All Tenants" aggregate mode. Default is OWN-tenant, NOT all-tenants. */
  allTenants: boolean;
  setSelectedTenants: (tenants: TenantOption[]) => void;
  toggleTenant: (tenant: TenantOption) => void;
  /** Turn on the explicit cross-tenant aggregate (clears specific selection). */
  selectAllTenants: () => void;
  /** Reset to the default OWN-tenant view (no aggregate, no specific tenant). */
  clearTenants: () => void;
  /** Comma-separated UUID string ready for ?tenant_ids= query param. Empty when none selected. */
  tenantIdsParam: () => string;
}

export const useTenantFilterStore = create<TenantFilterState>((set, get) => ({
  selectedTenants: [],
  allTenants: false,

  setSelectedTenants: (tenants) => set({ selectedTenants: tenants, allTenants: false }),

  toggleTenant: (tenant) =>
    set((s) => {
      const exists = s.selectedTenants.some((t) => t.id === tenant.id);
      return {
        // Picking a specific tenant always leaves the aggregate mode.
        allTenants: false,
        selectedTenants: exists
          ? s.selectedTenants.filter((t) => t.id !== tenant.id)
          : [...s.selectedTenants, tenant],
      };
    }),

  selectAllTenants: () => set({ selectedTenants: [], allTenants: true }),

  clearTenants: () => set({ selectedTenants: [], allTenants: false }),

  tenantIdsParam: () => get().selectedTenants.map((t) => t.id).join(','),
}));
