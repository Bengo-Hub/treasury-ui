'use client';

/**
 * Cash on Delivery – banknote/cash icon style.
 * Use for gateway selection on the unified pay page.
 */
export function CodLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cash on Delivery"
    >
      <rect width="120" height="120" rx="24" fill="#6366F1" />
      <rect x="32" y="44" width="56" height="32" rx="4" fill="white" />
      <circle cx="60" cy="60" r="8" fill="#6366F1" />
      <path d="M36 52h4v16h-4zM80 52h4v16h-4z" fill="#6366F1" />
    </svg>
  );
}
