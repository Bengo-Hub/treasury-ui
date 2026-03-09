/**
 * Payment context passed from the service that initiated the payment (ordering, subscription, cafe, etc.).
 * Service raises an invoice via treasury-api, gets intent_id + invoice details, then redirects here with these params.
 */
export interface PaymentDetails {
  /** Treasury payment intent ID (from create intent with payment_method "pending"). */
  intent_id?: string;
  /** Human-readable invoice number for display (e.g. INV-xxx or reference_id). */
  invoice_number?: string;
  amount: number;
  currency: string;
  reference_id: string;
  reference_type: string;
  source_service?: string;
  tenant: string;
  description?: string;
  /** Where to send the user after payment (e.g. /orders or full URL). */
  redirect_url?: string;
  /** Button label after payment (e.g. "View my order"). */
  button_text?: string;
  customer_email?: string;
  phone_number?: string;
  /**
   * URL to POST to initiate payment or confirm manual.
   * Body: { intent_id?, payment_method, customer_email?, phone_number? }.
   * Returns { authorization_url?, checkout_request_id?, redirect_url?, success? }.
   */
  initiate_url?: string;
  /** Base URL for verify endpoint (optional; for callback page). */
  verify_url?: string;
}

export type GatewayType = 'paystack' | 'mpesa' | 'cod';

export const GATEWAY_LABELS: Record<GatewayType, string> = {
  paystack: 'Paystack',
  mpesa: 'M-Pesa',
  cod: 'Cash on Delivery',
};
