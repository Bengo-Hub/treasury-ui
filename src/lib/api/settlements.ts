/**
 * Settlements and Payouts API client (treasury-api).
 * Covers:
 *  - GET  /{tenant}/settlements      — list settlement records
 *  - GET  /{tenant}/payouts          — list payout records
 *  - POST /{tenant}/payouts          — create / initiate a payout
 *  - GET  /platform/payouts/banks    — list Paystack banks (superuser)
 *  - GET  /platform/balance          — platform Paystack balance (superuser)
 *  - POST /platform/payouts/recipients — create Paystack transfer recipient
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

// ─── Payouts ──────────────────────────────────────────────────────────────────

export interface Payout {
    id: string;
    amount: number;
    currency: string;
    provider: string;
    provider_reference: string;
    status: string;
    notes?: string;
    created_at: string;
}

export interface ListPayoutsResponse {
    payouts: Payout[];
    total: number;
    page: number;
    per_page: number;
}

export interface CreatePayoutRequest {
    amount: number;
    currency?: string; // defaults to KES
    recipient_code?: string;  // Paystack RCP_xxx or M-Pesa phone
    payout_method?: string;   // paystack_transfer | mpesa_b2c
    reason?: string;
    reference?: string;
    // For inline recipient creation (if no recipient_code):
    recipient_name?: string;
    bank_code?: string;
    account_number?: string;
    recipient_type?: string; // nuban | mobile_money
}

export interface CreatePayoutResponse {
    payout_id: string;
    transfer_code?: string;
    status: string;
    amount: number;
    currency: string;
    reference: string;
}

/** List payout records for a tenant. */
export function listPayouts(
    tenantSlug: string,
    params?: { page?: number; per_page?: number; status?: string },
): Promise<ListPayoutsResponse> {
    return apiClient.get<ListPayoutsResponse>(`${BASE}/${tenantSlug}/payouts`, params);
}

/** Initiate a payout from platform balance to a tenant's registered account. */
export function createPayout(
    tenantSlug: string,
    body: CreatePayoutRequest,
): Promise<CreatePayoutResponse> {
    return apiClient.post<CreatePayoutResponse>(`${BASE}/${tenantSlug}/payouts`, body);
}

// ─── Banks & Recipients (Platform) ────────────────────────────────────────────

export interface BankInfo {
    name: string;
    code: string;
    type: string; // nuban | mobile_money | basa
    country: string;
    currency: string;
}

export interface ListBanksResponse {
    banks: BankInfo[];
    country: string;
}

export interface CreateRecipientRequest {
    type: string;           // nuban | mobile_money
    name: string;
    account_number: string;
    bank_code: string;
    currency: string;
    description?: string;
    mobile_money_provider?: string; // mpesa | airtel_money
}

export interface CreateRecipientResponse {
    recipient_code: string;
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
    currency: string;
}

/** List supported banks and mobile money providers (Paystack). (superuser) */
export function listBanks(country = 'kenya'): Promise<ListBanksResponse> {
    return apiClient.get<ListBanksResponse>(`${BASE}/platform/payouts/banks`, { country });
}

/** Create a Paystack transfer recipient for a tenant or equity holder. (superuser) */
export function createTransferRecipient(
    body: CreateRecipientRequest,
): Promise<CreateRecipientResponse> {
    return apiClient.post<CreateRecipientResponse>(`${BASE}/platform/payouts/recipients`, body);
}

// ─── Platform Balance ─────────────────────────────────────────────────────────

export interface PlatformBalance {
    currency: string;
    balance: number;
    ledger_balance?: number;
}

/** Get current Paystack platform balance. (superuser) */
export function getPlatformBalance(): Promise<PlatformBalance> {
    return apiClient.get<PlatformBalance>(`${BASE}/platform/balance`);
}
