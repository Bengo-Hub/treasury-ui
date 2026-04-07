/**
 * Ledger Accounts (Chart of Accounts) API.
 * Base path: /api/v1/{tenantIdOrSlug}/ledger
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

export interface Account {
  id: string;
  tenant_id?: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
  is_active?: boolean;
  description?: string;
  balance: string;
  currency?: string;
  metadata?: Record<string, any>;
  children?: Account[];
  created_at?: string;
  updated_at?: string;
}

export interface AccountsResponse {
  accounts: Account[];
  total: number;
}

export interface CreateAccountRequest {
  account_code: string;
  account_name: string;
  account_type: string;
  description?: string;
  parent_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAccountRequest {
  account_name?: string;
  description?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

// ---- API functions ----

/**
 * Normalize an account object from the backend.
 * The /chart-of-accounts endpoint returns short field names (code, name, type)
 * while the /accounts endpoint returns account_code, account_name, account_type.
 * This ensures a consistent shape regardless of which endpoint is used.
 */
function normalizeAccount(raw: any): Account {
  return {
    ...raw,
    account_code: raw.account_code || raw.code || '',
    account_name: raw.account_name || raw.name || '',
    account_type: raw.account_type || raw.type || 'asset',
    children: raw.children?.map(normalizeAccount),
  };
}

export async function listAccounts(tenantIdOrSlug: string, params?: Record<string, string>): Promise<AccountsResponse> {
  const data = await apiClient.get<any>(`${BASE}/${tenantIdOrSlug}/ledger/chart-of-accounts`, params);
  const rawAccounts: any[] = data?.accounts ?? [];
  return {
    accounts: rawAccounts.map(normalizeAccount),
    total: data?.total ?? rawAccounts.length,
  };
}

export function createAccount(tenantIdOrSlug: string, data: CreateAccountRequest): Promise<Account> {
  return apiClient.post<Account>(`${BASE}/${tenantIdOrSlug}/ledger/accounts`, data);
}

export function updateAccount(tenantIdOrSlug: string, id: string, data: UpdateAccountRequest): Promise<Account> {
  return apiClient.patch<Account>(`${BASE}/${tenantIdOrSlug}/ledger/accounts/${id}`, data);
}

export function deactivateAccount(tenantIdOrSlug: string, id: string): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenantIdOrSlug}/ledger/accounts/${id}`);
}
