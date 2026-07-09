'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInventoryCategory,
  createInventoryUnit,
  createVendor,
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
  type CreateVendorRequest,
  type ListVendorsParams,
  type SearchItemsParams,
} from '@/lib/api/inventory';

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
  });
}

export function useVendor(tenant: string, vendorId: string, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.vendor(tenant, vendorId),
    queryFn: () => getVendor(tenant, vendorId),
    enabled: !!tenant && !!vendorId && enabled,
    staleTime: STALE_MS,
  });
}

export function useCreateVendor(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendorRequest) => createVendor(tenant, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', tenant, 'vendors'] });
    },
  });
}
