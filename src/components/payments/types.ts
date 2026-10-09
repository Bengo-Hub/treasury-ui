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

/**
 * The intent a payment is for: details.intent_id, else the id in its initiate_url
 * (.../pay/{tenant}/intents/{id}/initiate). Treasury uses it to apply the intent's routing.
 */
export function payingIntentId(details: Pick<PaymentDetails, 'intent_id' | 'initiate_url'>): string | undefined {
  if (details.intent_id) return details.intent_id;
  const m = details.initiate_url?.match(/\/intents\/([0-9a-f-]{36})\/initiate/i);
  return m?.[1];
}

/**
 * Why treasury left PayHero out for this payment (gateway list `payhero_unavailable`, fee quote
 * `reason`): the business's PayHero service wallet cannot pay the channel fee.
 */
export const PAYHERO_UNAVAILABLE_MESSAGE =
  "M-Pesa payments to this business are paused for a moment. The business has been told; please try again later or pay another way.";

/**
 * A pay-page gateway. PayHero is one gateway, like Paystack: its rails (PayHeroRail) are tabs in
 * the PayHero modal. mpesa is the tenant's own Daraja paybill or till.
 */
export type GatewayType = 'paystack' | 'payhero' | 'mpesa' | 'cod' | 'wallet';

/** Every pay-page gateway, in display order (matches treasury-api PayPageMethodOrder). */
export const GATEWAY_ORDER: GatewayType[] = ['paystack', 'payhero', 'mpesa', 'wallet', 'cod'];

export const GATEWAY_LABELS: Record<GatewayType, string> = {
  paystack: 'Paystack',
  payhero: 'PayHero',
  mpesa: 'M-Pesa',
  cod: 'Cash on Delivery',
  wallet: 'Pay with Wallet',
};

/**
 * PayHero's rails (treasury's payhero_methods, from the tenant's PayHero discovery for the
 * payment's currency), in display order (matches treasury-api PayHeroMethodOrder).
 */
export type PayHeroRail =
  | 'mpesa' | 'payhero_offline' | 'airtel_money' | 'mtn_momo' | 'payhero_momo' | 'payhero_card' | 'payhero_bank';

export const PAYHERO_RAIL_ORDER: PayHeroRail[] = [
  'mpesa', 'payhero_offline', 'airtel_money', 'mtn_momo', 'payhero_momo', 'payhero_card', 'payhero_bank',
];

export const PAYHERO_RAIL_LABELS: Record<PayHeroRail, string> = {
  mpesa: 'M-PESA',
  payhero_offline: 'M-PESA Paybill',
  airtel_money: 'Airtel Money',
  mtn_momo: 'MTN MoMo',
  payhero_momo: 'Mobile Money',
  payhero_card: 'Card',
  payhero_bank: 'Bank',
};
