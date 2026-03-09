'use client';

/**
 * M-Pesa (Safaricom) official-style logo – green brand.
 * Use for gateway selection on the unified pay page.
 */
export function MpesaLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="M-Pesa"
    >
      <rect width="120" height="120" rx="24" fill="#00A651" />
      <path
        d="M32 44h56c2.2 0 4 1.8 4 4v24c0 2.2-1.8 4-4 4H32c-2.2 0-4-1.8-4-4V48c0-2.2 1.8-4 4-4z"
        fill="white"
      />
      <text
        x="60"
        y="68"
        textAnchor="middle"
        fill="#00A651"
        fontSize="22"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        M-PESA
      </text>
    </svg>
  );
}
