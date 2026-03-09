'use client';

/**
 * Renders a QR code for a payment URL (e.g. Paystack authorization_url).
 * Uses a public QR API to avoid adding a dependency; can be swapped for a local lib later.
 */
export function PaymentQRCode({ value, size = 200 }: { value: string; size?: number }) {
  if (!value) return null;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={url}
        alt="Scan to pay"
        width={size}
        height={size}
        className="rounded-lg border border-border bg-white p-2"
      />
      <p className="text-xs text-muted-foreground">Scan to pay on another device</p>
    </div>
  );
}
