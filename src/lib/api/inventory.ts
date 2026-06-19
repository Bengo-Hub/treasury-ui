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

// The vendor master is inventory-api's flat `Supplier` resource, proxied by
// treasury-api at /{tenant}/inventory/suppliers. The UI keeps the richer nested
// Vendor shape; we map nested <-> flat here so the pages/forms stay agnostic.

interface SupplierDTO {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  address_state?: string;
  address_postal_code?: string;
  country?: string;
  industry?: string;
  website?: string;
  notes?: string;
  logo_url?: string;
  is_active?: boolean;
  bank_account_number?: string;
  bank_account_name?: string;
  bank_name?: string;
  bank_branch?: string;
  swift_bic?: string;
  currency?: string;
  tax_pin?: string;
  vat_number?: string;
  payment_terms_days?: number;
  created_at: string;
}

function supplierToVendor(s: SupplierDTO): Vendor {
  return {
    id: s.id,
    tenant_id: '',
    business_name: s.name,
    industry: s.industry,
    country: s.country ?? '',
    city: s.city,
    email: s.email,
    phone: s.phone,
    website: s.website,
    notes: s.notes,
    logo_url: s.logo_url,
    is_archived: s.is_active === false,
    tax_info: { tax_id: s.tax_pin, vat_number: s.vat_number },
    address: {
      line1: s.address_line1,
      line2: s.address_line2,
      state: s.address_state,
      postal_code: s.address_postal_code,
    },
    bank_details: {
      bank_name: s.bank_name,
      account_name: s.bank_account_name,
      account_number: s.bank_account_number,
      branch: s.bank_branch,
      swift_bic: s.swift_bic,
    },
    account_details: {
      currency: s.currency,
      payment_terms_days: s.payment_terms_days,
    },
    created_at: s.created_at,
    updated_at: s.created_at,
  };
}

function vendorToSupplierPayload(v: CreateVendorRequest): Record<string, unknown> {
  return {
    name: v.business_name,
    country: v.country,
    industry: v.industry,
    city: v.city,
    email: v.email,
    phone: v.phone,
    website: v.website,
    notes: v.notes,
    logo_url: v.logo_url,
    tax_pin: v.tax_info?.tax_id,
    vat_number: v.tax_info?.vat_number,
    address_line1: v.address?.line1,
    address_line2: v.address?.line2,
    address_state: v.address?.state,
    address_postal_code: v.address?.postal_code,
    bank_name: v.bank_details?.bank_name,
    bank_account_name: v.bank_details?.account_name,
    bank_account_number: v.bank_details?.account_number,
    bank_branch: v.bank_details?.branch,
    swift_bic: v.bank_details?.swift_bic,
    currency: v.account_details?.currency,
    payment_terms_days: v.account_details?.payment_terms_days,
  };
}

export async function listVendors(tenant: string, params?: ListVendorsParams): Promise<VendorsResponse> {
  // inventory-api list is a paginated envelope: { data, total, ... } and uses
  // `search` / `include_inactive` query params.
  const query: Record<string, unknown> = {};
  if (params?.q) query.search = params.q;
  if (params?.archived) query.include_inactive = 'true';
  if (params?.limit != null) query.limit = params.limit;
  if (params?.offset != null) query.offset = params.offset;
  const res = await apiClient.get<{ data?: SupplierDTO[]; total?: number }>(
    `${BASE}/${tenant}/inventory/suppliers`,
    query,
  );
  const suppliers = res.data ?? [];
  return { vendors: suppliers.map(supplierToVendor), total: res.total ?? suppliers.length };
}

export async function getVendor(tenant: string, vendorId: string): Promise<Vendor> {
  const s = await apiClient.get<SupplierDTO>(`${BASE}/${tenant}/inventory/suppliers/${vendorId}`);
  return supplierToVendor(s);
}

export async function createVendor(tenant: string, data: CreateVendorRequest): Promise<Vendor> {
  const s = await apiClient.post<SupplierDTO>(
    `${BASE}/${tenant}/inventory/suppliers`,
    vendorToSupplierPayload(data),
  );
  return supplierToVendor(s);
}
