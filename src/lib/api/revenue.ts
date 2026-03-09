/**
 * Revenue analytics and M-Pesa tenant configuration API client (treasury-api).
 *
 * Covers:
 *  - GET  /platform/analytics/revenue-by-service  — breakdown by source service
 *  - GET  /platform/analytics/net-profit          — platform net profit summary
 *  - GET  /{tenant}/analytics/money-flow          — tenant money flow
 *  - GET  /{tenant}/gateways/mpesa/config         — get tenant M-Pesa config
 *  - PUT  /{tenant}/gateways/mpesa/config         — update tenant M-Pesa config
 *  - POST /{tenant}/gateways/mpesa/register-c2b   — register C2B URLs
 *  - GET  /{tenant}/gateways/mpesa/qr             — get merchant QR code
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ─── Revenue Analytics ────────────────────────────────────────────────────────

export interface ServiceRevenue {
    service: string;
    gross_revenue: number;
    transaction_count: number;
    currency: string;
}

export interface RevenueByServiceResponse {
    period: { from: string; to: string };
    services: ServiceRevenue[];
    total_revenue: number;
    currency: string;
}

export interface NetProfitResponse {
    period: { from: string; to: string };
    gross_revenue: number;
    expenses: number;
    tax: number;
    net_profit: number;
    currency: string;
    by_service?: ServiceRevenue[];
}

export interface MoneyFlowResponse {
    period: { from: string; to: string };
    inflows: number;
    outflows: number;
    net: number;
    currency: string;
    breakdown: {
        payment_method: string;
        amount: number;
        count: number;
    }[];
}

export interface AnalyticsParams {
    from?: string;  // YYYY-MM-DD
    to?: string;    // YYYY-MM-DD
    service?: string;
}

/** Get revenue breakdown by originating microservice. (superuser) */
export function getRevenueByService(params?: AnalyticsParams): Promise<RevenueByServiceResponse> {
    return apiClient.get<RevenueByServiceResponse>(
        `${BASE}/platform/analytics/revenue-by-service`,
        params,
    );
}

/** Get platform net profit summary. (superuser) */
export function getNetProfit(params?: AnalyticsParams): Promise<NetProfitResponse> {
    return apiClient.get<NetProfitResponse>(`${BASE}/platform/analytics/net-profit`, params);
}

/** Get tenant-level money flow analytics. (tenant admin) */
export function getTenantMoneyFlow(
    tenantSlug: string,
    params?: AnalyticsParams,
): Promise<MoneyFlowResponse> {
    return apiClient.get<MoneyFlowResponse>(
        `${BASE}/${tenantSlug}/analytics/money-flow`,
        params,
    );
}

// ─── Tenant M-Pesa Configuration ──────────────────────────────────────────────

export interface TenantMpesaConfig {
    shortcode?: string;
    initiator_name?: string;
    // initiator_password is never returned to the UI (write-only)
    account_ref?: string;
    qr_enabled: boolean;
    c2b_registered: boolean;
}

export interface UpdateTenantMpesaConfigRequest {
    shortcode?: string;
    initiator_name?: string;
    initiator_password?: string; // write-only, sent securely
    account_ref?: string;
    qr_enabled?: boolean;
}

export interface MpesaQRResponse {
    qr_data: string;
    image_base64: string;
    payment_url?: string;
}

export interface RegisterC2BResponse {
    success: boolean;
    message: string;
}

/** Get tenant's M-Pesa configuration (no credentials returned). */
export function getTenantMpesaConfig(tenantSlug: string): Promise<TenantMpesaConfig> {
    return apiClient.get<TenantMpesaConfig>(`${BASE}/${tenantSlug}/gateways/mpesa/config`);
}

/** Update tenant's M-Pesa configuration. */
export function updateTenantMpesaConfig(
    tenantSlug: string,
    body: UpdateTenantMpesaConfigRequest,
): Promise<TenantMpesaConfig> {
    return apiClient.put<TenantMpesaConfig>(
        `${BASE}/${tenantSlug}/gateways/mpesa/config`,
        body,
    );
}

/** Register C2B callback URLs for the tenant's M-Pesa shortcode. */
export function registerMpesaC2BURLs(tenantSlug: string): Promise<RegisterC2BResponse> {
    return apiClient.post<RegisterC2BResponse>(
        `${BASE}/${tenantSlug}/gateways/mpesa/register-c2b`,
        {},
    );
}

/** Get or generate a static M-Pesa QR code for the tenant. */
export function getTenantMpesaQR(tenantSlug: string): Promise<MpesaQRResponse> {
    return apiClient.get<MpesaQRResponse>(`${BASE}/${tenantSlug}/gateways/mpesa/qr`);
}
