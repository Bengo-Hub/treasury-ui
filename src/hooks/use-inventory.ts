'use client';

import { useCallback } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import type { SupplierFormValues } from '@bengo-hub/shared-ui-lib/suppliers';
import {
  archiveVendor,
  createInventoryCategory,
  createInventoryUnit,
  createVendor,
  getSupplierRecord,
  restoreVendor,
  updateVendor,
  getInventoryItem,
  getVendor,
  listCarriers,
  listInventoryCategories,
  listInventoryItemTypes,
  listInventoryUnits,
  listVendors,
  searchInventoryItems,
  type CreateInventoryCategoryRequest,
  type CreateInventoryUnitRequest,
  type ListVendorsParams,
  type SearchItemsParams,
  type Vendor,
} from '@/lib/api/inventory';
import { vendorOptionHint } from '@/lib/vendor-balance';

const STALE_MS = 2 * 60 * 1000;

const STALE_12H = 12 * 60 * 60 * 1000;

export const inventoryKeys = {
  items: (tenant: string, params?: SearchItemsParams) => ['inventory', tenant, 'items', params] as const,
  item: (tenant: string, itemId: string) => ['inventory', tenant, 'item', itemId] as const,
  carriers: (tenant: string) => ['inventory', tenant, 'carriers'] as const,
  units: (tenant: string) => ['inventory', tenant, 'units'] as const,
  categories: (tenant: string) => ['inventory', tenant, 'categories'] as const,
  itemTypes: (tenant: string) => ['inventory', tenant, 'item-types'] as const,
  vendors: (tenant: string, params?: ListVendorsParams) => ['inventory', tenant, 'vendors', params] as const,
  vendor: (tenant: string, vendorId: string) => ['inventory', tenant, 'vendor', vendorId] as const,
};

export function useInventoryItems(tenant: string, params?: SearchItemsParams, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.items(tenant, params),
    queryFn: () => searchInventoryItems(tenant, params),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useInventoryItem(tenant: string, itemId: string, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.item(tenant, itemId),
    queryFn: () => getInventoryItem(tenant, itemId),
    enabled: !!tenant && !!itemId && enabled,
    staleTime: STALE_MS,
  });
}

export function useCarriers(tenant: string, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.carriers(tenant),
    queryFn: () => listCarriers(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
  });
}

export function useInventoryUnits(tenant: string, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.units(tenant),
    queryFn: () => listInventoryUnits(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_12H,
  });
}

export function useInventoryItemTypes(tenant: string, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.itemTypes(tenant),
    queryFn: () => listInventoryItemTypes(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_12H,
  });
}

export function useInventoryCategories(tenant: string, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.categories(tenant),
    queryFn: () => listInventoryCategories(tenant),
    enabled: !!tenant && enabled,
    staleTime: STALE_12H,
  });
}

export function useCreateInventoryUnit(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInventoryUnitRequest) => createInventoryUnit(tenant, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.units(tenant) });
    },
  });
}

export function useCreateInventoryCategory(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInventoryCategoryRequest) => createInventoryCategory(tenant, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories(tenant) });
    },
  });
}

// ---- Vendors / Suppliers (owned by inventory-api) ----

export function useVendors(tenant: string, params?: ListVendorsParams, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.vendors(tenant, params),
    queryFn: () => listVendors(tenant, params),
    enabled: !!tenant && enabled,
    staleTime: STALE_MS,
    // Keep the current page on screen while the next page or search loads.
    placeholderData: keepPreviousData,
  });
}

/**
 * Stable `onRemoteSearch` callback for any vendor/supplier combobox (purchase bills,
 * expenses, shipping/carrier picker) — GET /inventory/suppliers?search=…, the same
 * paginated endpoint (backend default limit 20) `useVendors` prefetches page 1 of, so
 * a vendor sorting past that first page is still found once typed. Each row's hint leads with
 * what's owed to the vendor — inventory-api attaches treasury's AP balance to every supplier it
 * returns (joined by supplier ID), so pickers must build options via vendorOptionHint for both
 * the prefetched list and these remote results.
 */
export function useVendorSearch(tenant: string): (query: string) => Promise<ComboboxOption[]> {
  return useCallback(
    async (query: string) => {
      const res = await listVendors(tenant, { q: query, limit: 20 });
      return res.vendors.map((v) => ({ value: v.id, label: v.business_name, hint: vendorOptionHint(v) }));
    },
    [tenant],
  );
}

export function useVendor(tenant: string, vendorId: string, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.vendor(tenant, vendorId),
    queryFn: () => getVendor(tenant, vendorId),
    enabled: !!tenant && !!vendorId && enabled,
    staleTime: STALE_MS,
  });
}

/**
 * The vendor a picker has selected, whether it came from the prefetched first page or from a
 * remote search result (which the prefetched list never holds). Falls back to GET by id only when
 * the vendor is not already in `prefetched`, so forms can always read its name, email and KRA PIN.
 */
export function useSelectedVendor(tenant: string, vendorId: string, prefetched?: Vendor[]): Vendor | undefined {
  const local = vendorId ? prefetched?.find((v) => v.id === vendorId) : undefined;
  const { data } = useVendor(tenant, vendorId, !!vendorId && !local);
  return local ?? (vendorId ? data : undefined);
}

export function useCreateVendor(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ values, country }: { values: SupplierFormValues; country: string }) => createVendor(tenant, values, country),
    onSuccess: (vendor) => {
      // Seed the by-id cache so a form that selects the new vendor reads it without a refetch.
      queryClient.setQueryData(inventoryKeys.vendor(tenant, vendor.id), vendor);
      queryClient.invalidateQueries({ queryKey: ['inventory', tenant, 'vendors'] });
    },
  });
}

/** The stored supplier record (every field), for the edit form. */
export function useSupplierRecord(tenant: string, vendorId: string | null) {
  return useQuery({
    queryKey: ['inventory', tenant, 'supplier-record', vendorId],
    queryFn: () => getSupplierRecord(tenant, vendorId as string),
    enabled: !!tenant && !!vendorId,
    staleTime: 0,
  });
}

function useVendorMutation<TArgs>(tenant: string, fn: (args: TArgs) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', tenant, 'vendors'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', tenant, 'vendor'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', tenant, 'supplier-record'] });
    },
  });
}

export function useUpdateVendor(tenant: string) {
  return useVendorMutation(tenant, ({ id, values, country }: { id: string; values: SupplierFormValues; country: string }) =>
    updateVendor(tenant, id, values, country),
  );
}

export function useArchiveVendor(tenant: string) {
  return useVendorMutation(tenant, (id: string) => archiveVendor(tenant, id));
}

export function useRestoreVendor(tenant: string) {
  return useVendorMutation(tenant, (id: string) => restoreVendor(tenant, id));
}
