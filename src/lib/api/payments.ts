/**
 * Payments API (treasury-api).
 * Base path: /api/v1/{tenantIdOrSlug}/payments
 */

import { apiClient } from './client';

const BASE = '/api/v1';

/** Outcome of a payment reconciliation pass. */
export interface ReconcileSummary {
  checked: number; // intents verified against a gateway
  settled: number; // gateway reported paid -> marked succeeded + settled
  failed: number;  // gateway reported failed/cancelled/expired
  skipped: number; // too new / too old / not yet initiated at a gateway
  errors: number;  // gateway resolve/verify/settle errors (retried next pass)
}

/**
 * Manually reconcile all pending/processing payment intents for the tenant against their gateway,
 * settling or failing each. Treasury also runs this automatically every 5 minutes (cron); this is
 * the on-demand trigger for the UI.
 */
export function reconcilePendingPayments(tenantIdOrSlug: string) {
  return apiClient.post<ReconcileSummary>(`${BASE}/${tenantIdOrSlug}/payments/reconcile`, {});
}
