/**
 * Bank Accounts API — the tenant's shared list of business bank accounts, pickable anywhere
 * bank details are shown (invoice/quotation bank block, payout config, payment profile).
 * Base path: /api/v1/{tenantIdOrSlug}/bank-accounts
 */

import { apiClient } from './client';

const BASE = '/api/v1';

export interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  bank_branch?: string;
  branch_code?: string;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BankAccountsResponse {
  bank_accounts: BankAccount[];
  total: number;
}

export interface BankAccountRequest {
  account_name: string;
  bank_name: string;
  account_number: string;
  bank_branch?: string;
  branch_code?: string;
  currency?: string;
  is_active?: boolean;
}

export function listBankAccounts(tenantIdOrSlug: string): Promise<BankAccountsResponse> {
  return apiClient.get<BankAccountsResponse>(`${BASE}/${tenantIdOrSlug}/bank-accounts`);
}

export function createBankAccount(tenantIdOrSlug: string, data: BankAccountRequest): Promise<BankAccount> {
  return apiClient.post<BankAccount>(`${BASE}/${tenantIdOrSlug}/bank-accounts`, data);
}

export function updateBankAccount(tenantIdOrSlug: string, id: string, data: BankAccountRequest): Promise<BankAccount> {
  return apiClient.put<BankAccount>(`${BASE}/${tenantIdOrSlug}/bank-accounts/${id}`, data);
}

export function deleteBankAccount(tenantIdOrSlug: string, id: string): Promise<{ status: string }> {
  return apiClient.delete<{ status: string }>(`${BASE}/${tenantIdOrSlug}/bank-accounts/${id}`);
}
