'use client';

import { CodPaymentModal } from '@/components/payments/CodPaymentModal';
import { CodLogo, MpesaLogo, PaystackLogo } from '@/components/payments/logos';
import { MpesaPaymentModal } from '@/components/payments/MpesaPaymentModal';
import { PaystackPaymentModal } from '@/components/payments/PaystackPaymentModal';
import type { GatewayType, PaymentDetails } from '@/components/payments/types';
import { GATEWAY_LABELS } from '@/components/payments/types';
import { Card } from '@/components/ui/base';
import { sendToParent } from '@/lib/embed-messages';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';

const DEFAULT_GATEWAYS: GatewayType[] = ['paystack', 'mpesa', 'cod'];

function parseGateways(param: string | null): GatewayType[] {
  if (!param) return DEFAULT_GATEWAYS;
  const list = param.split(',').map((g) => g.trim().toLowerCase());
  const allowed: GatewayType[] = [];
  if (list.includes('paystack')) allowed.push('paystack');
  if (list.includes('mpesa')) allowed.push('mpesa');
  if (list.includes('cod')) allowed.push('cod');
  return allowed.length > 0 ? allowed : DEFAULT_GATEWAYS;
}

function PayPageContent() {
  const searchParams = useSearchParams();
  const [openGateway, setOpenGateway] = useState<GatewayType | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const embed = searchParams.get('embed') === 'true';

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
      customer_email: searchParams.get('customer_email') || undefined,
      phone_number: searchParams.get('phone_number') || undefined,
      initiate_url,
      verify_url: searchParams.get('verify_url') || undefined,
    };
  }, [searchParams]);

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

  const gateways = useMemo(
    () => parseGateways(searchParams.get('gateways')),
    [searchParams],
  );

  const formatAmount = () =>
    details.amount > 0
      ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: details.currency }).format(details.amount)
      : '—';

  const hasValidAmount = details.amount > 0;
  const hasIntentId = !!details.intent_id;
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

  return (
    <div ref={contentRef} className={embed ? 'flex flex-col items-center p-4 bg-background' : 'min-h-screen flex flex-col items-center justify-center p-4 bg-background'}>
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Complete payment</h1>
          <p className="text-muted-foreground mt-1">Choose how you want to pay</p>
          {details.invoice_number && (
            <p className="text-sm text-muted-foreground mt-2">
              Invoice <span className="font-mono font-medium text-foreground">{details.invoice_number}</span>
            </p>
          )}
          <p className="text-2xl font-semibold text-primary mt-4">{formatAmount()}</p>
          {details.reference_id && !details.invoice_number && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">{details.reference_id}</p>
          )}
          {details.description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{details.description}</p>
          )}
        </div>

        <div className="grid gap-3">
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
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {embed ? 'Payment is processed securely.' : 'Payment is processed securely. You will be redirected after completion.'}
        </p>
      </div>

      {openGateway === 'paystack' && (
        <PaystackPaymentModal
          details={details}
          embed={embed}
          onClose={() => setOpenGateway(null)}
        />
      )}
      {openGateway === 'mpesa' && (
        <MpesaPaymentModal
          details={details}
          embed={embed}
          onClose={() => setOpenGateway(null)}
        />
      )}
      {openGateway === 'cod' && (
        <CodPaymentModal
          details={details}
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
