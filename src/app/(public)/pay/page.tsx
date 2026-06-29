'use client';

import { CodPaymentModal } from '@/components/payments/CodPaymentModal';
import { CodLogo, MpesaLogo, PaystackLogo } from '@/components/payments/logos';
import { WalletLogo } from '@/components/payments/logos/WalletLogo';
import { MpesaPaymentModal } from '@/components/payments/MpesaPaymentModal';
import { PaystackPaymentModal } from '@/components/payments/PaystackPaymentModal';
import { WalletPaymentModal } from '@/components/payments/WalletPaymentModal';
import type { GatewayType, PaymentDetails } from '@/components/payments/types';
import { GATEWAY_LABELS } from '@/components/payments/types';
import { Card } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';

const TREASURY_API_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'https://booksapi.codevertexitsolutions.com';

const TREASURY_UI_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_UI_URL) ||
  'https://books.codevertexitsolutions.com';

function parseGateways(param: string | null): GatewayType[] {
  if (!param) return [];
  const list = param.split(',').map((g) => g.trim().toLowerCase());
  const allowed: GatewayType[] = [];
  if (list.includes('paystack')) allowed.push('paystack');
  if (list.includes('mpesa')) allowed.push('mpesa');
  if (list.includes('wallet')) allowed.push('wallet');
  if (list.includes('cod')) allowed.push('cod');
  return allowed;
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
function withRefType(url: string, refType: string): string {
  if (!refType) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}reference_type=${encodeURIComponent(refType)}`;
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
  const [gatewayError, setGatewayError] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const embed = searchParams.get('embed') === 'true';

  // Parse the optional gateways allowlist from URL param (set by TreasuryPaymentModal via allowedMethods prop).
  // Kept in a ref so the load effect can access it without having it as a dependency.
  const allowedGatewaysParam = useMemo(() => parseGateways(searchParams.get('gateways')), [searchParams]);
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
          r = await fetch(withRefType(gwUrl, refType), { signal: ctrl.signal });
        } finally {
          clearTimeout(to);
        }
        if (!r.ok) throw new Error(`gateways ${r.status}`);
        const data = await r.json();
        let list = parseGateways((data.gateways as string[])?.join(',') ?? '');
        // COD is not applicable for non-physical contexts (subscription, card
        // setup, hotspot/ISP packages, vouchers, top-ups, …) — there is nothing
        // to deliver. Filter it out client-side too as defense-in-depth in case
        // an older API still returns it.
        if (isNonPhysicalRefType(refType)) {
          list = list.filter((g) => g !== 'cod');
        }
        // Apply explicit allowlist from URL param (allowedMethods prop on TreasuryPaymentModal).
        // This is the authoritative filter — if the caller says "paystack,mpesa", show only those.
        const allowed = allowedGatewaysRef.current;
        if (allowed.length > 0) {
          list = list.filter((g) => allowed.includes(g));
        }
        if (!cancelled) {
          setGateways(list);
          setGatewayError(list.length === 0);
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
                    className="flex items-center gap-4 w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/10 hover:border-primary/30 transition-colors"
                  >
                    <PaystackLogo className="h-14 w-14 shrink-0 rounded-xl overflow-hidden" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{GATEWAY_LABELS.paystack}</p>
                      <p className="text-xs text-muted-foreground">Card, bank, mobile money via Paystack</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                )}
                {gateways.includes('mpesa') && (
                  <button
                    type="button"
                    onClick={() => setOpenGateway('mpesa')}
                    className="flex items-center gap-4 w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/10 hover:border-primary/30 transition-colors"
                  >
                    <MpesaLogo className="h-14 w-14 shrink-0 rounded-xl overflow-hidden" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{GATEWAY_LABELS.mpesa}</p>
                      <p className="text-xs text-muted-foreground">M-Pesa STK Push on your phone</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                )}
                {gateways.includes('wallet') && (
                  <button
                    type="button"
                    onClick={() => setOpenGateway('wallet')}
                    className="flex items-center gap-4 w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/10 hover:border-primary/30 transition-colors"
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
                    className="flex items-center gap-4 w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-accent/10 hover:border-primary/30 transition-colors"
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
