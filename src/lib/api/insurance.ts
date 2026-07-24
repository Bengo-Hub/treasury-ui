/**
 * Insurance/co-pay (DAWA pharmacy) admin API — providers, coverages, and the per-insurer
 * connector config (the "advanced UI" mapping editor's data source).
 * Base path: /api/v1/{tenant}/insurance/*
 */

import { apiClient } from './client';

const BASE = '/api/v1';

export interface InsuranceProvider {
  id: string;
  tenant_id: string;
  name: string;
  payer_id_code?: string;
  is_active: boolean;
  default_copay_percent?: string;
  default_copay_fixed?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProviderRequest {
  name: string;
  payer_id_code?: string;
  default_copay_percent?: number;
  default_copay_fixed?: number;
}

export interface PatientCoverage {
  id: string;
  tenant_id: string;
  patient_id_number: string;
  provider_id: string;
  plan_id?: string;
  member_id: string;
  relationship: string;
  valid_from?: string;
  valid_to?: string;
  is_active: boolean;
}

export interface CreateCoverageRequest {
  patient_id_number: string;
  provider_id: string;
  plan_id?: string;
  member_id: string;
  relationship?: string;
  valid_from?: string;
  valid_to?: string;
}

// The eight operation-path slots the connector supports — not every insurer exposes all of them.
export interface ConnectorOperationPaths {
  patient_registry_path?: string;
  facility_registry_path?: string;
  practitioner_registry_path?: string;
  eligibility_path?: string;
  preauth_path?: string;
  claim_submit_path?: string;
  claim_status_path?: string;
  remittance_path?: string;
  token_path?: string;
}

export interface InsurerConnectorConfig extends ConnectorOperationPaths {
  id: string;
  tenant_id?: string;
  provider_id: string;
  auth_type: 'api_key' | 'oauth2_client_credentials' | 'basic' | 'bearer_static' | 'mtls';
  agent_identifier?: string;
  base_url: string;
  request_template: Record<string, unknown>;
  response_mapping: Record<string, unknown>;
  payload_encryption_enabled: boolean;
  own_public_key?: string;
  counterparty_public_key?: string;
  is_active: boolean;
  last_tested_at?: string;
  last_test_result?: string;
}

export interface UpsertConnectorConfigRequest extends ConnectorOperationPaths {
  auth_type: string;
  credentials?: Record<string, string>; // plaintext in, encrypted server-side; omit to keep existing
  agent_identifier?: string;
  base_url: string;
  request_template?: Record<string, unknown>;
  response_mapping?: Record<string, unknown>;
  payload_encryption_enabled?: boolean;
  own_public_key?: string;
  own_private_key?: string; // plaintext in, encrypted server-side
  counterparty_public_key?: string;
}

export interface TestConnectionResult {
  result?: {
    RenderedRequest?: Record<string, unknown>;
    StatusCode?: number;
    RawResponse?: unknown;
    Extracted?: Record<string, unknown>;
  };
  error?: string;
}

export function listProviders(tenant: string): Promise<{ data: InsuranceProvider[] }> {
  return apiClient.get(`${BASE}/${tenant}/insurance/providers`);
}

export function createProvider(tenant: string, body: CreateProviderRequest): Promise<InsuranceProvider> {
  return apiClient.post(`${BASE}/${tenant}/insurance/providers`, body);
}

export function listCoverages(tenant: string, patientIdNumber: string): Promise<{ data: PatientCoverage[] }> {
  return apiClient.get(`${BASE}/${tenant}/insurance/coverages?patient_id_number=${encodeURIComponent(patientIdNumber)}`);
}

export function createCoverage(tenant: string, body: CreateCoverageRequest): Promise<PatientCoverage> {
  return apiClient.post(`${BASE}/${tenant}/insurance/coverages`, body);
}

export function getConnectorConfig(tenant: string, providerId: string): Promise<InsurerConnectorConfig> {
  return apiClient.get(`${BASE}/${tenant}/insurance/connectors/${providerId}`);
}

export function upsertConnectorConfig(
  tenant: string,
  providerId: string,
  body: UpsertConnectorConfigRequest,
): Promise<InsurerConnectorConfig> {
  return apiClient.put(`${BASE}/${tenant}/insurance/connectors/${providerId}`, body);
}

export function testConnection(
  tenant: string,
  providerId: string,
  operation: string,
  sample: Record<string, string>,
): Promise<TestConnectionResult> {
  return apiClient.post(`${BASE}/${tenant}/insurance/connectors/${providerId}/test`, { operation, sample });
}
