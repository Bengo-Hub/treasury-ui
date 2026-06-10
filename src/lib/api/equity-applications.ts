/**
 * Equity-holder application admin API (auth-api).
 * Drives the production onboarding workflow: apply → KYC → EPA → approval.
 * These endpoints live on auth-api (not treasury-api), so we call AUTH_API_URL directly
 * with the platform-owner JWT (same pattern as tenant.ts::listPlatformTenants).
 */

import { useAuthStore } from '@/store/auth';

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  process.env.NEXT_PUBLIC_SSO_URL ||
  'https://sso.codevertexitsolutions.com';

export type EquityApplicationStatus =
  | 'pending'
  | 'kyc_pending'
  | 'kyc_approved'
  | 'epa_pending'
  | 'approved'
  | 'rejected';

export interface EquityApplication {
  id: string;
  tenant_id: string;
  status: EquityApplicationStatus;
  notes?: string;
  kyc_reference?: string;
  treasury_holder_id?: string;
  epa_acceptance_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateEquityApplicationRequest {
  status?: EquityApplicationStatus;
  notes?: string;
  kyc_reference?: string;
  treasury_holder_id?: string;
  epa_acceptance_id?: string;
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().session?.accessToken;
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** List all equity-holder applications (platform admin). Tolerates array / {data} / {applications} shapes. */
export async function listEquityApplications(): Promise<EquityApplication[]> {
  const res = await fetch(`${AUTH_API_URL}/api/v1/admin/equity/applications`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load applications (HTTP ${res.status})`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  return (data?.data ?? data?.applications ?? data?.items ?? []) as EquityApplication[];
}

/** Advance an application's status / link KYC ref / treasury holder / EPA acceptance. */
export async function updateEquityApplication(
  id: string,
  body: UpdateEquityApplicationRequest,
): Promise<EquityApplication> {
  const res = await fetch(`${AUTH_API_URL}/api/v1/admin/equity/applications/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update application (HTTP ${res.status})`);
  return (await res.json()) as EquityApplication;
}
