/**
 * PayHero (treasury-api): the tenant's PayHero setup and the platform organization.
 *   /api/v1/{tenant}/gateways/payhero/...       tenant (view / manage gateway permissions)
 *   /api/v1/platform/gateways/payhero/...       platform owner
 */

import { apiClient } from './client';

const BASE = '/api/v1';
const tenantBase = (tenant: string) => `${BASE}/${tenant}/gateways/payhero`;

export type PayHeroMode = 'platform_team' | 'platform_root' | 'own_account';

export interface PayHeroChannel {
  payhero_channel_id: number;
  channel_type: string; // bank | paybill | till | wallet
  short_code: string;
  account_number: string;
  description: string;
  is_active: boolean;
  enabled: boolean;
}

export interface PayHeroRouting {
  default_channel_id: number;
  by_reference_type?: Record<string, number>;
  by_outlet?: Record<string, number>;
}

export interface PayHeroRoutingOption {
  reference_type: string;
  label: string;
  /** product: a product the tenant subscribes to; history: received recently; platform: the platform takes it; routed: already routed. */
  source: 'product' | 'history' | 'platform' | 'routed';
}

export interface PayHeroPaymentLink {
  label: string;
  url: string;
  purpose?: string;
}

export interface PayHeroVerification {
  check: string;
  lookup_id: string;
  subject_name?: string;
  status: string;
  charged_amount?: string;
  currency?: string;
  at: string;
}

export interface PayHeroStatus {
  enabled: boolean;
  mode?: PayHeroMode;
  country?: string;
  vendor_id?: number;
  team: {
    name?: string;
    invited_emails?: string[];
    kyc_tier?: number;
    kyc_verified?: boolean;
    kyc_status?: string;
    kyc_synced_at?: string;
  };
  channels: PayHeroChannel[];
  routing: PayHeroRouting;
  offline_paybill: boolean;
  payment_links: PayHeroPaymentLink[];
  channels_synced_at?: string;
  verifications: PayHeroVerification[];
  escrow_terms?: { version: string; accepted_at: string; accepted_by: string };
  escrow_reconciliation?: Record<string, unknown>;
}

export interface EnablePayHeroRequest {
  mode?: PayHeroMode;
  country?: string;
  api_username?: string;
  api_password?: string;
  offline_paybill?: boolean;
}

export const payheroApi = {
  status: (tenant: string) => apiClient.get<PayHeroStatus>(tenantBase(tenant)),
  enable: (tenant: string, body: EnablePayHeroRequest) => apiClient.put<PayHeroStatus>(tenantBase(tenant), body),
  disable: (tenant: string) => apiClient.delete<void>(tenantBase(tenant)),
  createTeam: (tenant: string, body: { name: string; email?: string }) =>
    apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/team`, body),
  invite: (tenant: string, email: string) => apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/team/invite`, { email }),
  syncChannels: (tenant: string) => apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/channels/sync`),
  claimChannel: (tenant: string, id: number) => apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/channels/${id}/claim`),
  setChannelEnabled: (tenant: string, id: number, enabled: boolean) =>
    apiClient.patch<PayHeroStatus>(`${tenantBase(tenant)}/channels/${id}`, { enabled }),
  setRouting: (tenant: string, routing: PayHeroRouting) => apiClient.put<PayHeroStatus>(`${tenantBase(tenant)}/routing`, routing),
  /** Payment types this tenant can route: its products, its recent payments, already routed. */
  routingOptions: (tenant: string) =>
    apiClient.get<{ options: PayHeroRoutingOption[] }>(`${tenantBase(tenant)}/routing/options`),
  setPaymentLinks: (tenant: string, links: PayHeroPaymentLink[]) =>
    apiClient.put<PayHeroStatus>(`${tenantBase(tenant)}/payment-links`, { links }),
  balance: (tenant: string) =>
    apiClient.get<{ currency: string; balance: string; service_balance?: string }>(`${tenantBase(tenant)}/balance`),
  kycPricing: (tenant: string) => apiClient.get<Record<string, unknown>>(`${tenantBase(tenant)}/kyc/pricing`),
  kycChecks: (tenant: string) => apiClient.get<Record<string, unknown>>(`${tenantBase(tenant)}/kyc/checks`),
  verify: (tenant: string, check: string, fields: Record<string, unknown>, confirm: boolean) =>
    apiClient.post<PayHeroVerification>(`${tenantBase(tenant)}/kyc/verify/${encodeURIComponent(check)}`, { fields, confirm }),
  submitKYC: (tenant: string, body: { entity_type?: string; upgrade_information?: string }) =>
    apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/kyc`, body),
  refreshKYC: (tenant: string) => apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/kyc/refresh`),

  // Platform owner.
  platformSettings: () =>
    apiClient.get<{ organization_id: number; root_account_id: number }>(`${BASE}/platform/gateways/payhero/settings`),
  setPlatformSettings: (body: { organization_id: number; root_account_id: number }) =>
    apiClient.put<{ organization_id: number; root_account_id: number }>(`${BASE}/platform/gateways/payhero/settings`, body),
  detectPlatformSettings: () =>
    apiClient.post<{ organization_id: number; root_account_id: number }>(`${BASE}/platform/gateways/payhero/settings/detect`),
  teams: (balances: boolean) =>
    apiClient.get<{ teams: PayHeroTeamRow[] }>(`${BASE}/platform/gateways/payhero/teams${balances ? '?balances=true' : ''}`),
};

export interface PayHeroTeamRow {
  tenant_id: string;
  mode: string;
  vendor_id?: number;
  team_name?: string;
  enabled: boolean;
  channels: number;
  channels_synced_at?: string;
  /** Payments wallet (customer money, escrow). */
  balance?: string;
  /** Service wallet (credit that pays PayHero costs). */
  service_balance?: string;
  currency?: string;
  balance_error?: string;
}
