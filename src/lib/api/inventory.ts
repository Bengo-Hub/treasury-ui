/**
 * Inventory item search proxy (treasury-api → inventory-api S2S).
 * Routes: GET /{tenant}/inventory/items, GET /{tenant}/logistics/carriers
 *
 * Vendors/suppliers are owned by the inventory service (not treasury); the
 * treasury-api proxies them via S2S under /{tenant}/inventory/vendors.
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

export interface InventoryUnit {
  id: string;
  name: string;
  abbreviation?: string;
}

export interface InventoryItemType {
  id: string;
  name: string;
  label?: string;
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

export function listInventoryUnits(tenant: string): Promise<{ units: InventoryUnit[] }> {
  return apiClient.get<{ units: InventoryUnit[] }>(`${BASE}/${tenant}/inventory/units`);
}

export function listInventoryItemTypes(tenant: string): Promise<{ item_types: InventoryItemType[] }> {
  return apiClient.get<{ item_types: InventoryItemType[] }>(`${BASE}/${tenant}/inventory/item-types`);
}

// ---- Vendors / Suppliers (owned by inventory-api, proxied via treasury-api) ----

export interface VendorTaxInfo {
  tax_id?: string;
  vat_number?: string;
}

export interface VendorAddress {
  line1?: string;
  line2?: string;
  state?: string;
  postal_code?: string;
}

export interface VendorBankDetails {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  branch?: string;
  swift_bic?: string;
}

export interface VendorAccountDetails {
  currency?: string;
  opening_balance?: string;
  payment_terms_days?: number;
}

export interface Vendor {
  id: string;
  tenant_id: string;
  business_name: string;
  industry?: string;
  country: string;
  city?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  logo_url?: string;
  is_archived?: boolean;
  tax_info?: VendorTaxInfo;
  address?: VendorAddress;
  bank_details?: VendorBankDetails;
  account_details?: VendorAccountDetails;
  linked_contact_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface VendorsResponse {
  vendors: Vendor[];
  total: number;
}

export interface ListVendorsParams {
  q?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateVendorRequest {
  business_name: string;
  country: string;
  industry?: string;
  city?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  logo_url?: string;
  tax_info?: VendorTaxInfo;
  address?: VendorAddress;
  bank_details?: VendorBankDetails;
  account_details?: VendorAccountDetails;
  linked_contact_ids?: string[];
}

export function listVendors(tenant: string, params?: ListVendorsParams): Promise<VendorsResponse> {
  return apiClient.get<VendorsResponse>(`${BASE}/${tenant}/inventory/vendors`, params);
}

export function getVendor(tenant: string, vendorId: string): Promise<Vendor> {
  return apiClient.get<Vendor>(`${BASE}/${tenant}/inventory/vendors/${vendorId}`);
}

export function createVendor(tenant: string, data: CreateVendorRequest): Promise<Vendor> {
  return apiClient.post<Vendor>(`${BASE}/${tenant}/inventory/vendors`, data);
}
