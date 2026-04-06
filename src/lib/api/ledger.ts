/**
 * Ledger API client (treasury-api).
 * Covers journal entries, trial balance, and accounting periods.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

export interface JournalLine {
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit_amount: number | string;
  credit_amount: number | string;
  currency?: string;
  description?: string;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  entry_number: string;
  entry_date: string;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'posted' | 'reversed';
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  posted_by?: string;
  posted_at?: string;
  reversed_entry_id?: string;
  reference_type?: string;
  reference_id?: string;
  lines: JournalLine[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateJournalEntryRequest {
  entry_date: string;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  lines: Omit<JournalLine, 'account_code' | 'account_name'>[];
  metadata?: Record<string, unknown>;
}

export interface ListJournalEntriesParams {
  status?: string;
  from?: string;
  to?: string;
  reference_type?: string;
}

export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: string | number;
  credit: string | number;
}

export interface TrialBalance {
  as_of: string;
  tenant_id: string;
  rows: TrialBalanceRow[];
  total_debit: string | number;
  total_credit: string | number;
  is_balanced: boolean;
}

export interface AccountingPeriod {
  id: string;
  tenant_id: string;
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
  status: string;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
}

export interface CreatePeriodRequest {
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
}

// ---- API Functions ----

export function listJournalEntries(
  tenantSlug: string,
  params?: ListJournalEntriesParams,
): Promise<{ entries: JournalEntry[]; total: number }> {
  return apiClient.get(`${BASE}/${tenantSlug}/ledger/journal-entries`, params);
}

export function createJournalEntry(
  tenantSlug: string,
  body: CreateJournalEntryRequest,
): Promise<JournalEntry> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/journal-entries`, body);
}

export function getJournalEntry(
  tenantSlug: string,
  entryID: string,
): Promise<JournalEntry> {
  return apiClient.get(`${BASE}/${tenantSlug}/ledger/journal-entries/${entryID}`);
}

export function submitJournalEntry(
  tenantSlug: string,
  entryID: string,
): Promise<{ status: string }> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/journal-entries/${entryID}/submit`);
}

export function approveJournalEntry(
  tenantSlug: string,
  entryID: string,
): Promise<{ status: string }> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/journal-entries/${entryID}/approve`);
}

export function postJournalEntry(
  tenantSlug: string,
  entryID: string,
): Promise<{ status: string }> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/journal-entries/${entryID}/post`);
}

export function reverseJournalEntry(
  tenantSlug: string,
  entryID: string,
): Promise<JournalEntry> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/journal-entries/${entryID}/reverse`);
}

export function getTrialBalance(
  tenantSlug: string,
  asOf?: string,
): Promise<TrialBalance> {
  return apiClient.get(`${BASE}/${tenantSlug}/ledger/trial-balance`, asOf ? { as_of: asOf } : undefined);
}

export function listPeriods(
  tenantSlug: string,
): Promise<{ periods: AccountingPeriod[]; total: number }> {
  return apiClient.get(`${BASE}/${tenantSlug}/ledger/periods`);
}

export function createPeriod(
  tenantSlug: string,
  body: CreatePeriodRequest,
): Promise<AccountingPeriod> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/periods`, body);
}

export function closePeriod(
  tenantSlug: string,
  periodID: string,
): Promise<{ status: string }> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/periods/${periodID}/close`);
}
