import { create } from 'zustand';

interface TenantOption {
  id: string;
  slug: string;
  name: string;
}

interface TenantFilterState {
  /** Currently selected tenant for filtering. null = "All Tenants". */
  selectedTenant: TenantOption | null;
  setSelectedTenant: (tenant: TenantOption | null) => void;
}

export const useTenantFilterStore = create<TenantFilterState>((set) => ({
  selectedTenant: null,
  setSelectedTenant: (tenant) => set({ selectedTenant: tenant }),
}));
