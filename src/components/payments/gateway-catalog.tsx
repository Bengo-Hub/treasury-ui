import { cn } from '@/lib/utils';
import { MpesaLogo, PayHeroLogo, PaystackLogo } from '@bengo-hub/shared-ui-lib';
import { Banknote, CreditCard, Gift, Globe } from 'lucide-react';
import type { ComponentType } from 'react';

// Brand marks sized like the square lucide icons by height; the wide ones keep their ratio.
const MpesaIcon = ({ className }: { className?: string }) => <MpesaLogo className={cn(className, 'w-auto aspect-[512/273]')} />;
const PayHeroIcon = ({ className }: { className?: string }) => <PayHeroLogo className={cn(className, 'w-auto aspect-[16/9]')} />;
const PaystackIcon = ({ className }: { className?: string }) => <PaystackLogo className={className} />;

/**
 * One entry per gateway type the platform owner can configure. The single source for labels,
 * descriptions, credential keys, icons and setup hints, so the gateways tab, the activate dialog
 * and the fee rule options never drift apart.
 */
export interface GatewayKind {
  value: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  /** Keys the credentials form asks for (encrypted at rest). Empty = no credentials. */
  credentialKeys: string[];
  /** Where the URLs below are pasted, shown above the integration URLs. */
  setupHint?: string;
  /** Not a payment method (shown under Integrations, not Payment gateways). */
  integration?: boolean;
}

export const GATEWAY_KINDS: GatewayKind[] = [
  {
    value: 'paystack',
    label: 'Paystack',
    description: 'Cards and mobile money, transfers to tenants.',
    icon: PaystackIcon,
    credentialKeys: ['secret_key', 'public_key', 'webhook_secret'],
    setupHint: 'Paste the webhook URL in the Paystack dashboard (Settings, API keys and webhooks).',
  },
  {
    value: 'mpesa_paybill',
    label: 'M-Pesa Paybill',
    description: 'Daraja STK push, C2B and B2C on a paybill.',
    icon: MpesaIcon,
    // cert_pem: Daraja's public certificate, used to encrypt the initiator password for B2C, B2B,
    // balance, transaction status and reversal. Production rejects an unencrypted password.
    credentialKeys: ['consumer_key', 'consumer_secret', 'passkey', 'shortcode', 'initiator_name', 'initiator_password', 'cert_pem'],
    setupHint: 'Register C2B to send the validation and confirmation URLs to Safaricom.',
  },
  {
    value: 'mpesa_till',
    label: 'M-Pesa Till',
    description: 'Daraja STK push and C2B on a till number.',
    icon: MpesaIcon,
    credentialKeys: ['consumer_key', 'consumer_secret', 'passkey', 'shortcode', 'initiator_name', 'initiator_password', 'cert_pem'],
    setupHint: 'Register C2B to send the validation and confirmation URLs to Safaricom.',
  },
  {
    value: 'payhero',
    label: 'PayHero',
    description: 'M-Pesa into tenant channels, MTN, Airtel, card and bank deposits, escrow wallets.',
    icon: PayHeroIcon,
    // Base URLs are optional overrides of the PayHero 2.0.0 hosts.
    credentialKeys: ['api_username', 'api_password', 'api_base_url', 'auth_base_url', 'connect_base_url'],
    setupHint: 'Set the webhook URL as the callback on the PayHero dashboard. Every result is confirmed with a status lookup.',
  },
  {
    value: 'cod',
    label: 'Cash on Delivery',
    description: 'Paid on delivery and confirmed by staff.',
    icon: Banknote,
    credentialKeys: [],
  },
  {
    value: 'complimentary',
    label: 'Complimentary',
    description: 'No-charge sales recorded for the books.',
    icon: Gift,
    credentialKeys: [],
  },
  {
    value: 'forex_provider',
    label: 'Forex rates',
    description: 'exchangerate-api.com key; live rates are fetched every 6 hours.',
    icon: Globe,
    // Stored with the same encrypted credential storage as the payment gateways; never offered to
    // payers (gateways.PaymentMethodToGatewayType maps it to nothing).
    credentialKeys: ['api_key'],
    integration: true,
  },
];

const BY_VALUE = new Map(GATEWAY_KINDS.map((k) => [k.value, k]));

export function gatewayKind(type: string): GatewayKind {
  return BY_VALUE.get(type) ?? { value: type, label: type, description: '', icon: CreditCard, credentialKeys: [] };
}

/** Options for selects (fee rules, activation). */
export const PAYMENT_GATEWAY_OPTIONS = GATEWAY_KINDS.filter((k) => !k.integration).map((k) => ({ value: k.value, label: k.label }));

export function isMpesaType(type: string) {
  return type === 'mpesa_paybill' || type === 'mpesa_till';
}
