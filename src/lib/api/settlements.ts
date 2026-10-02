/**
 * Settlements API client (treasury-api): GET /{tenant}/settlements lists settlement records.
 * Platform balance and banks live in gateways.ts, platform recipients in use-platform-payouts.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ─── Settlements ──────────────────────────────────────────────────────────────

export interface Settlement {
    id: string;
    tenant_id: string;
    amount: number;
    currency: string;
    provider: string;
    status: string;
    processed_at?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}

export interface ListSettlementsResponse {
    settlements: Settlement[];
    total: number;
    page: number;
    per_page: number;
}

export interface ListSettlementsParams {
    page?: number;
    per_page?: number;
    status?: string;
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
}

/** List settlement records for a tenant. */
export function listSettlements(
    tenantSlug: string,
    params?: ListSettlementsParams,
): Promise<ListSettlementsResponse> {
    return apiClient.get<ListSettlementsResponse>(`${BASE}/${tenantSlug}/settlements`, params);
}
