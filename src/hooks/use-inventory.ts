'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
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
import { searchVendorBalances } from '@/lib/api/arpa';
import { formatCurrency } from '@/lib/utils/currency';

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

/**
 * Stable `onRemoteSearch` callback for any vendor/supplier combobox (purchase bills,
 * expenses, shipping/carrier picker) — GET /inventory/suppliers?search=…, the same
 * paginated endpoint (backend default limit 20) `useVendors` prefetches page 1 of, so
 * a vendor sorting past that first page is still found once typed. Mirrors the same
 * fix shipped for inventory-ui's own Supplier combobox.
 *
 * Also merges in treasury-api's own AP balance (`/ap/vendors?search=`) by NAME
 * (case-insensitive) — the same join strategy the Vendors list page already uses, since a
 * VendorBalance row only exists once a supplier has been billed at least once; a brand-new
 * supplier legitimately has none and must still appear from the inventory search alone. When a
 * match is found and they owe something, it's appended to the option's hint (e.g. "owed KES
 * 4,500") so a tenant picking a vendor for a new bill/expense can see at a glance what's already
 * outstanding — previously only visible by separately opening the Vendors page.
 */
export function useVendorSearch(tenant: string): (query: string) => Promise<ComboboxOption[]> {
  return useCallback(
    async (query: string) => {
      const [supplierRes, balances] = await Promise.all([
        listVendors(tenant, { q: query, limit: 20 }),
        searchVendorBalances(tenant, query, 20).catch(() => []),
      ]);
      const balanceByName = new Map(
        balances
          .filter((b) => b.vendor_name)
          .map((b) => [b.vendor_name!.trim().toLowerCase(), b] as const),
      );
      return supplierRes.vendors.map((v) => {
        const bal = balanceByName.get(v.business_name.trim().toLowerCase());
        const owed = bal ? parseFloat(bal.balance_owed) : 0;
        const contactHint = v.phone || v.email || undefined;
        const owedHint = owed > 0.0001 ? `owed ${formatCurrency(owed, bal!.currency)}` : undefined;
        const hint = [contactHint, owedHint].filter(Boolean).join(' · ') || undefined;
        return { value: v.id, label: v.business_name, hint };
      });
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

export function useCreateVendor(tenant: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendorRequest) => createVendor(tenant, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', tenant, 'vendors'] });
    },
  });
}
