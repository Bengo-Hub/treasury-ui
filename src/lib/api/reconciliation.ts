/**
 * Bank Reconciliation API.
 * Base path: /api/v1/{tenantIdOrSlug}/banking
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

export interface BankAccount {
  id: string;
  tenant_id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  currency: string;
  ledger_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccountsResponse {
  accounts: BankAccount[];
  total: number;
}

export interface CreateBankAccountRequest {
  account_name: string;
  bank_name: string;
  account_number: string;
  currency: string;
  ledger_account_id?: string;
}

export interface StatementLine {
  id: string;
  statement_id: string;
  transaction_date: string;
  description: string;
  amount: string;
  reference: string;
  matched_transaction_id?: string;
  status?: string;
  created_at?: string;
}

export interface ImportStatementRequest {
  bank_account_id: string;
  statement_date: string;
  lines: {
    transaction_date: string;
    description: string;
    amount: number;
    reference: string;
  }[];
}

export interface ImportStatementResponse {
  statement_id: string;
  lines_imported: number;
}

export interface StatementLinesResponse {
  lines: StatementLine[];
  total: number;
}

export interface AutoReconcileResponse {
  matched: number;
}

export interface UnreconciledResponse {
  lines: StatementLine[];
  total: number;
}

// ---- API functions ----

export function listBankAccounts(tenantIdOrSlug: string): Promise<BankAccountsResponse> {
  return apiClient.get<BankAccountsResponse>(`${BASE}/${tenantIdOrSlug}/banking/accounts`);
}

export function createBankAccount(tenantIdOrSlug: string, data: CreateBankAccountRequest): Promise<BankAccount> {
  return apiClient.post<BankAccount>(`${BASE}/${tenantIdOrSlug}/banking/accounts`, data);
}

export function importStatement(tenantIdOrSlug: string, data: ImportStatementRequest): Promise<ImportStatementResponse> {
  return apiClient.post<ImportStatementResponse>(`${BASE}/${tenantIdOrSlug}/banking/statements/import`, data);
}

export function getStatementLines(tenantIdOrSlug: string, statementId: string): Promise<StatementLinesResponse> {
  return apiClient.get<StatementLinesResponse>(`${BASE}/${tenantIdOrSlug}/banking/statements/${statementId}`);
}

export function autoReconcile(tenantIdOrSlug: string, statementId: string): Promise<AutoReconcileResponse> {
  return apiClient.post<AutoReconcileResponse>(`${BASE}/${tenantIdOrSlug}/banking/reconcile`, { statement_id: statementId });
}

export function manualMatch(tenantIdOrSlug: string, lineId: string, transactionId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/banking/reconcile/manual`, {
    line_id: lineId,
    transaction_id: transactionId,
  });
}

export function getUnreconciled(tenantIdOrSlug: string): Promise<UnreconciledResponse> {
  return apiClient.get<UnreconciledResponse>(`${BASE}/${tenantIdOrSlug}/banking/unreconciled`);
}
