/**
 * Cost Centers (accounting dimension) API.
 * Base path: /api/v1/{tenantIdOrSlug}/cost-centers
 *
 * Mirrors the Go structs in
 * treasury-api/internal/modules/costcenters/models.go.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

/** Matches costcenters.CostCenter (models.go). */
export interface CostCenter {
  id: string;
  tenant_id?: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Response envelope from GET /cost-centers. */
export interface CostCentersResponse {
  cost_centers: CostCenter[];
  total: number;
}

/** Matches costcenters.CreateCostCenterRequest. */
export interface CreateCostCenterRequest {
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

/** Matches costcenters.UpdateCostCenterRequest (all fields optional). */
export interface UpdateCostCenterRequest {
  name?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface ListCostCentersParams {
  /** When true, sends ?active_only=true so the backend returns only active centers. */
  active_only?: boolean;
}

// ---- API functions ----

export function listCostCenters(
  tenantIdOrSlug: string,
  params?: ListCostCentersParams,
): Promise<CostCentersResponse> {
  // Backend reads the literal string "true"; only send the param when active_only is set.
  const query = params?.active_only ? { active_only: 'true' } : undefined;
  return apiClient.get<CostCentersResponse>(`${BASE}/${tenantIdOrSlug}/cost-centers`, query);
}

export function createCostCenter(
  tenantIdOrSlug: string,
  data: CreateCostCenterRequest,
): Promise<CostCenter> {
  return apiClient.post<CostCenter>(`${BASE}/${tenantIdOrSlug}/cost-centers`, data);
}

export function updateCostCenter(
  tenantIdOrSlug: string,
  id: string,
  data: UpdateCostCenterRequest,
): Promise<CostCenter> {
  // Backend uses PUT for update (cost_centers.go RegisterRoutes).
  return apiClient.put<CostCenter>(`${BASE}/${tenantIdOrSlug}/cost-centers/${id}`, data);
}

export function deleteCostCenter(
  tenantIdOrSlug: string,
  id: string,
): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenantIdOrSlug}/cost-centers/${id}`);
}

export const costCentersApi = {
  list: listCostCenters,
  create: createCostCenter,
  update: updateCostCenter,
  delete: deleteCostCenter,
};
