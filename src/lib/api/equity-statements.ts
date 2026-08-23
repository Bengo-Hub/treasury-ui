/**
 * Equity-holder account statement API client (treasury-api).
 * Platform admin endpoints — requires platform-owner role, same auth gate as
 * every other `/platform/equity-holders/*` route.
 *
 * A statement is a per-holder accrual/payout ledger over an arbitrary date
 * range: opening/closing accrued-but-unpaid balances, one line per equity
 * payout or dividend declaration that fell in the range, and period totals.
 * Distinct from `getHolderPayouts` (lib/api/equity.ts), which returns only
 * completed/attempted payout records with no running balance or dividend lines.
 *
 * Covers:
 *  - GET /platform/equity-holders/{id}/statement?from=&to=          — the statement
 *  - GET /platform/equity-holders/{id}/statement/export?format=&from=&to= — PDF/CSV export
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single equity payout or dividend declaration line within the statement period. */
export interface EquityStatementLine {
    date: string;
    source_type: 'equity_payout' | 'dividend_declaration';
    reference: string;
    period_start: string;
    period_end: string;
    /** Decimal strings, 2dp — kept as strings (not parsed to number) to avoid float rounding. */
    gross: string;
    tax_withheld: string;
    net: string;
    /**
     * equity_payout: pending|processing|completed|failed|cancelled
     * dividend_declaration: draft|approved|paid|cancelled
     */
    status: string;
    /** True once this line has actually been disbursed. */
    settled: boolean;
    running_balance: string;
}

export interface EquityHolderStatement {
    holder_id: string;
    holder_name: string;
    holder_type: string;
    compensation_model: string;
    /** String, 4dp. */
    percentage_share: string;
    tax_residency: string;
    payout_tax_treatment: string;
    /** String, 2dp, e.g. "5.00". */
    withholding_pct: string;
    currency: string;
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
    /** Decimal strings — accrued-but-unpaid net as of `from`/`to`. */
    opening_balance: string;
    closing_balance: string;
    lines: EquityStatementLine[];
    total_gross_earned: string;
    total_tax_withheld: string;
    total_net_paid: string;
    total_net_accrued_unpaid: string;
    generated_at: string; // RFC3339
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** Get a holder's account statement for a date range (both bounds optional). */
export function getHolderStatement(
    holderId: string,
    params?: { from?: string; to?: string },
): Promise<EquityHolderStatement> {
    return apiClient.get<EquityHolderStatement>(
        `${BASE}/platform/equity-holders/${holderId}/statement`,
        params,
    );
}

/**
 * Export a holder's statement as PDF or CSV, streamed inline (matching every
 * other report export in this codebase — see `downloadRevenueReport` in
 * `lib/api/documents.ts`). Callers decide what to do with the blob: PDF goes
 * through the shared preview-first flow (`useDocumentPreview`/`PdfPreview`),
 * CSV triggers a direct browser download (too tabular to preview inline).
 */
export function exportHolderStatement(
    holderId: string,
    format: 'pdf' | 'csv' = 'pdf',
    from?: string,
    to?: string,
): Promise<{ blob: Blob; fileName: string }> {
    return apiClient.getBlob(
        `${BASE}/platform/equity-holders/${holderId}/statement/export`,
        `statement.${format}`,
        { format, from, to },
    );
}
