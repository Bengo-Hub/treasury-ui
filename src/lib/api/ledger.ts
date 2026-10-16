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
  /** A voucher line's own payee when one voucher pays several people. */
  metadata?: { payee?: string; payee_id?: string; payee_type?: PayeeType } | null;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  entry_number: string;
  entry_date: string;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'posted' | 'reversed';
  created_by: string;
  /** Enriched by the API from the synced users projection — WHO recorded the entry.
   *  Empty for system-generated entries (nil created_by). */
  created_by_email?: string;
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
  reference_id?: string;
  /** Entry number or description, matched server-side across all entries. */
  search?: string;
  /** 1-based page and page size (server max 100). */
  page?: number;
  limit?: number;
  /** 'true' lists only voucher-book entries; search then also matches voucher number, payee and
   *  reference. */
  vouchers?: 'true';
  /** One voucher type (implies vouchers). */
  voucher_type?: VoucherType;
}

// ---- Vouchers ----

export type VoucherType = 'payment' | 'receipt' | 'contra' | 'journal' | 'sales' | 'purchase';

export type PayeeType = 'supplier' | 'customer' | 'staff';

export interface VoucherLineInput {
  account_id: string;
  /** Payment and receipt lines: the amount paid for or received for this account. */
  amount?: number;
  /** Journal, sales and purchase lines. */
  debit_amount?: number;
  credit_amount?: number;
  description?: string;
  cost_center_id?: string;
  project_id?: string;
  /** Payment and receipt lines: who this line was paid to or received from. */
  payee?: string;
  payee_id?: string;
  payee_type?: PayeeType;
}

export interface CreateVoucherRequest {
  voucher_type: VoucherType;
  voucher_date: string;
  reference?: string;
  description?: string;
  payee?: string;
  /** Set when the payee was picked from a list; a name typed for someone not in the system has none. */
  payee_id?: string;
  payee_type?: PayeeType;
  payment_method?: string;
  /** Real cash/bank/mobile money account (bank_accounts id): paid from, or received into. */
  cash_account_id?: string;
  /** Contra destination account and amount. */
  to_cash_account_id?: string;
  amount?: number;
  lines?: VoucherLineInput[];
  /** Submit straight away (approval rules apply). */
  submit?: boolean;
}

/** Workflow responses: pending_approval means the approvals queue now holds the decision. */
export interface WorkflowResult {
  status: string;
  approval_required?: boolean;
  request_id?: string;
  submit_error?: string;
}

export interface CreateVoucherResult extends WorkflowResult {
  entry: JournalEntry;
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
  /** Double-entry integrity: ΣDebit == ΣCredit. */
  is_balanced: boolean;
  /** Accounting equation: Assets == Liabilities + Equity + (Revenue − Expense). Independent guard. */
  equation_balanced?: boolean;
  /** Net income not yet closed to Retained Earnings (used to hint a pending year-end close). */
  current_year_earnings?: string | number;
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

/** A period with its booked-GL profit and loss (revenue, expenses incl. cost of sales, net). */
export interface PeriodSummary extends AccountingPeriod {
  fiscal_year: string;
  revenue: string | number;
  expenses: string | number;
  net_profit: string | number;
  entry_count: number;
  is_current: boolean;
  /** Ended but still open: the close reminder. */
  needs_closing: boolean;
}

export interface FiscalYearRef {
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface PeriodTotals {
  revenue: string | number;
  expenses: string | number;
  net_profit: string | number;
}

/** One fiscal year's periods with summaries, plus every fiscal year that has periods. */
export interface PeriodOverview {
  fiscal_year?: FiscalYearRef;
  fiscal_years: FiscalYearRef[];
  period_frequency: 'monthly' | 'quarterly';
  /** First month with books ("YYYY-MM"): pinned in settings or automatic. No period precedes it. */
  books_start?: string;
  periods: PeriodSummary[];
  totals: PeriodTotals;
  pending_close: number;
}

/** Ended-but-open periods, oldest first (the order they must be closed in). */
export interface PendingClosePeriods {
  count: number;
  periods: PeriodSummary[];
}

export interface CreatePeriodRequest {
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
}

export interface AccountLedgerLine {
  transaction_date: string;
  journal_entry_id?: string;
  entry_number?: string;
  description?: string;
  debit_amount: string | number;
  credit_amount: string | number;
  running_balance: string | number;
  currency: string;
  reference_type?: string;
  reference_id?: string;
}

export interface AccountLedgerResponse {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: string | number;
  closing_balance: string | number;
  lines: AccountLedgerLine[];
  total: number;
}

export interface AccountLedgerParams {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

// ---- API Functions ----

export function listJournalEntries(
  tenantSlug: string,
  params?: ListJournalEntriesParams,
): Promise<{ entries: JournalEntry[]; total: number; page?: number; limit?: number }> {
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

export function createVoucher(tenantSlug: string, body: CreateVoucherRequest): Promise<CreateVoucherResult> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/vouchers`, body);
}

export interface StaffPayee {
  id: string;
  email: string;
}

/** The business's own users, for the voucher payee picker. */
export function listStaffPayees(tenantSlug: string, search?: string): Promise<{ staff: StaffPayee[] }> {
  return apiClient.get(`${BASE}/${tenantSlug}/ledger/staff-payees`, { search: search || undefined, limit: 20 });
}

export function rejectJournalEntry(tenantSlug: string, entryID: string): Promise<{ status: string }> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/journal-entries/${entryID}/reject`);
}

export function submitJournalEntry(
  tenantSlug: string,
  entryID: string,
): Promise<WorkflowResult> {
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

export function getPeriodSummary(tenantSlug: string, fiscalYear?: string): Promise<PeriodOverview> {
  return apiClient.get(
    `${BASE}/${tenantSlug}/ledger/periods/summary`,
    fiscalYear ? { fiscal_year: fiscalYear } : undefined,
  );
}

export function getPendingClosePeriods(tenantSlug: string): Promise<PendingClosePeriods> {
  return apiClient.get(`${BASE}/${tenantSlug}/ledger/periods/pending-close`);
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

/** Closes every open, ended period up to and including periodID, oldest first. */
export function closePeriodsThrough(
  tenantSlug: string,
  periodID: string,
): Promise<{ status: string; closed: number }> {
  return apiClient.post(`${BASE}/${tenantSlug}/ledger/periods/${periodID}/close-through`);
}

/**
 * Per-account ledger (General Ledger drill-down): transactions for a single
 * account with a running balance. Backend: GET /{tenant}/ledger/accounts/{id}/ledger
 */
export function getAccountLedger(
  tenantSlug: string,
  accountID: string,
  params?: AccountLedgerParams,
): Promise<AccountLedgerResponse> {
  return apiClient.get(`${BASE}/${tenantSlug}/ledger/accounts/${accountID}/ledger`, params);
}
