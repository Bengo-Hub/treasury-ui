'use client';

import { CodPaymentModal } from '@/components/payments/CodPaymentModal';
import { CodLogo } from '@/components/payments/logos';
import { WalletLogo } from '@/components/payments/logos/WalletLogo';
import { MpesaPaymentModal } from '@/components/payments/MpesaPaymentModal';
import { PayHeroPaymentModal } from '@/components/payments/PayHeroPaymentModal';
import { PaystackPaymentModal } from '@/components/payments/PaystackPaymentModal';
import { WalletPaymentModal } from '@/components/payments/WalletPaymentModal';
import type { GatewayType, PayHeroRail, PaymentDetails } from '@/components/payments/types';
import { GATEWAY_LABELS, GATEWAY_ORDER, PAYHERO_RAIL_LABELS, PAYHERO_RAIL_ORDER, PAYHERO_UNAVAILABLE_MESSAGE, payingIntentId } from '@/components/payments/types';
import { Card } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { MpesaLogo, PayHeroLogo, PaystackLogo } from '@bengo-hub/shared-ui-lib';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';

const TREASURY_API_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'https://booksapi.codevertexafrica.com';

const TREASURY_UI_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_UI_URL) ||
  'https://books.codevertexafrica.com';

// Callers may name a rail by its generic method; these map onto a PayHero rail. bank_transfer and
// bank: bank deposits run on PayHero's bank rail (the manual bank-transfer gateway was removed).
const RAIL_ALIASES: Record<string, PayHeroRail> = { mobile_money: 'payhero_momo', bank_transfer: 'payhero_bank', bank: 'payhero_bank' };
const GATEWAY_ALIASES: Record<string, GatewayType> = { card: 'paystack' };

/**
 * A caller's method allowlist (?gateways=, TreasuryPaymentModal allowedMethods). It names gateways
 * ("payhero", "paystack", "mpesa") or, from links made before PayHero was its own gateway,
 * PayHero rails ("airtel_money", "payhero_offline", ...), which open PayHero on those rails.
 * "mpesa" there meant M-Pesa from whichever provider the tenant runs.
 */
interface Allowlist { gateways: Set<GatewayType>; rails: Set<PayHeroRail>; allRails: boolean; mpesa: boolean }

function parseAllowlist(param: string | null): Allowlist | null {
  if (!param) return null;
  const out: Allowlist = { gateways: new Set(), rails: new Set(), allRails: false, mpesa: false };
  for (const raw of param.split(',')) {
    const v = raw.trim().toLowerCase();
    if (!v) continue;
    const rail = RAIL_ALIASES[v] ?? v;
    if (v === 'payhero') out.allRails = true;
    else if (v === 'mpesa') out.mpesa = true;
    else if ((PAYHERO_RAIL_ORDER as string[]).includes(rail)) out.rails.add(rail as PayHeroRail);
    else out.gateways.add((GATEWAY_ALIASES[v] ?? v) as GatewayType);
  }
  return out;
}

/** The gateways and PayHero rails to show: the server's, narrowed by the caller's allowlist. */
function applyAllowlist(server: GatewayType[], railsFromServer: PayHeroRail[], allow: Allowlist | null): { gateways: GatewayType[]; rails: PayHeroRail[] } {
  if (!allow) return { gateways: server, rails: railsFromServer };
  const darajaMpesa = server.includes('mpesa');
  const rails = railsFromServer.filter((r) =>
    allow.allRails || allow.rails.has(r) || (r === 'mpesa' && allow.mpesa && !darajaMpesa));
  const gateways = server.filter((g) => {
    if (g === 'payhero') return rails.length > 0;
    if (g === 'mpesa') return allow.mpesa;
    return allow.gateways.has(g);
  });
  return { gateways, rails };
}

// Reference types that represent a NON-PHYSICAL / online-only purchase where
// Cash-on-Delivery makes no sense (there is nothing to deliver). cod is excluded
// for these both client-side here AND at the API (which is told the reference
// type via the `?reference_type=` query param below). hotspot/ISP captive
// purchases are the motivating case (Issue: cod offered + perpetual spinner).
const NON_PHYSICAL_REF_TYPES = new Set([
  'subscription',
  'card_setup',
  'renewal',
  'addon_purchase',
  'hotspot',
  'hotspot_package',
  'isp',
  'isp_package',
  'pppoe',
  'voucher',
  'data_bundle',
  'airtime',
  'wallet_topup',
  'payment',
  // library-service digital/fee payments (no physical fulfilment → no COD/shipping).
  'membership_fee',
  'library_fine',
  'ebook_sale',
]);

