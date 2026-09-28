/**
 * GL Account Mapping API — tenant-configurable overrides of which chart-of-accounts leaf a
 * (service, event_type, leg) monetary event posts to (ResolveAccountCode's tier-3 lookup, ahead
 * of the built-in hardcoded default). Base path: /api/v1/{tenantIdOrSlug}/ledger/gl-account-mappings (the API mounts it under
 * /ledger beside the chart of accounts; the bare path returned 404).
 *
 * Mirrors the Go structs in treasury-api/internal/modules/ledger/models.go.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

/** debit or credit, or a posting-specific leg such as tax, cogs or vat_input (see the catalog). */
export type GLMappingLeg = string;

/** One key a posting resolves (ledger/gl_mapping_catalog.go). */
export interface GLMappingCatalogKey {
  service: string;
  event_type: string;
  leg: string;
  /** Account the posting uses without a mapping; empty for dynamic keys. */
  default_code?: string;
  label: string;
  /** Chosen per document (invoice type, payment method); a row overrides every choice. */
  dynamic?: boolean;
}

export interface GLAccountMapping {
  id: string;
  tenant_id: string;
  service: string;
  event_type: string;
  leg: GLMappingLeg;
  account_code: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  /** Catalog annotations filled by the list endpoint. */
  label?: string;
  default_code?: string;
  dynamic?: boolean;
  is_system_default?: boolean;
}

export interface GLAccountMappingsResponse {
  gl_account_mappings: GLAccountMapping[];
  total: number;
}

export interface CreateGLAccountMappingRequest {
  service: string;
  event_type: string;
  leg: GLMappingLeg;
  account_code: string;
  description?: string;
  is_active?: boolean;
}

/** service/event_type/leg are immutable after creation (the mapping's identity) — only
 *  account_code/description/is_active can be updated. */
export interface UpdateGLAccountMappingRequest {
  account_code?: string;
  description?: string;
  is_active?: boolean;
}

export interface ListGLAccountMappingsParams {
  active_only?: boolean;
}

// ---- API functions ----

export function listGLAccountMappings(
  tenantIdOrSlug: string,
  params?: ListGLAccountMappingsParams,
): Promise<GLAccountMappingsResponse> {
  const query = params?.active_only ? { active_only: 'true' } : undefined;
  return apiClient.get<GLAccountMappingsResponse>(`${BASE}/${tenantIdOrSlug}/ledger/gl-account-mappings`, query);
}

export function getGLMappingCatalog(tenantIdOrSlug: string): Promise<{ keys: GLMappingCatalogKey[]; total: number }> {
  return apiClient.get<{ keys: GLMappingCatalogKey[]; total: number }>(
    `${BASE}/${tenantIdOrSlug}/ledger/gl-account-mappings/catalog`,
  );
}

export function createGLAccountMapping(
  tenantIdOrSlug: string,
  data: CreateGLAccountMappingRequest,
): Promise<GLAccountMapping> {
  return apiClient.post<GLAccountMapping>(`${BASE}/${tenantIdOrSlug}/ledger/gl-account-mappings`, data);
}

export function updateGLAccountMapping(
  tenantIdOrSlug: string,
  id: string,
  data: UpdateGLAccountMappingRequest,
): Promise<GLAccountMapping> {
  return apiClient.put<GLAccountMapping>(`${BASE}/${tenantIdOrSlug}/ledger/gl-account-mappings/${id}`, data);
}

export function deleteGLAccountMapping(
  tenantIdOrSlug: string,
  id: string,
): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenantIdOrSlug}/ledger/gl-account-mappings/${id}`);
}
