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
  /** Buying / cost price snapshot (business-only — never shown to the customer). */
  cost_price?: string;
  /** Minimum allowed selling price, if the item defines one. */
  min_selling_price?: string;
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
  type?: string;
}

export interface InventoryItemType {
  /** Canonical enum value stored on the item (e.g. GOODS, SERVICE). */
  value: string;
  /** Human label for display (e.g. "Goods"). */
  label: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_global?: boolean;
  is_active?: boolean;
}

// ── Goods vs Service classification (migration-free convention) ───────────────
// inventory-api has no first-class "kind" on Unit/ItemCategory, so the document item
// form separates service from goods via convention: Unit.type for units, and the seeded
// global category codes (mirrors inventory-api cmd/seed/seed_global_categories.go) for
// categories. Anything unrecognised is treated as "both" so it's never hidden.

const GOODS_UNIT_TYPES = new Set(['weight', 'volume', 'count', 'length', 'area']);
const SERVICE_UNIT_TYPES = new Set(['time', 'service']);

const SERVICE_CATEGORY_CODES = new Set(['CON', 'PRO', 'FEA', 'DSN', 'INS', 'MNT', 'TRN', 'SFT', 'SUP', 'SUB']);
const GOODS_CATEGORY_CODES = new Set(['GEN', 'ELG', 'FRN', 'STN', 'HWT', 'SPR', 'RAW']);

export type ItemKind = 'goods' | 'service' | 'both';

/** Which kind of units/categories an item type should offer. SERVICE/VOUCHER are service-like. */
export function itemTypeKind(itemType?: string): 'goods' | 'service' {
  const t = (itemType ?? '').toUpperCase();
  return t === 'SERVICE' || t === 'VOUCHER' ? 'service' : 'goods';
}

export function unitKind(u: Pick<InventoryUnit, 'type'>): ItemKind {
  const t = (u.type ?? '').toLowerCase();
  if (GOODS_UNIT_TYPES.has(t)) return 'goods';
  if (SERVICE_UNIT_TYPES.has(t)) return 'service';
  return 'both';
}

export function categoryKind(c: Pick<InventoryCategory, 'code' | 'name'>): ItemKind {
  const code = (c.code ?? '').toUpperCase();
  if (SERVICE_CATEGORY_CODES.has(code)) return 'service';
  if (GOODS_CATEGORY_CODES.has(code)) return 'goods';
  const n = (c.name ?? '').toLowerCase();
  if (/service|consult|training|installation|maintenance|\bdesign\b|feasib|software|supervis|subscription|professional/.test(n)) {
    return 'service';
  }
  return 'both';
}

/** Filter helper: keep entries matching the item kind or classified as "both". */
export function matchesItemKind(kind: ItemKind, want: 'goods' | 'service'): boolean {
  return kind === want || kind === 'both';
}

export interface SearchItemsParams {
  q?: string;
  limit?: number;
  type?: string;
}

// inventory-api ItemDTO — the shape inventory actually returns (and the list is a
// paginated `{ data, total }` envelope using a `search` query param, NOT `q`/`items`).
interface InventoryItemDTO {
  id: string;
  sku?: string;
  name: string;
  type?: string;
  unit?: string;
  description?: string;
  image_url?: string;
  selling_price?: number | null;
  suggested_price?: number | null;
  min_selling_price?: number | null;
  cost_price?: number | null;
  tax_code_id?: string;
  tax_rate?: number | null;
}

function dtoToInventoryItem(d: InventoryItemDTO): InventoryItem {
  const price = d.selling_price ?? d.suggested_price ?? d.cost_price ?? undefined;
  return {
    id: d.id,
    name: d.name,
    sku: d.sku,
    item_type: d.type,
    unit: d.unit,
    image_url: d.image_url,
    unit_price: price != null ? String(price) : undefined,
    cost_price: d.cost_price != null ? String(d.cost_price) : undefined,
    min_selling_price: d.min_selling_price != null ? String(d.min_selling_price) : undefined,
    tax_code: d.tax_code_id,
    tax_rate: d.tax_rate != null ? String(d.tax_rate) : undefined,
    description: d.description,
  };
}

export async function searchInventoryItems(tenant: string, params?: SearchItemsParams): Promise<{ items: InventoryItem[]; total: number }> {
  // inventory-api expects `search` (not `q`) and returns a `{ data, total }` envelope.
  const query: Record<string, unknown> = {};
  if (params?.q) query.search = params.q;
  if (params?.limit != null) query.limit = params.limit;
  if (params?.type) query.type = params.type;
  const res = await apiClient.get<{ data?: InventoryItemDTO[]; total?: number } | InventoryItemDTO[]>(
    `${BASE}/${tenant}/inventory/items`,
    query,
  );
  const rows = Array.isArray(res) ? res : (res.data ?? []);
  return {
    items: rows.map(dtoToInventoryItem),
    total: Array.isArray(res) ? rows.length : (res.total ?? rows.length),
  };
}

export async function getInventoryItem(tenant: string, itemId: string): Promise<InventoryItem> {
  const d = await apiClient.get<InventoryItemDTO>(`${BASE}/${tenant}/inventory/items/${itemId}`);
  return dtoToInventoryItem(d);
}

