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
  /** The tenant's financial account this channel settles into (its ledger leaf takes the money). */
  bank_account_id?: string;
  account_matched_by?: 'auto' | 'manual';
  /** The owner's own account (platform tenant only): takes personal collections, never business money. */
  personal?: boolean;
  /** Printed as "Payable to" on the personal invoices this channel collects. */
  payee_name?: string;
}

export interface PayHeroWithdrawal {
  reference: string;
  amount: string;
  currency: string;
  channel_id?: number;
  phone?: string;
  destination: string;
  status: 'processing' | 'completed' | 'failed' | 'awaiting_approval';
  reason?: string;
  failure?: string;
  requested_at: string;
  final_at?: string;
}

export interface PayHeroRouting {
  default_channel_id: number;
  by_reference_type?: Record<string, number>;
  by_outlet?: Record<string, number>;
  /** The personal channel off-books payments (personal support agreements) settle into. */
  personal_channel_id?: number;
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
  /** The financial account the Team wallet maps to. */
  wallet_account_id?: string;
  /** The tenant's own record (name, email, phone, country), used to prefill the setup. */
  tenant_profile?: { name?: string; email?: string; phone?: string; country?: string };
  /** The platform tenant: the only one that can have personal channels. */
  is_platform?: boolean;
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

/**
 * Calls that wait on PayHero itself (Team creation, KYC, channel sync, withdrawals). treasury-api
 * gives PayHero up to 45 seconds, so these must outlive the client's 15-second default or the page
 * reports a timeout while the server is still working.
 */
const PAYHERO_CALL = { timeout: 60_000 };

export const payheroApi = {
  status: (tenant: string) => apiClient.get<PayHeroStatus>(tenantBase(tenant)),
  enable: (tenant: string, body: EnablePayHeroRequest) => apiClient.put<PayHeroStatus>(tenantBase(tenant), body),
  disable: (tenant: string) => apiClient.delete<void>(tenantBase(tenant)),
  createTeam: (tenant: string, body: { name: string; email?: string }) =>
    apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/team`, body, PAYHERO_CALL),
  /** Attach a Team that already exists on PayHero (must belong to the platform organization). */
  linkTeam: (tenant: string, accountID: number) =>
    apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/team/link`, { account_id: accountID }, PAYHERO_CALL),
  invite: (tenant: string, email: string) => apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/team/invite`, { email }, PAYHERO_CALL),
  syncChannels: (tenant: string) => apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/channels/sync`, undefined, PAYHERO_CALL),
  setChannelEnabled: (tenant: string, id: number, enabled: boolean) =>
    apiClient.patch<PayHeroStatus>(`${tenantBase(tenant)}/channels/${id}`, { enabled }),
  setRouting: (tenant: string, routing: PayHeroRouting) => apiClient.put<PayHeroStatus>(`${tenantBase(tenant)}/routing`, routing),
  /** Mark a channel as the owner's personal account (platform tenant only), or back to business. */
  setChannelPersonal: (tenant: string, id: number, personal: boolean, payeeName: string) =>
    apiClient.put<PayHeroStatus>(`${tenantBase(tenant)}/channels/${id}/personal`, { personal, payee_name: payeeName }),
  /** Map a channel to one of the tenant's financial accounts ("" clears it). */
  setChannelAccount: (tenant: string, id: number, bankAccountID: string) =>
    apiClient.put<PayHeroStatus>(`${tenantBase(tenant)}/channels/${id}/account`, { bank_account_id: bankAccountID }),
  /** Map the Team wallet to one of the tenant's financial accounts ("" clears it). */
  setWalletAccount: (tenant: string, bankAccountID: string) =>
    apiClient.put<PayHeroStatus>(`${tenantBase(tenant)}/wallet-account`, { bank_account_id: bankAccountID }),
  /** Pay out of the Team wallet to one of the tenant's channels or a phone (approval policy applies). */
  withdraw: (tenant: string, body: { amount: string; channel_id?: number; phone?: string; reason?: string }) =>
    apiClient.post<PayHeroWithdrawal>(`${tenantBase(tenant)}/wallet/withdraw`, body, PAYHERO_CALL),
  withdrawals: (tenant: string) =>
    apiClient.get<{ withdrawals: PayHeroWithdrawal[] }>(`${tenantBase(tenant)}/wallet/withdrawals`),
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
    apiClient.post<PayHeroVerification>(`${tenantBase(tenant)}/kyc/verify/${encodeURIComponent(check)}`, { fields, confirm }, PAYHERO_CALL),
  submitKYC: (tenant: string, body: { entity_type?: string; upgrade_information?: string }) =>
    apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/kyc`, body, PAYHERO_CALL),
  refreshKYC: (tenant: string) => apiClient.post<PayHeroStatus>(`${tenantBase(tenant)}/kyc/refresh`, undefined, PAYHERO_CALL),

  // Platform owner.
  platformSettings: () =>
    apiClient.get<PayHeroPlatformSettings>(`${BASE}/platform/gateways/payhero/settings`),
  setPlatformSettings: (body: { organization_id: number; root_account_id: number; fee_bearer?: PayHeroFeeBearer }) =>
    apiClient.put<PayHeroPlatformSettings>(`${BASE}/platform/gateways/payhero/settings`, body),
  detectPlatformSettings: () =>
    apiClient.post<{ organization_id: number; root_account_id: number }>(`${BASE}/platform/gateways/payhero/settings/detect`),
  /** Platform owner: create a tenant's Team (name and email default to the tenant's record). */
  platformCreateTeam: (tenantID: string, body: { name?: string; email?: string } = {}) =>
    apiClient.post<PayHeroStatus>(`${BASE}/platform/gateways/payhero/teams/${tenantID}`, body),
  /** Platform owner: link an existing Team to a tenant. */
  platformLinkTeam: (tenantID: string, accountID: number) =>
    apiClient.post<PayHeroStatus>(`${BASE}/platform/gateways/payhero/teams/${tenantID}/link`, { account_id: accountID }),
  /** Platform owner: every channel on the shared root account and the tenant it is assigned to. */
  rootChannels: () =>
    apiClient.get<{ channels: PayHeroRootChannel[] }>(`${BASE}/platform/gateways/payhero/channels`),
  /** Platform owner: give a root-account channel to a tenant on the shared account. */
  assignChannel: (channelID: number, tenantID: string) =>
    apiClient.post<PayHeroStatus>(`${BASE}/platform/gateways/payhero/channels/${channelID}/assign`, { tenant_id: tenantID }, PAYHERO_CALL),
  unassignChannel: (channelID: number) =>
    apiClient.delete<void>(`${BASE}/platform/gateways/payhero/channels/${channelID}/assign`),
  /** Public: what a PayHero payment will prompt for (fee 0 when the merchant bears it; empty when no tariff). */
  feeQuote: (tenant: string, amount: number, currency: string, referenceType?: string) =>
    apiClient.get<PayHeroFeeQuote | ''>(`${BASE}/pay/${encodeURIComponent(tenant)}/fees/payhero`, { amount, currency, reference_type: referenceType }),
  teams: (balances: boolean) =>
    apiClient.get<{ teams: PayHeroTeamRow[] }>(`${BASE}/platform/gateways/payhero/teams${balances ? '?balances=true' : ''}`),
};

export type PayHeroFeeBearer = 'payer' | 'merchant';

export interface PayHeroPlatformSettings {
  organization_id: number;
  root_account_id: number;
  /** Who bears PayHero's cost on tenants' collections: payer adds it to the prompt. */
  fee_bearer: PayHeroFeeBearer;
}

export interface PayHeroRootChannel {
  id: number;
  account_id: number;
  channel_type: string;
  short_code: string;
  account_number: string;
  description: string;
  is_active: boolean;
  /** The tenant this channel is assigned to; absent means it is the platform's own. */
  owner_tenant_id?: string;
}

export interface PayHeroFeeQuote {
  fee: string;
  total: string;
  currency: string;
  bearer: PayHeroFeeBearer;
}

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
