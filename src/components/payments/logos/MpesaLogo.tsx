/**
 * Official M-Pesa (Safaricom) mark — served as a static asset (public/mpesa-logo.svg, sourced from
 * Wikimedia Commons: https://commons.wikimedia.org/wiki/File:M-PESA_LOGO-01.svg, public domain per
 * Commons — below the threshold of originality). Used for gateway selection on the unified pay page
 * and inside MpesaPaymentModal. The identical file is duplicated 1:1 into pos-ui's public/ folder
 * (see pos-ui/src/components/pos/mpesa-logo.tsx) so both apps render the same mark.
 */
export function MpesaLogo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static icon, no next/image needed
  return <img src="/mpesa-logo.svg" alt="M-Pesa" className={className} />;
}
