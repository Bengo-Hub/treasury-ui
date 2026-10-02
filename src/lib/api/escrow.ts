/**
 * Escrow pots (treasury-api, plan feature escrow_management).
 *   /api/v1/{tenant}/escrow/...          tenant
 *   /api/v1/pay/{tenant}/escrow/{code}   public pot page
 *   /api/v1/platform/escrow/overview     platform owner
 */

import { apiClient } from './client';
import type { PageEnvelope as PaginatedResponse } from './paginate';

const BASE = '/api/v1';
const base = (tenant: string) => `${BASE}/${tenant}/escrow`;

export type PotStatus = 'open' | 'releasing' | 'released' | 'cancelled';
export type ApprovalPolicy = '' | 'threshold' | 'always' | 'auto';

export interface Beneficiary {
  name: string;
  kind: 'mobile' | 'paybill' | 'till' | 'bank';
  phone?: string;
  short_code?: string;
  account_number?: string;
  bank_code?: string;
  country?: string;
  network?: string;
}

export interface PotItem {
  sku: string;
  title: string;
  price: string;
  qty?: number;
  image_url?: string;
  funded_amount?: string;
}

export interface PotRelease {
  reference: string;
  gross: string;
  fee: string;
  net: string;
  status: 'processing' | 'completed' | 'failed';
  reason?: string;
  at: string;
}

export interface PotRefund {
  reference: string;
  intent_id: string;
  amount: string;
  phone?: string;
  status: 'processing' | 'completed' | 'failed' | 'manual';
  reason?: string;
  at: string;
}

export interface Pot {
  id: string;
  code: string;
  external_id?: string;
  title: string;
  description?: string;
  status: PotStatus;
  currency: string;
  target_amount?: string;
  release_threshold?: string;
  auto_release: boolean;
  hold_until?: string;
  beneficiary: Beneficiary;
  fee_percentage?: string;
  fee_fixed?: string;
  released_gross: string;
  released_fee: string;
  release_count: number;
  pending_release_reference?: string;
  released_at?: string;
  metadata?: { items?: PotItem[]; releases?: PotRelease[]; refunds?: PotRefund[]; approval_policy?: ApprovalPolicy };
  balance: string;
  created_at: string;
}

export interface PotRequest {
  code?: string;
  external_id?: string;
  title: string;
  description?: string;
  currency?: string;
  target_amount?: string;
  release_threshold?: string;
  auto_release: boolean;
  hold_until?: string;
  beneficiary: Beneficiary;
  fee_percentage?: string;
  fee_fixed?: string;
  items?: PotItem[];
  approval_policy?: ApprovalPolicy;
}

export interface Readiness {
  ready: boolean;
  payhero_enabled: boolean;
  team_mode: boolean;
  has_team: boolean;
  kyc_tier: number;
  terms_accepted: boolean;
  terms_version: string;
  platform_enabled: boolean;
}

export interface FeeRule {
  percentage?: string;
  fixed_amount?: string;
  min_amount?: string;
  max_amount?: string;
  currency?: string;
}

export interface EscrowTotals {
  tenant_id: string;
  pots: number;
  open_pots: number;
  held: string;
  in_flight: string;
  released_gross: string;
  commission: string;
}

export interface StatementEntry {
  id: string;
  amount: string;
  transaction_type: string;
  reference?: string;
  description?: string;
  balance_before: string;
  balance_after: string;
  created_at: string;
}

export interface ContributionRequest {
  amount: string;
  payment_method?: string;
  phone?: string;
  email?: string;
  name?: string;
  message?: string;
  item_sku?: string;
  idempotency_key?: string;
}

export interface ContributionResponse {
  intent_id: string;
  status: string;
  initiate_url?: string;
  checkout_request_id?: string;
}

export interface PublicPot {
  code: string;
  title: string;
  description?: string;
  status: PotStatus;
  currency: string;
  raised: string;
  target_amount?: string;
  beneficiary_name: string;
  hold_until?: string;
  items?: PotItem[];
}

export const escrowApi = {
  readiness: (tenant: string) => apiClient.get<Readiness>(`${base(tenant)}/readiness`),
  acceptTerms: (tenant: string) => apiClient.post<unknown>(`${base(tenant)}/terms`),
  summary: (tenant: string) =>
    apiClient.get<{ totals: EscrowTotals; reconciliation?: Record<string, unknown> }>(`${base(tenant)}/summary`),
  feeRule: (tenant: string) => apiClient.get<{ fee_rule: FeeRule | null }>(`${base(tenant)}/fee-rule`),
  setFeeRule: (tenant: string, body: FeeRule) => apiClient.put<{ fee_rule: FeeRule }>(`${base(tenant)}/fee-rule`, body),
  listPots: (tenant: string, params: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 20));
    return apiClient.get<PaginatedResponse<Pot>>(`${base(tenant)}/pots?${q.toString()}`);
  },
  getPot: (tenant: string, pot: string) => apiClient.get<Pot>(`${base(tenant)}/pots/${encodeURIComponent(pot)}`),
  createPot: (tenant: string, body: PotRequest) => apiClient.post<Pot>(`${base(tenant)}/pots`, body),
  updatePot: (tenant: string, pot: string, body: PotRequest) =>
    apiClient.put<Pot>(`${base(tenant)}/pots/${encodeURIComponent(pot)}`, body),
  contribute: (tenant: string, pot: string, body: ContributionRequest) =>
    apiClient.post<ContributionResponse>(`${base(tenant)}/pots/${encodeURIComponent(pot)}/contributions`, body),
  release: (tenant: string, pot: string) => apiClient.post<Pot>(`${base(tenant)}/pots/${encodeURIComponent(pot)}/release`),
  cancel: (tenant: string, pot: string, refund: boolean) =>
    apiClient.post<Pot | { pot: Pot; refunds: PotRefund[] }>(
      `${base(tenant)}/pots/${encodeURIComponent(pot)}/cancel${refund ? '?refund=true' : ''}`,
    ),
  statement: (tenant: string, pot: string, page = 1, limit = 50) =>
    apiClient.get<{ pot: Pot; entries: StatementEntry[]; total: number; page: number; limit: number }>(
      `${base(tenant)}/pots/${encodeURIComponent(pot)}/statement?page=${page}&limit=${limit}`,
    ),
  platformOverview: () =>
    apiClient.get<{
      tenants: { totals: EscrowTotals; reconciliation?: Record<string, unknown> }[];
      held: string;
      released_gross: string;
      commission: string;
    }>(`${BASE}/platform/escrow/overview`),
};
