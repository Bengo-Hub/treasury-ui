/**
 * Inventory item search proxy (treasury-api → inventory-api S2S).
 * Routes: GET /{tenant}/inventory/items, GET /{tenant}/logistics/carriers
 */

import { apiClient } from './client';

const BASE = '/api/v1';

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  item_type?: string;
  image_url?: string;
  unit?: string;
  unit_price?: string;
  tax_code?: string;
  tax_rate?: string;
  description?: string;
}

export interface Carrier {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface SearchItemsParams {
  q?: string;
  limit?: number;
  type?: string;
}

export function searchInventoryItems(tenant: string, params?: SearchItemsParams): Promise<{ items: InventoryItem[]; total: number }> {
  return apiClient.get<{ items: InventoryItem[]; total: number }>(`${BASE}/${tenant}/inventory/items`, params);
}

export function getInventoryItem(tenant: string, itemId: string): Promise<InventoryItem> {
  return apiClient.get<InventoryItem>(`${BASE}/${tenant}/inventory/items/${itemId}`);
}

export function listCarriers(tenant: string): Promise<{ carriers: Carrier[] }> {
  return apiClient.get<{ carriers: Carrier[] }>(`${BASE}/${tenant}/logistics/carriers`);
}