function isNonPhysicalRefType(refType: string): boolean {
  return NON_PHYSICAL_REF_TYPES.has(refType.trim().toLowerCase());
}

// Append the reference_type to a gateways URL so treasury-api can exclude cod at
// the source for non-physical contexts. Safe to call on any gateways URL.
// Add the sale's currency so treasury-api lists the PayHero rails of that currency's country.
function withCurrency(url: string, currency: string): string {
  if (!currency) return url;
  return `${url}${url.includes('?') ? '&' : '?'}currency=${encodeURIComponent(currency.toUpperCase())}`;
}

function withRefType(url: string, refType: string): string {
  if (!refType) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}reference_type=${encodeURIComponent(refType)}`;
}

// Name the intent being paid, so treasury-api offers only what can settle it: a personal
// (off-books) invoice is paid by M-Pesa into the owner's personal channel and nothing else, and
// PayHero is left out (payhero_unavailable) when it would refuse the prompt.
function withIntent(url: string, intentId: string | undefined): string {
  if (!intentId) return url;
  return `${url}${url.includes('?') ? '&' : '?'}intent_id=${encodeURIComponent(intentId)}`;
}

function gatewaysUrlFromInitiateUrl(initiateUrl: string): string | null {
  // initiate_url: https://treasury.example.com/api/v1/pay/{tenantUUID}/intents/{intentID}/initiate
  // gateways URL: https://treasury.example.com/api/v1/pay/{tenantUUID}/gateways
  const match = initiateUrl.match(/^(https?:\/\/.+\/api\/v1\/pay\/[0-9a-f-]+)/i);
  return match ? `${match[1]}/gateways` : null;
}

function gatewaysUrlFromTenantSlug(tenant: string): string {
  return `${TREASURY_API_URL}/api/v1/pay/${encodeURIComponent(tenant)}/gateways`;
}

function intentCreationUrl(tenant: string): string {
  return `${TREASURY_API_URL}/api/v1/pay/${encodeURIComponent(tenant)}/intents`;
}

function PayPageContent() {
  const searchParams = useSearchParams();
  const [openGateway, setOpenGateway] = useState<GatewayType | null>(null);
  const [gateways, setGateways] = useState<GatewayType[] | null>(null);
  // PayHero's rails for this payment (treasury's payhero_methods), shown as tabs in its modal.
  const [payheroRails, setPayheroRails] = useState<PayHeroRail[]>([]);
  const [gatewayError, setGatewayError] = useState(false);
  const [payheroUnavailable, setPayheroUnavailable] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const embed = searchParams.get('embed') === 'true';

  // Parse the optional gateways allowlist from URL param (set by TreasuryPaymentModal via allowedMethods prop).
  // Kept in a ref so the load effect can access it without having it as a dependency.
  const allowedGatewaysParam = useMemo(() => parseAllowlist(searchParams.get('gateways')), [searchParams]);
  const allowedGatewaysRef = useRef(allowedGatewaysParam);
  allowedGatewaysRef.current = allowedGatewaysParam;

  const details: PaymentDetails = useMemo(() => {
    const amount = Number(searchParams.get('amount')) || 0;
    const tenant = searchParams.get('tenant') || '';
    const reference_id = searchParams.get('reference_id') || '';
    const reference_type = searchParams.get('reference_type') || 'payment';
    const currency = searchParams.get('currency') || 'KES';
    const redirect_url = searchParams.get('redirect_url') || '/';
    const button_text = searchParams.get('button_text') || 'Continue';
    const initiate_url = searchParams.get('initiate_url') || undefined;
    const intent_id = searchParams.get('intent_id') || undefined;
    const invoice_number = searchParams.get('invoice_number') || reference_id || intent_id || undefined;
    return {
      intent_id,
      invoice_number,
      amount,
      currency,
      reference_id,
      reference_type,
      source_service: searchParams.get('source_service') || undefined,
      tenant,
      description: searchParams.get('description') || undefined,
      redirect_url,
      button_text,
      customer_email: searchParams.get('email') || searchParams.get('customer_email') || undefined,
      phone_number: searchParams.get('phone_number') || undefined,
      initiate_url,
      verify_url: searchParams.get('verify_url') || undefined,
    };
  }, [searchParams]);

  // Mutable ref for details so effects can access latest without re-running
  const detailsRef = useRef(details);
  detailsRef.current = details;

  // State for the resolved initiate_url (may be auto-created when missing from URL params)
  const [resolvedInitiateUrl, setResolvedInitiateUrl] = useState<string | undefined>(details.initiate_url);

  // Auto-resize: notify parent of content height changes in embed mode
  const sendResize = useCallback(() => {
    if (embed && contentRef.current) {
      sendToParent({ type: 'treasury:resize', height: contentRef.current.scrollHeight });
    }
  }, [embed]);

  useEffect(() => {
    if (!embed) return;
    sendResize();
    const observer = new ResizeObserver(sendResize);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [embed, sendResize]);

  // Load active gateways from treasury-api backend (never from URL params).
  // Resolution order:
  //   1. Derive gateways URL from initiate_url (contains tenant UUID — most specific)
  //   2. If intent_id + tenant present but no initiate_url, construct it directly (ordering-backend embeds)
  //   3. If amount+reference_id+tenant present, auto-create a pending intent via PublicCreateIntent
  //   4. Fallback: slug-based gateways endpoint (works without initiate_url)
  useEffect(() => {
    let cancelled = false;
    const d = detailsRef.current;

    async function load() {
      // Determine the gateways URL
      let gwUrl: string | null = null;
      let initiateUrlToUse = d.initiate_url;

      if (initiateUrlToUse) {
        gwUrl = gatewaysUrlFromInitiateUrl(initiateUrlToUse);
      }

      // If intent_id + tenant present but no initiate_url (e.g. ordering-backend returned intent_id
      // but treasury client failed to build the URL), construct it directly — slug is accepted by
      // PublicInitiateIntent which does a DB slug→UUID lookup server-side.
      if (!initiateUrlToUse && d.intent_id && d.tenant) {
        initiateUrlToUse = `${TREASURY_API_URL}/api/v1/pay/${encodeURIComponent(d.tenant)}/intents/${d.intent_id}/initiate`;
        if (!cancelled) setResolvedInitiateUrl(initiateUrlToUse);
        gwUrl = gatewaysUrlFromInitiateUrl(initiateUrlToUse);
      }

      // If no initiate_url but we have all params, auto-create a pending intent
      if (!initiateUrlToUse && d.tenant && d.amount > 0 && d.reference_id) {
        try {
          const res = await fetch(intentCreationUrl(d.tenant), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference_id: d.reference_id,
              reference_type: d.reference_type || 'payment',
              amount: d.amount,
              currency: d.currency,
              description: d.description || '',
              customer_email: d.customer_email || '',
              source_service: d.source_service || '',
              // Build return_url pointing to the centralized success page, passing through
              // the original redirect_url so the success page can offer a "back to service" button
              return_url: d.redirect_url && d.redirect_url !== '/'
                ? `${TREASURY_UI_URL}/pay/success?return_url=${encodeURIComponent(d.redirect_url)}`
                : undefined,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.initiate_url) {
              initiateUrlToUse = data.initiate_url as string;
              if (!cancelled) setResolvedInitiateUrl(initiateUrlToUse);
              gwUrl = gatewaysUrlFromInitiateUrl(initiateUrlToUse);
            }
          }
        } catch {
          // Fall through to slug-based gateway lookup
        }
      }

      // Fallback: slug-based gateways (works without initiate_url)
      if (!gwUrl && d.tenant) {
        gwUrl = gatewaysUrlFromTenantSlug(d.tenant);
      }

      if (!gwUrl) {
        if (!cancelled) {
          setGateways([]);
          setGatewayError(true);
        }
        return;
      }

      const refType = d.reference_type ?? '';
      try {
        // Forward the reference_type so treasury-api can exclude cod at the source
        // for non-physical purchases (hotspot/ISP/subscription/etc.).
        // Bound the request so a hung/unreachable endpoint can never leave the
        // page stuck on the "Loading payment options…" spinner forever — on
        // timeout we fall into the catch below and render a clear error state.
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 12000);
        let r: Response;
        try {
          const intentId = payingIntentId({ intent_id: d.intent_id, initiate_url: initiateUrlToUse });
          r = await fetch(withIntent(withCurrency(withRefType(gwUrl, refType), d.currency), intentId), { signal: ctrl.signal });
        } finally {
          clearTimeout(to);
        }
        if (!r.ok) throw new Error(`gateways ${r.status}`);
        const data = await r.json();
        const served = new Set(((data.gateways as string[]) ?? []).map((g) => g.toLowerCase()));
        let serverList = GATEWAY_ORDER.filter((g) => served.has(g));
        const servedRails = new Set((data.payhero_methods as string[] | undefined) ?? []);
        const serverRails = PAYHERO_RAIL_ORDER.filter((r) => servedRails.has(r));
        // COD is not applicable for non-physical contexts (subscription, card
        // setup, hotspot/ISP packages, vouchers, top-ups, …) — there is nothing
        // to deliver. Filter it out client-side too as defense-in-depth in case
        // an older API still returns it.
        if (isNonPhysicalRefType(refType)) {
          serverList = serverList.filter((g) => g !== 'cod');
        }
        // Apply explicit allowlist from URL param (allowedMethods prop on TreasuryPaymentModal).
        // This is the authoritative filter — if the caller says "paystack,mpesa", show only those.
        const { gateways: list, rails } = applyAllowlist(serverList, serverRails, allowedGatewaysRef.current);
        if (!cancelled) {
          setGateways(list);
          setPayheroRails(rails);
          setPayheroUnavailable((data.payhero_unavailable as string | undefined) || null);
          setGatewayError(list.length === 0);
          // Embedded (POS/ordering iframe) with exactly one gateway available — usually
          // because the caller's allowedMethods already narrowed it to one (e.g. the POS
          // "M-Pesa STK Push" tender) — skip the "choose how you want to pay" list and go
          // straight to that gateway's form. Picking the one item the list would show is a
          // redundant extra step for a flow that's already committed to a single method.
          if (embed && list.length === 1) {
            setOpenGateway(list[0]);
          }
        }
      } catch {
        if (!cancelled) {
          setGateways([]);
          setGatewayError(true);
        }
      }
    }

    void load();
    return () => { cancelled = true; };
    // Re-run only when core identity params change (not on every render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.initiate_url, details.intent_id, details.tenant, details.amount, details.reference_id]);

  // Merge resolved initiate_url back into details for payment modals
  const effectiveDetails: PaymentDetails = useMemo(
    () => resolvedInitiateUrl !== details.initiate_url
      ? { ...details, initiate_url: resolvedInitiateUrl }
      : details,
    [details, resolvedInitiateUrl],
  );

  const formatAmount = () =>
    effectiveDetails.amount > 0
      ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: effectiveDetails.currency }).format(effectiveDetails.amount)
      : '—';

  const hasValidAmount = effectiveDetails.amount > 0;
  const hasIntentId = !!effectiveDetails.intent_id;
  if (!hasValidAmount && !hasIntentId) {
    return (
      <div className={embed ? 'p-4 bg-background' : 'min-h-screen flex items-center justify-center p-4 bg-background'}>
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid payment link</h1>
          <p className="text-muted-foreground text-sm">
            This payment link is missing required parameters (amount or intent_id, tenant). Use the link from the service that sent you here.
          </p>
        </Card>
      </div>
    );
  }

  // In embed mode, hide the gateway selection UI while a gateway modal is active
  // so the inline payment form replaces the list instead of stacking below it.
  const showGatewayList = !embed || openGateway === null;

  return (
    <div ref={contentRef} className={embed ? 'flex flex-col items-center p-4 bg-background' : 'min-h-screen flex flex-col items-center justify-center p-4 bg-background'}>
      {showGatewayList && (
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Complete payment</h1>
            <p className="text-muted-foreground mt-1">Choose how you want to pay</p>
            {effectiveDetails.invoice_number && (
              <p className="text-sm text-muted-foreground mt-2">
                Invoice <span className="font-mono font-medium text-foreground">{effectiveDetails.invoice_number}</span>
              </p>
            )}
            <p className="text-2xl font-semibold text-primary mt-4">{formatAmount()}</p>
            {effectiveDetails.reference_id && !effectiveDetails.invoice_number && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">{effectiveDetails.reference_id}</p>
            )}
            {effectiveDetails.description && (
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{effectiveDetails.description}</p>
            )}
          </div>

          <div className="grid gap-3">
            {gateways === null ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : gatewayError && gateways.length === 0 && payheroUnavailable ? (
              <div role="alert" className="text-center py-6 text-sm text-muted-foreground">
                <p>{PAYHERO_UNAVAILABLE_MESSAGE}</p>
              </div>
            ) : gatewayError && gateways.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <p>No payment methods are configured for this tenant.</p>
                <p className="mt-1">Please contact support.</p>
              </div>
            ) : (
              <>
                {gateways.includes('paystack') && (
                  <button
                    type="button"
                    onClick={() => setOpenGateway('paystack')}
                    aria-label={GATEWAY_LABELS.paystack}
                    className="flex items-center gap-4 w-full min-h-16 rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/10 active:bg-accent/20 hover:border-primary/30 transition-colors"
                  >
                    {/* The logos carry the gateway names, so they stand in for the title. */}
                    <span className="w-24 shrink-0 flex items-center">
                      <PaystackLogo wordmark className="h-5 w-24" />
                    </span>
                    <p className="flex-1 min-w-0 text-xs text-muted-foreground">Card, bank and mobile money</p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                )}
                {gateways.includes('payhero') && (
                  <button
                    type="button"
                    onClick={() => setOpenGateway('payhero')}
                    aria-label={GATEWAY_LABELS.payhero}
                    className="flex items-center gap-4 w-full min-h-16 rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/10 active:bg-accent/20 hover:border-primary/30 transition-colors"
                  >
                    <span className="w-24 shrink-0 flex items-center">
                      <PayHeroLogo className="h-9 w-16" />
                    </span>
                    <p className="flex-1 min-w-0 text-xs text-muted-foreground">{payheroRails.map((r) => PAYHERO_RAIL_LABELS[r]).join(', ')}</p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                )}
                {gateways.includes('mpesa') && (
                  <button
                    type="button"
                    onClick={() => setOpenGateway('mpesa')}
                    aria-label={GATEWAY_LABELS.mpesa}
                    className="flex items-center gap-4 w-full min-h-16 rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/10 active:bg-accent/20 hover:border-primary/30 transition-colors"
                  >
                    <span className="w-24 shrink-0 flex items-center">
                      <MpesaLogo className="h-10 w-20" />
                    </span>
                    <p className="flex-1 min-w-0 text-xs text-muted-foreground">
                      {effectiveDetails.phone_number
                        ? `Prompt sent to ${effectiveDetails.phone_number}`
                        : 'Prompt sent to your phone'}
                    </p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                )}
                {gateways.includes('wallet') && (
                  <button
                    type="button"
                    onClick={() => setOpenGateway('wallet')}
                    className="flex items-center gap-4 w-full min-h-16 rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/10 active:bg-accent/20 hover:border-primary/30 transition-colors"
                  >
                    <WalletLogo className="h-14 w-14 shrink-0 rounded-xl overflow-hidden" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{GATEWAY_LABELS.wallet}</p>
                      <p className="text-xs text-muted-foreground">Deduct from your wallet balance instantly</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                )}
                {gateways.includes('cod') && (
                  <button
                    type="button"
                    onClick={() => setOpenGateway('cod')}
                    className="flex items-center gap-4 w-full min-h-16 rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/10 active:bg-accent/20 hover:border-primary/30 transition-colors"
                  >
                    <CodLogo className="h-14 w-14 shrink-0 rounded-xl overflow-hidden" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{GATEWAY_LABELS.cod}</p>
                      <p className="text-xs text-muted-foreground">Pay when you receive your order</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                )}
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {embed ? 'Payment is processed securely.' : 'Payment is processed securely. You will be redirected after completion.'}
          </p>
        </div>
      )}

      {openGateway === 'paystack' && (
        <PaystackPaymentModal
          details={effectiveDetails}
          embed={embed}
          onClose={() => setOpenGateway(null)}
        />
      )}
      {openGateway === 'mpesa' && (
        <MpesaPaymentModal
          details={effectiveDetails}
          embed={embed}
          provider="daraja"
          onClose={() => setOpenGateway(null)}
        />
      )}
      {openGateway === 'payhero' && (
        <PayHeroPaymentModal
          details={effectiveDetails}
          methods={payheroRails}
          embed={embed}
          onClose={() => setOpenGateway(null)}
        />
      )}
      {openGateway === 'cod' && (
        <CodPaymentModal
          details={effectiveDetails}
          embed={embed}
          onClose={() => setOpenGateway(null)}
        />
      )}
      {openGateway === 'wallet' && (
        <WalletPaymentModal
          details={effectiveDetails}
          embed={embed}
          onClose={() => setOpenGateway(null)}
        />
      )}
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center w-full max-w-md p-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Loading checkout...</h1>
        </div>
      </div>
    }>
      <PayPageContent />
    </Suspense>
  );
}
