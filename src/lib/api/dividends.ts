/**
 * Dividend declaration API client (treasury-api's internal/http/handlers/dividends.go).
 * Platform admin endpoints — requires super_admin role. Only valid against an
 * "umbrella" equity holder (compensation_model=dividend, no parent_holder_id).
 *
 * Covers:
 *  - GET  /platform/equity-holders/{id}/dividends                 — list declarations
 *  - POST /platform/equity-holders/{id}/dividends                 — declare (creates a draft)
 *  - GET  /platform/equity-holders/{id}/dividends/{declId}        — get one (live line items)
 *  - POST /platform/equity-holders/{id}/dividends/{declId}/approve
 *  - POST /platform/equity-holders/{id}/dividends/{declId}/pay
 *  - POST /platform/equity-holders/{id}/dividends/{declId}/cancel
 *
 * IMPORTANT — there is no dry-run/preview endpoint: the backend only computes
 * the "available for distribution" ceiling breakdown (cumulative_net_profit,
 * accrued_referral_obligations, available_for_distribution) as a side effect of
 * actually declaring (POST .../dividends), which creates a real draft row.
 * GetDividendDeclaration/ListDividendDeclarations never return those three
 * fields (they're `omitempty` on the backend and only populated by the declare
 * response). So there is no way to show the ceiling BEFORE a real submit
 * attempt without either (a) re-deriving the net-profit/obligations math
 * client-side — which the backend's own doc comments say is a real accounting
 * ceiling check that must not be duplicated — or (b) creating throwaway draft
 * rows just to read a number. Neither is acceptable, so the UI surfaces the
 * ceiling breakdown from the declare call's own response/rejection instead of
 * pretending to preview it up front. See equity-dividends.tsx for how this is
 * presented.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DividendDeclarationStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface DividendShareholderLineItem {
    holder_id: string;
    name: string;
    percentage_share: string; // decimal string, 4dp
    share_count?: number;
    gross: string;
    tax_withheld: string;
    net: string;
}

export interface DividendDeclaration {
    id: string;
    holder_id: string; // the umbrella holder this declaration belongs to
    period_start: string; // YYYY-MM-DD
    period_end: string;   // YYYY-MM-DD
    net_profit: string;               // snapshot: this declaration's own period net profit, fixed at creation
    declared_payout_amount: string;
    declared_retained_amount: string;
    status: DividendDeclarationStatus;
    notes?: string;
    shareholder_line_items: DividendShareholderLineItem[] | null;
    created_at: string;
    // Live, as-of-now figures. Populated ONLY on the DeclareDividend (create)
    // response — omitted (undefined) on list/get/approve/pay/cancel responses.
    cumulative_net_profit?: string;
    accrued_referral_obligations?: string;
    available_for_distribution?: string;
}

export interface DeclareDividendRequest {
    period_start: string; // YYYY-MM-DD
    period_end: string;   // YYYY-MM-DD
    declared_payout_amount: string; // decimal string
    notes?: string;
}

export interface DividendPayResult {
    holder_id: string;
    name: string;
    net: string;
    status?: string;
    skipped?: string;
}

export interface DividendPayResponse {
    declaration_id: string;
    results: DividendPayResult[];
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function listDividendDeclarations(umbrellaId: string): Promise<{ declarations: DividendDeclaration[] }> {
    return apiClient.get<{ declarations: DividendDeclaration[] }>(
        `${BASE}/platform/equity-holders/${umbrellaId}/dividends`,
    );
}

/** Declares a new dividend (creates a draft). Rejected with 400 if it exceeds the
 *  profits-available-for-distribution ceiling — the rejection message carries the
 *  full breakdown; surface it verbatim rather than re-deriving the numbers. */
export function declareDividend(
    umbrellaId: string,
    body: DeclareDividendRequest,
): Promise<DividendDeclaration> {
    return apiClient.post<DividendDeclaration>(
        `${BASE}/platform/equity-holders/${umbrellaId}/dividends`,
        body,
    );
}

export function getDividendDeclaration(umbrellaId: string, declId: string): Promise<DividendDeclaration> {
    return apiClient.get<DividendDeclaration>(
        `${BASE}/platform/equity-holders/${umbrellaId}/dividends/${declId}`,
    );
}

/** Moves a draft declaration to approved. 409s if it isn't currently a draft. */
export function approveDividendDeclaration(umbrellaId: string, declId: string): Promise<DividendDeclaration> {
    return apiClient.post<DividendDeclaration>(
        `${BASE}/platform/equity-holders/${umbrellaId}/dividends/${declId}/approve`,
        {},
    );
}

/** Disburses an approved declaration pro-rata via Paystack. Idempotent per
 *  (declaration, shareholder) — safe to retry against an already-`paid`
 *  declaration to pick up any shareholder that failed the first time. 409s
 *  if the declaration is still a draft or was cancelled. */
export function payDividendDeclaration(umbrellaId: string, declId: string): Promise<DividendPayResponse> {
    return apiClient.post<DividendPayResponse>(
        `${BASE}/platform/equity-holders/${umbrellaId}/dividends/${declId}/pay`,
        {},
    );
}

/** Cancels a draft or approved (not yet paid) declaration. 409s if already paid. */
export function cancelDividendDeclaration(umbrellaId: string, declId: string): Promise<DividendDeclaration> {
    return apiClient.post<DividendDeclaration>(
        `${BASE}/platform/equity-holders/${umbrellaId}/dividends/${declId}/cancel`,
        {},
    );
}
