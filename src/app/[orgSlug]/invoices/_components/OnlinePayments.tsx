'use client';

import { CreditCard, Link2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';

interface OnlinePaymentsProps {
  effectiveTenant: string;
}

const PAYMENT_METHODS = [
  { id: 'mpesa', name: 'M-Pesa', description: 'Accept payments via M-Pesa Paybill or Till number', icon: '📱', available: true },
  { id: 'paystack', name: 'Paystack', description: 'Accept card payments via Paystack', icon: '💳', available: true },
  { id: 'bank', name: 'Bank Transfer', description: 'Share your bank details directly on invoices', icon: '🏦', available: true },
];

export function OnlinePayments({ effectiveTenant }: OnlinePaymentsProps) {
  const { orgSlug } = useResolvedTenant();

  if (!effectiveTenant) return null;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <CreditCard className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Online Payments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Let customers pay invoices directly online with one click.
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {PAYMENT_METHODS.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{method.icon}</span>
              <div>
                <p className="text-xs font-bold text-foreground">{method.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{method.description}</p>
              </div>
            </div>
            {method.available ? (
              <a
                href={`/${orgSlug}/settings/gateways`}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0"
              >
                Configure <ArrowRight className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground">Coming soon</span>
            )}
          </div>
        ))}
      </div>

      {/* Payment link info */}
      <div className="rounded-xl border border-border bg-accent/20 px-5 py-4 flex items-start gap-3">
        <Link2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Payment Links on Invoices</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Once a payment gateway is configured, a "Pay Now" button is automatically added to all
            sent invoices. Customers can pay directly without logging in.
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-6 space-y-2">
        {[
          'Get paid up to 3× faster with one-click payment links',
          'Automatic payment status updates on invoice receipt',
          'Full payment history and reconciliation',
        ].map((benefit) => (
          <div key={benefit} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground">{benefit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
