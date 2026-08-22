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

export interface PaymentIntentSummary {
  id: string;
  amount: string | number;
  currency?: string;
  status: string;
  reference_id?: string;
  reference_type?: string;
  description?: string;
  created_at?: string;
}

/** List payment intents for a tenant, optionally filtered by status. */
export function listPaymentIntents(
  tenantIdOrSlug: string,
  status?: string,
): Promise<{ intents: PaymentIntentSummary[] }> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiClient.get<{ intents: PaymentIntentSummary[] }>(
    `${BASE}/${tenantIdOrSlug}/payments/intents${qs}`,
  );
}

/** Fetch a single payment intent — used to poll status after triggering a status check. */
export function getPaymentIntent(tenantIdOrSlug: string, intentId: string): Promise<PaymentIntentSummary> {
  return apiClient.get<PaymentIntentSummary>(`${BASE}/${tenantIdOrSlug}/payments/intents/${intentId}`);
}

/**
 * Submit a real Daraja Transaction Status Query for transactionId (a code the caller typed, or the
 * intent's own stored receipt if omitted). Async — the result lands via webhook; poll getPaymentIntent
 * for the status to actually change.
 */
export function checkIntentStatus(tenantIdOrSlug: string, intentId: string, transactionId?: string) {
  return apiClient.post<{ success: boolean; error?: string; transaction_id?: string; message?: string }>(
    `${BASE}/${tenantIdOrSlug}/payments/intents/${intentId}/check-status`,
    transactionId ? { transaction_id: transactionId } : {},
  );
}

/**
 * Manual override — marks the intent paid WITHOUT verifying against M-Pesa. Only call this after a
 * real check-status attempt has failed to confirm the payment; reference (the M-Pesa code) is
 * recorded for audit but not verified.
 */
export function confirmManualPayment(tenantIdOrSlug: string, intentId: string, reference?: string) {
  return apiClient.post<{ message: string }>(
    `${BASE}/${tenantIdOrSlug}/payments/intents/${intentId}/confirm-manual`,
    reference ? { reference } : {},
  );
}

export interface InitiateIntentResponse {
  intent_id: string;
  status: string;
  payment_method: string;
  checkout_request_id?: string;
}

/**
 * (Re)send an M-Pesa STK push for an existing intent — used by the Transactions page's "mark paid"
 * modal to give a stuck (pending/processing) payment a fresh prompt instead of only offering an
 * unverified manual override. Safe to call again on a "processing" intent (treasury-api allows this
 * specific resend case for mpesa only — no charge happens until the customer enters their PIN).
 */
export function initiateIntent(tenantIdOrSlug: string, intentId: string, phoneNumber: string) {
  return apiClient.post<InitiateIntentResponse>(
    `${BASE}/${tenantIdOrSlug}/payments/intents/${intentId}/initiate`,
    { payment_method: 'mpesa', phone_number: phoneNumber },
  );
}
