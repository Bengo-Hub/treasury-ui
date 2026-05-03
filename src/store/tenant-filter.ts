import { create } from 'zustand';

export interface TenantOption {
  id: string;
  slug: string;
  name: string;
}

interface TenantFilterState {
  /** Selected tenants for platform-level filtering. Empty = "All Tenants". */
  selectedTenants: TenantOption[];
  setSelectedTenants: (tenants: TenantOption[]) => void;
  toggleTenant: (tenant: TenantOption) => void;
  clearTenants: () => void;
  /** Comma-separated UUID string ready for ?tenant_ids= query param. Empty when all selected. */
  tenantIdsParam: () => string;
}

export const useTenantFilterStore = create<TenantFilterState>((set, get) => ({
  selectedTenants: [],

  setSelectedTenants: (tenants) => set({ selectedTenants: tenants }),

  toggleTenant: (tenant) =>
    set((s) => {
      const exists = s.selectedTenants.some((t) => t.id === tenant.id);
      return {
        selectedTenants: exists
          ? s.selectedTenants.filter((t) => t.id !== tenant.id)
          : [...s.selectedTenants, tenant],
      };
    }),

  clearTenants: () => set({ selectedTenants: [] }),

  tenantIdsParam: () => get().selectedTenants.map((t) => t.id).join(','),
}));
