/**
 * Platform and tenant gateway API (treasury-api).
 * Base path: /api/v1 — platform routes under /api/v1/platform/gateways
 */

import { apiClient } from './client';

const BASE = '/api/v1';

export interface GatewayConfig {
  id: string;
  gateway_type: string;
  name: string;
  is_active: boolean;
  is_primary: boolean;
  status: string;
  callback_url?: string;
  webhook_url?: string;
  transaction_fee_type: string;
  total_transactions: number;
  created_at: string;
  updated_at: string;
}

export interface ListGatewaysResponse {
  gateways: GatewayConfig[];
}

export interface CreateGatewayRequest {
  gateway_type: string;
  name: string;
  credentials: Record<string, string>;
  callback_url?: string;
  webhook_url?: string;
  transaction_fee_type?: string;
  transaction_fee_percentage?: number;
  transaction_fee_fixed?: number;
  is_primary?: boolean;
}

export interface UpdateGatewayRequest {
  name?: string;
  credentials?: Record<string, string>;
  callback_url?: string;
  webhook_url?: string;
  is_active?: boolean;
  is_primary?: boolean;
  transaction_fee_type?: string;
  transaction_fee_percentage?: number;
  transaction_fee_fixed?: number;
}

/** List platform-level gateways (superuser). */
export function listPlatformGateways(): Promise<ListGatewaysResponse> {
  return apiClient.get<ListGatewaysResponse>(`${BASE}/platform/gateways`);
}

/** Create or upsert a platform gateway. */
export function createPlatformGateway(body: CreateGatewayRequest): Promise<GatewayConfig> {
  return apiClient.post<GatewayConfig>(`${BASE}/platform/gateways`, body);
}

/** Get a platform gateway by ID. */
export function getPlatformGateway(id: string): Promise<GatewayConfig> {
  return apiClient.get<GatewayConfig>(`${BASE}/platform/gateways/${id}`);
}

/** Update a platform gateway. */
export function updatePlatformGateway(id: string, body: UpdateGatewayRequest): Promise<GatewayConfig> {
  return apiClient.patch<GatewayConfig>(`${BASE}/platform/gateways/${id}`, body);
}

/** Deactivate a platform gateway. */
export function deletePlatformGateway(id: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`${BASE}/platform/gateways/${id}`);
}

/** Test gateway connection. */
export function testPlatformGateway(id: string): Promise<{ success: boolean; gateway_type?: string; error?: string; supports_stk?: boolean; supports_refund?: boolean }> {
  return apiClient.post(`${BASE}/platform/gateways/${id}/test`, {});
}

/** Tenant: list gateways available for this tenant (platform gateways). */
export function listTenantAvailableGateways(tenantSlugOrId: string): Promise<{ gateways: { gateway_type: string; name: string; transaction_fee_type: string; supports_stk_push: boolean }[] }> {
  return apiClient.get(`${BASE}/${tenantSlugOrId}/gateways/available`);
}

/** Tenant: get currently selected gateway( s). */
export function getTenantSelectedGateways(tenantSlugOrId: string): Promise<{ selected: GatewayConfig[] }> {
  return apiClient.get<{ selected: GatewayConfig[] }>(`${BASE}/${tenantSlugOrId}/gateways/selected`);
}

/** Tenant: select a preferred gateway. */
export function selectTenantGateway(tenantSlugOrId: string, gatewayType: string): Promise<{ message: string; gateway_type: string }> {
  return apiClient.post<{ message: string; gateway_type: string }>(`${BASE}/${tenantSlugOrId}/gateways/select/${encodeURIComponent(gatewayType)}`, {});
}

export interface PayoutConfigResponse {
  id: string;
  tenant_id: string;
  schedule_type: string;
  schedule_day: number;
  min_payout_amount: string;
  recipient_type: string;
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  account_name?: string;
  mobile_number?: string;
  mpesa_paybill?: string;
  is_verified: boolean;
  total_payouts: number;
  total_payout_amount: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutConfigRequest {
  schedule_type?: string;
  schedule_day?: number;
  min_payout_amount?: number;
  recipient_type: string;
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  account_name?: string;
  mobile_number?: string;
  mpesa_paybill?: string;
}

/** Tenant: get payout configuration (for Paystack payout destination). */
export function getTenantPayoutConfig(tenantSlugOrId: string): Promise<PayoutConfigResponse> {
  return apiClient.get<PayoutConfigResponse>(`${BASE}/${tenantSlugOrId}/payout/config`);
}

/** Tenant: create or update payout configuration. */
export function upsertTenantPayoutConfig(tenantSlugOrId: string, body: PayoutConfigRequest): Promise<PayoutConfigResponse> {
  return apiClient.post<PayoutConfigResponse>(`${BASE}/${tenantSlugOrId}/payout/config`, body);
}
