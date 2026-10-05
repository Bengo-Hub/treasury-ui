'use client';

import { cn } from '@/lib/utils';
import { AirtelMoneyLogo, MpesaLogo, MtnMomoLogo, PayHeroLogo } from '@bengo-hub/shared-ui-lib';
import { CreditCard, Landmark, Smartphone, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';
import { MpesaPaymentModal } from './MpesaPaymentModal';
import { PayHeroCheckoutModal } from './PayHeroCheckoutModal';
import { PaymentPaneContext } from './PaymentModal';
import { PAYHERO_RAIL_LABELS, PAYHERO_RAIL_ORDER, type PayHeroRail, type PaymentDetails } from './types';

const RAIL_ICON: Record<PayHeroRail, ReactNode> = {
  mpesa: <MpesaLogo className="h-5 w-9" />,
  payhero_offline: <MpesaLogo className="h-5 w-9" />,
  airtel_money: <AirtelMoneyLogo className="h-5 w-9" />,
  mtn_momo: <MtnMomoLogo className="h-5 w-5 rounded-sm" />,
  payhero_momo: <Smartphone className="h-5 w-5 text-emerald-600" />,
  payhero_card: <CreditCard className="h-5 w-5 text-blue-600" />,
  payhero_bank: <Landmark className="h-5 w-5 text-indigo-600" />,
};

/**
 * PayHero as its own gateway, laid out like Paystack's checkout: the rails PayHero takes for this
 * payment on the left (tabs across the top on small screens), the chosen rail's form on the right.
 * Every rail is paid with gateway=payhero, so it never falls back to the tenant's Daraja M-Pesa.
 * The forms are the same components the pay page uses on their own; inside this shell they render
 * as panes (PaymentPaneContext) and the shell owns the chrome and the close button.
 */
export function PayHeroPaymentModal({
  details,
  methods,
  onClose,
  embed = false,
}: {
  details: PaymentDetails;
  /** The rails treasury offers (payhero_methods), already narrowed by any caller allowlist. */
  methods: PayHeroRail[];
  onClose: () => void;
  embed?: boolean;
}) {
  const rails = PAYHERO_RAIL_ORDER.filter((r) => methods.includes(r));
  const [rail, setRail] = useState<PayHeroRail | undefined>(rails[0]);

  const amount = details.amount > 0
    ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: details.currency }).format(details.amount)
    : '';

  const pane = (() => {
    switch (rail) {
      case 'mpesa':
        return <MpesaPaymentModal details={details} embed={embed} provider="payhero" onClose={onClose} />;
      case 'airtel_money':
      case 'mtn_momo':
      case 'payhero_momo':
        return <MobileMoneyPaymentModal method={rail} details={details} embed={embed} onClose={onClose} />;
      case 'payhero_offline':
      case 'payhero_card':
      case 'payhero_bank':
        return <PayHeroCheckoutModal method={rail} details={details} embed={embed} onClose={onClose} />;
      default:
        return <p className="text-sm text-muted-foreground">PayHero has no payment method for this currency yet.</p>;
    }
  })();

  const shell = (
    <div
      className={cn(
        'bg-card rounded-xl border border-border w-full overflow-hidden flex flex-col sm:flex-row',
        embed ? '' : 'shadow-xl max-w-2xl',
      )}
      onClick={(e) => e.stopPropagation()}
      role={embed ? undefined : 'dialog'}
      aria-modal={embed ? undefined : true}
      aria-label="Pay with PayHero"
    >
      <nav
        aria-label="PayHero payment methods"
        className="bg-muted/40 border-b sm:border-b-0 sm:border-r border-border sm:w-52 shrink-0 p-3 sm:py-5"
      >
        <p className="hidden sm:block px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pay with</p>
        <div className="flex sm:flex-col gap-1 overflow-x-auto">
          {rails.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRail(r)}
              aria-current={rail === r ? 'true' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors min-h-11',
                rail === r ? 'bg-card text-foreground shadow-sm ring-1 ring-primary/30' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
              )}
            >
              <span className="flex w-9 shrink-0 items-center justify-center">{RAIL_ICON[r]}</span>
              {PAYHERO_RAIL_LABELS[r]}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 min-w-0 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4 mb-5">
          <PayHeroLogo className="h-8 w-14 shrink-0" />
          <div className="text-right text-sm min-w-0">
            {details.customer_email && <p className="truncate text-muted-foreground">{details.customer_email}</p>}
            {amount && <p>Pay <span className="font-semibold text-primary">{amount}</span></p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label={embed ? 'Back' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <PaymentPaneContext.Provider value>
          {/* key: switching rails starts that rail's form afresh. */}
          <div key={rail}>{pane}</div>
        </PaymentPaneContext.Provider>
        <p className="mt-5 text-center text-xs text-muted-foreground">Secured by PayHero</p>
      </div>
    </div>
  );

  if (embed) return shell;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      {shell}
    </div>
  );
}
