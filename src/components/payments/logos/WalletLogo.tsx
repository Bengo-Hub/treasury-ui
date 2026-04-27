'use client';

export function WalletLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Wallet"
    >
      <rect width="120" height="120" rx="24" fill="#10B981" />
      <rect x="22" y="38" width="76" height="44" rx="6" fill="white" />
      <rect x="22" y="38" width="76" height="16" rx="6" fill="#D1FAE5" />
      <circle cx="82" cy="62" r="6" fill="#10B981" />
    </svg>
  );
}