export interface CreateInventoryItemRequest {
  name: string;
  sku?: string;
  item_type?: string;
  unit?: string;
  unit_price?: string;
  /** Buying / cost price (business-only). */
  cost_price?: string;
  tax_code?: string;
  description?: string;
  /** inventory-api item category UUID (optional). */
  category_id?: string;
}

// createInventoryItem maps the treasury form fields onto inventory-api's ItemDTO field names
// (`type`, `selling_price`, `tax_code_id`) so the item is actually created in inventory, then
// maps the response back to the treasury InventoryItem shape.
export async function createInventoryItem(tenant: string, data: CreateInventoryItemRequest): Promise<InventoryItem> {
  const body: Record<string, unknown> = {
    name: data.name,
    type: data.item_type || 'GOODS',
  };
  if (data.sku) body.sku = data.sku;
  if (data.unit) body.unit = data.unit;
  if (data.description) body.description = data.description;
  if (data.category_id) body.category_id = data.category_id;
  if (data.tax_code) body.tax_code_id = data.tax_code;
  if (data.unit_price) {
    const p = parseFloat(data.unit_price);
    if (!Number.isNaN(p)) body.selling_price = p;
  }
  if (data.cost_price) {
    const c = parseFloat(data.cost_price);
    if (!Number.isNaN(c)) body.cost_price = c;
  }
  const d = await apiClient.post<InventoryItemDTO>(`${BASE}/${tenant}/inventory/items`, body);
  return dtoToInventoryItem(d);
}

export function listCarriers(tenant: string): Promise<{ carriers: Carrier[] }> {
  return apiClient.get<{ carriers: Carrier[] }>(`${BASE}/${tenant}/logistics/carriers`);
}

// inventory-api's /inventory/units returns a BARE JSON array (not a {units} envelope),
// which treasury-api proxies verbatim. Normalize to a stable { units } shape and drop
// any entries missing a name so the modal option map can't crash on undefined.
export async function listInventoryUnits(tenant: string): Promise<{ units: InventoryUnit[] }> {
  const res = await apiClient.get<InventoryUnit[] | { units?: InventoryUnit[]; data?: InventoryUnit[] }>(
    `${BASE}/${tenant}/inventory/units`,
  );
  const rows = Array.isArray(res) ? res : (res.units ?? res.data ?? []);
  return { units: rows.filter(u => u && (u.abbreviation || u.name)) };
}

export interface CreateInventoryUnitRequest {
  name: string;
  abbreviation?: string;
  /** weight | volume | count | length | area (goods) or time | service (service). */
  type?: string;
}

// createInventoryUnit creates a unit of measure in inventory-api (the owner) via the
// treasury-api proxy, forwarding the user's JWT. Units are a global reference table.
export async function createInventoryUnit(tenant: string, data: CreateInventoryUnitRequest): Promise<InventoryUnit> {
  const body: Record<string, unknown> = { name: data.name };
  if (data.abbreviation) body.abbreviation = data.abbreviation;
  if (data.type) body.type = data.type;
  return apiClient.post<InventoryUnit>(`${BASE}/${tenant}/inventory/units`, body);
}

// listInventoryCategories returns the tenant's item categories (+ platform globals), proxied
// from inventory-api. inventory returns a { data, total } envelope; normalize to { categories }.
export async function listInventoryCategories(tenant: string): Promise<{ categories: InventoryCategory[] }> {
  const res = await apiClient.get<{ data?: InventoryCategory[] } | InventoryCategory[]>(
    `${BASE}/${tenant}/inventory/categories`,
  );
  const rows = Array.isArray(res) ? res : (res.data ?? []);
  return { categories: rows.filter(c => c && c.name) };
}

export interface CreateInventoryCategoryRequest {
  name: string;
  code?: string;
  description?: string;
}

// createInventoryCategory creates an item category in inventory-api via the treasury-api proxy.
export async function createInventoryCategory(tenant: string, data: CreateInventoryCategoryRequest): Promise<InventoryCategory> {
  const body: Record<string, unknown> = { name: data.name };
  if (data.code) body.code = data.code;
  if (data.description) body.description = data.description;
  return apiClient.post<InventoryCategory>(`${BASE}/${tenant}/inventory/categories`, body);
}

// treasury-api serves item types as the fixed inventory enum in a {value,label} shape.
// Normalize to InventoryItemType and tolerate a bare array / {data} envelope too.
export async function listInventoryItemTypes(tenant: string): Promise<{ item_types: InventoryItemType[] }> {
  const res = await apiClient.get<
    | { item_types?: { value?: string; label?: string; name?: string }[]; data?: { value?: string; label?: string; name?: string }[] }
    | { value?: string; label?: string; name?: string }[]
  >(`${BASE}/${tenant}/inventory/item-types`);
  const rows = Array.isArray(res) ? res : (res.item_types ?? res.data ?? []);
  const item_types = rows
    .map(t => {
      const value = t.value ?? t.name ?? '';
      const label = t.label ?? (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value);
      return { value, label };
    })
    .filter(t => t.value);
  return { item_types };
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
