/**
 * Bank Reconciliation API.
 * Base path: /api/v1/{tenantIdOrSlug}/banking
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

// Bank-account CRUD types used to live here too, against a separate, now-retired
// /banking/accounts endpoint — removed with the duplicate CRUD (see use-reconciliation.ts).
// Bank-account types/requests now live solely in lib/api/bank-accounts.ts.

export interface StatementLine {
  id: string;
  statement_id: string;
  transaction_date: string;
  description: string;
  amount: string;
  reference: string;
  /** unmatched | matched | manual — the bank_statement_line.match_status enum. */
  match_status?: string;
  matched_transaction_id?: string;
  /** Auto-match confidence 0-100, set by an auto-reconcile run. */
  confidence_score?: number;
  status?: string;
  created_at?: string;
}

export interface ImportStatementRequest {
  bank_account_id: string;
  statement_date: string;
  /** Source file format, for traceability only — stored on BankStatement.format. */
  format?: 'csv' | 'xls' | 'xlsx';
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

export interface LedgerTxn {
  id: string;
  transaction_date: string;
  description: string;
  debit_amount: string;
  credit_amount: string;
  currency: string;
  reference_type: string;
}

export interface LedgerTxnsResponse {
  transactions: LedgerTxn[];
  total: number;
}

// ---- API functions ----

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

export function listLedgerTransactions(tenantIdOrSlug: string): Promise<LedgerTxnsResponse> {
  return apiClient.get<LedgerTxnsResponse>(`${BASE}/${tenantIdOrSlug}/banking/ledger-transactions`);
}

export function getUnreconciled(tenantIdOrSlug: string): Promise<UnreconciledResponse> {
  return apiClient.get<UnreconciledResponse>(`${BASE}/${tenantIdOrSlug}/banking/unreconciled`);
}
