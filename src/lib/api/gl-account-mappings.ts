/**
 * GL Account Mapping API — tenant-configurable overrides of which chart-of-accounts leaf a
 * (service, event_type, leg) monetary event posts to (ResolveAccountCode's tier-3 lookup, ahead
 * of the built-in hardcoded default). Base path: /api/v1/{tenantIdOrSlug}/gl-account-mappings.
 *
 * Mirrors the Go structs in treasury-api/internal/modules/ledger/models.go.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

export type GLMappingLeg = 'debit' | 'credit';

/** The originating services a mapping may name — same set the backend's own
 *  validGLMappingServices enforces (service.go). */
export const GL_MAPPING_SERVICES = ['pos', 'inventory', 'ordering', 'erp', 'expense', 'treasury', 'logistics'] as const;
export type GLMappingService = (typeof GL_MAPPING_SERVICES)[number];

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
  return apiClient.get<GLAccountMappingsResponse>(`${BASE}/${tenantIdOrSlug}/gl-account-mappings`, query);
}

export function createGLAccountMapping(
  tenantIdOrSlug: string,
  data: CreateGLAccountMappingRequest,
): Promise<GLAccountMapping> {
  return apiClient.post<GLAccountMapping>(`${BASE}/${tenantIdOrSlug}/gl-account-mappings`, data);
}

export function updateGLAccountMapping(
  tenantIdOrSlug: string,
  id: string,
  data: UpdateGLAccountMappingRequest,
): Promise<GLAccountMapping> {
  return apiClient.put<GLAccountMapping>(`${BASE}/${tenantIdOrSlug}/gl-account-mappings/${id}`, data);
}

export function deleteGLAccountMapping(
  tenantIdOrSlug: string,
  id: string,
): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenantIdOrSlug}/gl-account-mappings/${id}`);
}
