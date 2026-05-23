'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getInventoryItem,
  listCarriers,
  listInventoryItemTypes,
  listInventoryUnits,
  searchInventoryItems,
  type SearchItemsParams,
} from '@/lib/api/inventory';

const STALE_MS = 2 * 60 * 1000;

const STALE_12H = 12 * 60 * 60 * 1000;

export const inventoryKeys = {
  items: (tenant: string, params?: SearchItemsParams) => ['inventory', tenant, 'items', params] as const,
  item: (tenant: string, itemId: string) => ['inventory', tenant, 'item', itemId] as const,
  carriers: (tenant: string) => ['inventory', tenant, 'carriers'] as const,
  units: (tenant: string) => ['inventory', tenant, 'units'] as const,
  itemTypes: (tenant: string) => ['inventory', tenant, 'item-types'] as const,
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
