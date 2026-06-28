/**
 * Equity holders and payouts API client (treasury-api).
 * Platform admin endpoints — requires super_admin role.
 *
 * Covers:
 *  - GET    /platform/equity-holders                         — list all holders
 *  - POST   /platform/equity-holders                         — create holder
 *  - PUT    /platform/equity-holders/{id}                    — update holder
 *  - DELETE /platform/equity-holders/{id}                    — deactivate
 *  - GET    /platform/equity-holders/{id}/payouts            — holder payout history
 *  - GET    /platform/equity-summary?from=&to=               — summary + projections
 *  - POST   /platform/equity-holders/{id}/trigger-payout     — trigger payout
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EquityHolder {
    id: string;
    name: string;
    holder_type: 'shareholder' | 'royalty';
    email?: string;
    percentage_share: number;
    source_services?: string[];
    linked_tenant_ids?: string[]; // UUIDs of referred tenants this holder earns from
    referral_id?: string;         // FK to a referral programme record
    payout_method: string;
    payout_account_details: string; // JSON, parsed by UI
    payout_threshold: number;
    payout_frequency: 'manual' | 'monthly' | 'quarterly' | 'annually';
    payout_schedule_day: number;
    financial_year_end_month: number;
    close_of_books_day: number;
    compensation_model?: 'equity_revenue_share' | 'dividend' | 'royalty';
    tax_residency?: 'resident' | 'non_resident';
    payout_tax_treatment?: 'auto' | 'dividend' | 'royalty' | 'commission' | 'business_income' | 'exempt';
    application_id?: string; // auth-service onboarding application (KYC + EPA)
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateEquityHolderRequest {
    name: string;
    holder_type?: 'shareholder' | 'royalty';
    email?: string;
    percentage_share: number;
    source_services?: string[];
    linked_tenant_ids?: string[]; // restrict earnings to specific referred tenants
    referral_id?: string;         // referral programme FK
    payout_method?: string;
    payout_account_details?: string;
    payout_threshold?: number;
    payout_frequency?: 'manual' | 'monthly' | 'quarterly' | 'annually';
    payout_schedule_day?: number;
    financial_year_end_month?: number;
    close_of_books_day?: number;
    compensation_model?: 'equity_revenue_share' | 'dividend' | 'royalty';
    tax_residency?: 'resident' | 'non_resident';
    payout_tax_treatment?: 'auto' | 'dividend' | 'royalty' | 'commission' | 'business_income' | 'exempt';
    application_id?: string;
}

/** Platform-wide payout schedule that governs ALL equity holders. */
export interface EquityPayoutSchedule {
    frequency: 'manual' | 'monthly' | 'quarterly' | 'annually';
    schedule_day: number;
    financial_year_end_month: number;
    close_of_books_day: number;
    payout_threshold: number;
}

export interface EquityPayout {
    id: string;
    holder_id: string;
    period_start: string;
    period_end: string;
    gross_revenue: number;
    expenses: number;
    tax_amount: number;
    net_profit: number;
    holder_percentage: number;
    payout_amount: number;
    provider_fee: number;
    net_payout: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    provider_reference?: string;
    source_services?: string[];
    failure_reason?: string;
    payout_method?: string;
    created_at: string;
    updated_at: string;
}

export interface HolderProjection {
    holder_id: string;
    name: string;
    holder_type: string;
    percentage_share: number;
    source_services?: string[];
    projected_amount: number;
    payout_frequency: string;
    is_active: boolean;
}

export interface EquitySummaryResponse {
    period: { from: string; to: string };
    financial_summary: {
        gross_revenue: number;
        expenses: number;
        tax: number;
        net_profit: number;
    };
    holders: HolderProjection[];
    total_allocated: number;
    payout_schedule?: EquityPayoutSchedule;
}

export interface TriggerPayoutRequest {
    period_start: string; // YYYY-MM-DD
    period_end: string;   // YYYY-MM-DD
    override_amount?: number;
    reason?: string;
}

