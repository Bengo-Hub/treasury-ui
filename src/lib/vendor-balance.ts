import { formatCurrency } from '@/lib/utils/currency';
import type { Vendor } from '@/lib/api/inventory';

/** "Owed KES 4,500" / "Credit KES 200" / "Owed KES 0", or undefined when treasury has no AP
 *  record for the vendor yet. */
export function vendorBalanceLabel(v: Pick<Vendor, 'balance_owed' | 'balance_currency'>): string | undefined {
  if (v.balance_owed == null) return undefined;
  const cur = v.balance_currency || 'KES';
  if (v.balance_owed < -0.0001) return `Credit ${formatCurrency(-v.balance_owed, cur)}`;
  return `Owed ${formatCurrency(Math.max(v.balance_owed, 0), cur)}`;
}

/** Picker hint for a vendor row: the amount owed first (so it survives truncation), then contact. */
export function vendorOptionHint(v: Vendor): string | undefined {
  return [vendorBalanceLabel(v), v.phone || v.email].filter(Boolean).join(' · ') || undefined;
}
