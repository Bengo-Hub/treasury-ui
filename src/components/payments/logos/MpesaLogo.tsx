import { cn } from '@/lib/utils';

/**
 * Official M-Pesa (Safaricom) mark — served as a static asset (public/mpesa-logo.svg, sourced from
 * Wikimedia Commons: https://commons.wikimedia.org/wiki/File:M-PESA_LOGO-01.svg, public domain per
 * Commons — below the threshold of originality). Used for gateway selection on the unified pay page
 * and inside MpesaPaymentModal. The identical file is duplicated 1:1 into pos-ui's public/ folder
 * (see pos-ui/src/components/pos/mpesa-logo.tsx) so both apps render the same mark.
 *
 * The source artwork is WIDE (512×273, ~1.88:1) — a wordmark, not a square icon. `object-contain`
 * keeps it undistorted inside whatever box the caller sizes via `className`, but a SQUARE box
 * (h-6 w-6 etc.) still letterboxes it down to a sliver — size the box to roughly that same
 * ~1.88:1 ratio (e.g. `h-6 w-11`, not `h-6 w-6`) for the wordmark to actually be legible.
 */
export function MpesaLogo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static icon, no next/image needed
  return <img src="/mpesa-logo.svg" alt="M-Pesa" className={cn('object-contain', className)} />;
}