export interface TriggerPayoutResponse {
    payout_id: string;
    transfer_code: string;
    status: string;
    amount: number;
    currency: string;
    reference: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** List all equity holders (active and inactive).
 *  The backend returns a paginated envelope `{ data: [], total, ... }`; older/alternate
 *  shapes (`{ holders: [] }` or a bare array) are tolerated. */
export async function listEquityHolders(): Promise<{ holders: EquityHolder[] }> {
    const res = await apiClient.get<unknown>(`${BASE}/platform/equity-holders`);
    const r = res as { data?: EquityHolder[]; holders?: EquityHolder[] } | EquityHolder[];
    const holders = Array.isArray(r) ? r : (r.data ?? r.holders ?? []);
    return { holders };
}

/** Create a new shareholder or royalty holder. */
export function createEquityHolder(body: CreateEquityHolderRequest): Promise<EquityHolder> {
    return apiClient.post<EquityHolder>(`${BASE}/platform/equity-holders`, body);
}

/** Update an equity holder. */
export function updateEquityHolder(
    id: string,
    body: Partial<CreateEquityHolderRequest>,
): Promise<EquityHolder> {
    return apiClient.put<EquityHolder>(`${BASE}/platform/equity-holders/${id}`, body);
}

/** Deactivate (soft-delete) an equity holder. */
export function deactivateEquityHolder(id: string): Promise<{ status: string }> {
    return apiClient.delete<{ status: string }>(`${BASE}/platform/equity-holders/${id}`);
}

/** Get payout history for a specific holder. */
export function getHolderPayouts(holderId: string): Promise<{ payouts: EquityPayout[] }> {
    return apiClient.get<{ payouts: EquityPayout[] }>(
        `${BASE}/platform/equity-holders/${holderId}/payouts`,
    );
}

/** Get equity summary with projected payouts for a period. */
export function getEquitySummary(params?: {
    from?: string;
    to?: string;
}): Promise<EquitySummaryResponse> {
    return apiClient.get<EquitySummaryResponse>(`${BASE}/platform/equity-summary`, params);
}

/** Trigger a manual payout for an equity holder. */
export function triggerEquityPayout(
    holderId: string,
    body: TriggerPayoutRequest,
): Promise<TriggerPayoutResponse> {
    return apiClient.post<TriggerPayoutResponse>(
        `${BASE}/platform/equity-holders/${holderId}/trigger-payout`,
        body,
    );
}

// ─── Bulk Payout Run ────────────────────────────────────────────────────────────

export interface RunPayoutRequest {
    period_start: string; // YYYY-MM-DD
    period_end: string;   // YYYY-MM-DD
    dry_run: boolean;
}

export interface RunPayoutResult {
    holder_id: string;
    holder_name: string;
    amount: string;
    payout_id?: string;
    reference?: string;
    status?: string;
    skipped?: string;
}

export interface RunPayoutResponse {
    period_start: string;
    period_end: string;
    dry_run: boolean;
    results: RunPayoutResult[];
}

/** Run a payout for ALL active holders over a period. dry_run computes amounts without paying. */
export function runEquityPayout(body: RunPayoutRequest): Promise<RunPayoutResponse> {
    return apiClient.post<RunPayoutResponse>(`${BASE}/platform/equity-holders/run`, body);
}

// ─── Global Payout Schedule ─────────────────────────────────────────────────────

/** Get the platform-wide equity payout schedule (applies to all holders). */
export function getEquitySchedule(): Promise<{ schedule: EquityPayoutSchedule }> {
    return apiClient.get<{ schedule: EquityPayoutSchedule }>(`${BASE}/platform/equity-settings`);
}

/** Update the platform-wide equity payout schedule. */
export function updateEquitySchedule(
    body: EquityPayoutSchedule,
): Promise<{ schedule: EquityPayoutSchedule }> {
    return apiClient.put<{ schedule: EquityPayoutSchedule }>(`${BASE}/platform/equity-settings`, body);
}

// ─── Entitlements ─────────────────────────────────────────────────────────────

export interface EquityEntitlement {
    id: string;
    holder_id: string;
    service_id: string;
    equity_pct: string;
    vesting_start: string;
    vesting_end?: string;
    cliff_months: number;
    vesting_type: 'cliff' | 'graded';
    is_active: boolean;
    created_at: string;
}

export interface CreateEntitlementRequest {
    service_id: string;
    equity_pct: number;
    vesting_start: string;
    vesting_end?: string | null;
    cliff_months?: number;
    vesting_type?: 'cliff' | 'graded';
}

export function listEntitlements(holderId: string): Promise<{ entitlements: EquityEntitlement[] }> {
    return apiClient.get<{ entitlements: EquityEntitlement[] }>(
        `${BASE}/platform/equity-holders/${holderId}/entitlements`,
    );
}

export function createEntitlement(
    holderId: string,
    body: CreateEntitlementRequest,
): Promise<EquityEntitlement> {
    return apiClient.post<EquityEntitlement>(
        `${BASE}/platform/equity-holders/${holderId}/entitlements`,
        body,
    );
}

export function updateEntitlement(
    holderId: string,
    entitlementId: string,
    body: Partial<CreateEntitlementRequest>,
): Promise<EquityEntitlement> {
    return apiClient.put<EquityEntitlement>(
        `${BASE}/platform/equity-holders/${holderId}/entitlements/${entitlementId}`,
        body,
    );
}

export function deactivateEntitlement(
    holderId: string,
    entitlementId: string,
): Promise<{ status: string }> {
    return apiClient.delete<{ status: string }>(
        `${BASE}/platform/equity-holders/${holderId}/entitlements/${entitlementId}`,
    );
}

// ─── Platform Equity Policy ─────────────────────────────────────────────────────

/**
 * Platform equity policy — the share the platform retains before distributing the
 * remainder to equity holders. `equity_distributable_pct` is derived (1 − retention)
 * and ignored on input. Values are fractions in [0, 1) (e.g. 0.30 = 30%).
 */
export interface EquityPolicy {
    platform_retention_pct: number;
    equity_distributable_pct: number;
}

export interface UpdateEquityPolicyRequest {
    platform_retention_pct: number; // 0 ≤ x < 1
}

/** Get the platform equity policy (platform-owner only). */
export function getEquityPolicy(): Promise<{ policy: EquityPolicy }> {
    return apiClient.get<{ policy: EquityPolicy }>(`${BASE}/platform/equity-policy`);
}

/** Update the platform retention %. The distributable share is derived server-side. */
export function updateEquityPolicy(
    body: UpdateEquityPolicyRequest,
): Promise<{ policy: EquityPolicy }> {
    return apiClient.put<{ policy: EquityPolicy }>(`${BASE}/platform/equity-policy`, body);
}

// ─── Portal Link ──────────────────────────────────────────────────────────────

export interface PortalLinkResponse {
    url: string;
    expires_at: string;
}

export function generatePortalLink(holderId: string): Promise<PortalLinkResponse> {
    return apiClient.post<PortalLinkResponse>(
        `${BASE}/platform/equity-holders/${holderId}/generate-portal-link`,
        {},
    );
}
