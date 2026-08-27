/**
 * Financial Accounts API — the tenant's REAL, ledger-linked money-holding accounts: bank accounts,
 * mobile-money tills/paybills, cash drawers, and the platform's own gateway settlement balance
 * (account_type). Each one has its own dedicated GL leaf, so its balance and statement are always
 * derived from the ledger, never a stored figure. Also the shared list of business bank accounts
 * pickable anywhere bank details are shown (invoice/quotation bank block, payout config, payment
 * profile) — see BankAccountForm/BankAccountVerify, reused unchanged for the bank type here.
 * Base path: /api/v1/{tenantIdOrSlug}/bank-accounts
 */

import { apiClient } from './client';
import { formatCurrency } from '@/lib/utils/currency';

const BASE = '/api/v1';

export type AccountType = 'bank' | 'mobile_money' | 'cash' | 'gateway';

export interface BankAccount {
  id: string;
  account_type: AccountType;
  account_name: string;
  bank_name?: string;
  account_number?: string;
  bank_branch?: string;
  branch_code?: string;
  currency: string;
  /** GL-derived — never a stored figure the client can trust as authoritative on write. */
  balance: string;
  ledger_account_id?: string;
  ledger_account_code?: string;
  gateway_config_id?: string;
  custodian_user_id?: string;
  outlet_id?: string;
  default_payment_methods?: string[];
  opened_at?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BankAccountsResponse {
  bank_accounts: BankAccount[];
  total: number;
}

/** Shared "which account, and how much is in it" hint for every account picker across the app
 *  (Record Payment, Receive Payment, Pay Bill, Mark Expense Paid) — so a user isn't choosing an
 *  account blind. Falls back to the account number when there's no bank_name (mobile_money/cash). */
export function bankAccountHint(a: BankAccount): string {
  const identity = a.bank_name || a.account_number || '';
  const balance = a.balance !== undefined ? formatCurrency(Number(a.balance) || 0, a.currency) : '';
  return [identity, balance].filter(Boolean).join(' · ');
}

export interface BankAccountRequest {
  account_type?: AccountType;
  account_name: string;
  bank_name?: string;
  account_number?: string;
  bank_branch?: string;
  branch_code?: string;
  currency?: string;
  gateway_config_id?: string;
  custodian_user_id?: string;
  outlet_id?: string;
  /** Only honored on create — posts an Opening Balance Equity journal entry. */
  opening_balance?: number;
  is_active?: boolean;
  /** Tender/payment_method values (e.g. "paystack", "mpesa", "card") that should automatically
   *  post to this account when a payment carries no explicit account_id — feeds
   *  ledger.ResolveCashCode's tier-2 lookup. Free-form: whatever string the paying service tags
   *  the payment with. */
  default_payment_methods?: string[];
}

export interface AccountBalance {
  account_id: string;
  currency: string;
  balance: string;
  ledger_account_code?: string;
}

export interface AccountStatementLine {
  date: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  debit: string;
  credit: string;
  running_balance: string;
}

export interface AccountStatement {
  account_id: string;
  account_name: string;
  account_type: AccountType;
  currency: string;
  ledger_account_code?: string;
  opening_balance: string;
  closing_balance: string;
  lines: AccountStatementLine[];
  total: number;
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

export function getAccountBalance(tenantIdOrSlug: string, id: string): Promise<AccountBalance> {
  return apiClient.get<AccountBalance>(`${BASE}/${tenantIdOrSlug}/bank-accounts/${id}/balance`);
}

/**
 * Repairs an account whose ledger leaf was never provisioned (a legacy row from before this
 * account-type/ledger-linking work existed) — idempotent, safe to call on an already-linked
 * account. This is what actually fixes the "this account is not linked to the ledger yet" 409.
 */
export function linkAccountLedger(tenantIdOrSlug: string, id: string): Promise<BankAccount> {
  return apiClient.post<BankAccount>(`${BASE}/${tenantIdOrSlug}/bank-accounts/${id}/link-ledger`, {});
}

export function getAccountStatement(
  tenantIdOrSlug: string,
  id: string,
  params?: { from?: string; to?: string },
): Promise<AccountStatement> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  const qs = query.toString();
  return apiClient.get<AccountStatement>(
    `${BASE}/${tenantIdOrSlug}/bank-accounts/${id}/statement${qs ? `?${qs}` : ''}`,
  );
}

/** Returns the statement.csv endpoint URL for a direct browser download link. */
export function accountStatementCsvUrl(
  tenantIdOrSlug: string,
  id: string,
  params?: { from?: string; to?: string },
): string {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  const qs = query.toString();
  return `${BASE}/${tenantIdOrSlug}/bank-accounts/${id}/statement.csv${qs ? `?${qs}` : ''}`;
}
