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
    payout_method: string;
    payout_account_details: string; // JSON, parsed by UI
    payout_threshold: number;
    payout_frequency: 'manual' | 'monthly' | 'quarterly';
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
    payout_method?: string;
    payout_account_details?: string;
    payout_threshold?: number;
    payout_frequency?: 'manual' | 'monthly' | 'quarterly';
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

/** List all equity holders (active and inactive). */
export function listEquityHolders(): Promise<{ holders: EquityHolder[] }> {
    return apiClient.get<{ holders: EquityHolder[] }>(`${BASE}/platform/equity-holders`);
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
