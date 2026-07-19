export function formatCurrency(amount: number, currency = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Compact currency — abbreviates large amounts to K / M / B / T so KPI tiles never truncate a long
 * figure (e.g. "KES 1,525,854.00" -> "KES 1.5M", 6_000_000_000 -> "KES 6B", 14_438 -> "KES 14.4K").
 * Amounts under 1,000 render in full. The single source of truth for compact money display; pair it
 * with the MoneyValue component, whose info tooltip reveals the exact formatCurrency value.
 */
export function formatCompactCurrency(amount: number, currency = 'KES'): string {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  if (abs < 1000) return formatCurrency(n, currency);
  const units: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [div, suffix] of units) {
    if (abs >= div) {
      const v = n / div;
      const s = (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)).replace(/\.0$/, '');
      return `${currency} ${s}${suffix}`;
    }
  }
  return formatCurrency(n, currency);
}
