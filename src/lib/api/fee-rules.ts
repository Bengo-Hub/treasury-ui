/**
 * Fee rules API client (treasury-api).
 * Covers tenant-level and platform-level fee configuration.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeeRule {
  id: string;
  tenant_id?: string;
  gateway_type: string;
  fee_type: string;
  percentage?: string;
  fixed_amount?: string;
  currency: string;
  min_amount?: string;
  max_amount?: string;
  description?: string;
  is_active: boolean;
}

export interface CreateFeeRuleRequest {
  gateway_type: string;
  fee_type: string;
  percentage?: string;
  fixed_amount?: string;
  currency?: string;
  min_amount?: string;
  max_amount?: string;
  description?: string;
}

// ─── Tenant-level API Functions ───────────────────────────────────────────────

/** List fee rules for a specific tenant. */
export function listFeeRules(tenantSlug: string): Promise<{ fee_rules: FeeRule[] }> {
  return apiClient.get<{ fee_rules: FeeRule[] }>(`${BASE}/${tenantSlug}/fee-rules`);
}

/** Create a fee rule for a specific tenant. */
export function createFeeRule(tenantSlug: string, body: CreateFeeRuleRequest): Promise<FeeRule> {
  return apiClient.post<FeeRule>(`${BASE}/${tenantSlug}/fee-rules`, body);
}

/** Update a tenant fee rule. */
export function updateFeeRule(
  tenantSlug: string,
  id: string,
  body: Partial<CreateFeeRuleRequest> & { is_active?: boolean },
): Promise<FeeRule> {
  return apiClient.put<FeeRule>(`${BASE}/${tenantSlug}/fee-rules/${id}`, body);
}

/** Delete a tenant fee rule. */
export function deleteFeeRule(tenantSlug: string, id: string): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenantSlug}/fee-rules/${id}`);
}

// ─── Platform-level API Functions ─────────────────────────────────────────────

/** List platform-wide fee rules. */
export function listPlatformFeeRules(): Promise<{ fee_rules: FeeRule[] }> {
  return apiClient.get<{ fee_rules: FeeRule[] }>(`${BASE}/platform/fee-rules`);
}

/** Create a platform-wide fee rule. */
export function createPlatformFeeRule(body: CreateFeeRuleRequest): Promise<FeeRule> {
  return apiClient.post<FeeRule>(`${BASE}/platform/fee-rules`, body);
}

/** Update a platform-wide fee rule. */
export function updatePlatformFeeRule(
  id: string,
  body: Partial<CreateFeeRuleRequest> & { is_active?: boolean },
): Promise<FeeRule> {
  return apiClient.put<FeeRule>(`${BASE}/platform/fee-rules/${id}`, body);
}
