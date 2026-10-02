/**
 * Tenant outbound webhooks (treasury-api, plan feature webhooks).
 *   /api/v1/{tenant}/developer/webhooks/...
 */

import { apiClient } from './client';
import type { PageEnvelope as PaginatedResponse } from './paginate';

const base = (tenant: string) => `/api/v1/${tenant}/developer/webhooks`;

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description?: string;
  is_active: boolean;
  consecutive_failures: number;
  created_at: string;
}

export interface WebhookEndpointWithSecret extends WebhookEndpoint {
  signing_secret: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_id: string;
  event_type: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  next_attempt_at: string;
  last_status_code?: number;
  last_error?: string;
  delivered_at?: string;
  created_at: string;
}

export interface EndpointRequest {
  url?: string;
  events?: string[];
  description?: string;
  is_active?: boolean;
}

export const webhooksApi = {
  list: (tenant: string) => apiClient.get<{ endpoints: WebhookEndpoint[] }>(`${base(tenant)}/endpoints`),
  create: (tenant: string, body: EndpointRequest) => apiClient.post<WebhookEndpointWithSecret>(`${base(tenant)}/endpoints`, body),
  update: (tenant: string, id: string, body: EndpointRequest) =>
    apiClient.put<WebhookEndpoint>(`${base(tenant)}/endpoints/${id}`, body),
  remove: (tenant: string, id: string) => apiClient.delete<void>(`${base(tenant)}/endpoints/${id}`),
  rotate: (tenant: string, id: string) =>
    apiClient.post<WebhookEndpointWithSecret>(`${base(tenant)}/endpoints/${id}/rotate-secret`),
  ping: (tenant: string, id: string) => apiClient.post<WebhookDelivery>(`${base(tenant)}/endpoints/${id}/ping`),
  deliveries: (tenant: string, params: { endpointId?: string; status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.endpointId) q.set('endpoint_id', params.endpointId);
    if (params.status) q.set('status', params.status);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 20));
    return apiClient.get<PaginatedResponse<WebhookDelivery>>(`${base(tenant)}/deliveries?${q.toString()}`);
  },
  replay: (tenant: string, id: string) => apiClient.post<WebhookDelivery>(`${base(tenant)}/deliveries/${id}/replay`),
};
