'use client';

/**
 * Paystack official-style logo (brand: green and white P).
 * Use for gateway selection on the unified pay page.
 */
export function PaystackLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Paystack"
    >
      <rect width="120" height="120" rx="24" fill="#00C3F7" />
      <path
        d="M42 36h24c8.8 0 16 7.2 16 16s-7.2 16-16 16H42V36zm4 8v24h20c4.4 0 8-3.6 8-8s-3.6-8-8-8H46z"
        fill="white"
      />
    </svg>
  );
}
