/**
 * Referral programs, referrals, and rewards API client (treasury-api).
 * Platform admin endpoints — requires super_admin role.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReferralProgram {
  id: string;
  name: string;
  description?: string;
  reward_type: string;
  revenue_share_percentage?: string;
  fixed_reward_amount?: string;
  currency: string;
  discount_percentage?: string;
  discount_duration_months?: number;
  gift_card_value?: string;
  coupon_code_prefix?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateReferralProgramRequest {
  name: string;
  description?: string;
  reward_type: string;
  revenue_share_percentage?: string;
  fixed_reward_amount?: string;
  currency?: string;
  discount_percentage?: string;
  discount_duration_months?: number;
  gift_card_value?: string;
  coupon_code_prefix?: string;
}

export interface Referral {
  id: string;
  program_id: string;
  referrer_tenant_id: string;
  referred_tenant_id: string;
  referral_code: string;
  status: string;
  notes?: string;
  attributed_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateReferralRequest {
  program_id: string;
  referrer_tenant_id: string;
  referred_tenant_id: string;
  notes?: string;
}

export interface ReferralReward {
  id: string;
  referral_id: string;
  reward_type: string;
  amount?: string;
  currency: string;
  status: string;
  description?: string;
  issued_at?: string;
  redeemed_at?: string;
  created_at: string;
}

export interface IssueRewardRequest {
  reward_type: string;
  amount?: string;
  currency?: string;
  description?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** List all referral programs. */
export function listPrograms(): Promise<{ programs: ReferralProgram[] }> {
  return apiClient.get<{ programs: ReferralProgram[] }>(`${BASE}/platform/referral-programs`);
}

/** Create a new referral program. */
export function createProgram(body: CreateReferralProgramRequest): Promise<ReferralProgram> {
  return apiClient.post<ReferralProgram>(`${BASE}/platform/referral-programs`, body);
}

/** Update an existing referral program. */
export function updateProgram(
  id: string,
  body: Partial<CreateReferralProgramRequest> & { is_active?: boolean },
): Promise<ReferralProgram> {
  return apiClient.put<ReferralProgram>(`${BASE}/platform/referral-programs/${id}`, body);
}

/** Delete a referral program. */
export function deleteProgram(id: string): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/platform/referral-programs/${id}`);
}

/** List all referrals. */
export function listReferrals(): Promise<{ referrals: Referral[] }> {
  return apiClient.get<{ referrals: Referral[] }>(`${BASE}/platform/referrals`);
}

/** Create a new referral. */
export function createReferral(body: CreateReferralRequest): Promise<Referral> {
  return apiClient.post<Referral>(`${BASE}/platform/referrals`, body);
}

/** Update a referral. */
export function updateReferral(
  id: string,
  body: Partial<CreateReferralRequest> & { status?: string },
): Promise<Referral> {
  return apiClient.put<Referral>(`${BASE}/platform/referrals/${id}`, body);
}

/** List rewards for a specific referral. */
export function listRewards(referralId: string): Promise<{ rewards: ReferralReward[] }> {
  return apiClient.get<{ rewards: ReferralReward[] }>(`${BASE}/platform/referrals/${referralId}/rewards`);
}

/** Issue a reward for a referral. */
export function issueReward(referralId: string, body: IssueRewardRequest): Promise<ReferralReward> {
  return apiClient.post<ReferralReward>(`${BASE}/platform/referrals/${referralId}/issue-reward`, body);
}
