// Shared chart palette + formatters reused across the dashboard and reports — single source of
// truth so analytics visuals stay consistent and we never duplicate colour/format logic.
import { formatCurrency } from '@/lib/utils/currency';

export const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export const SERIES = {
  revenue: '#10b981',
  expenses: '#ef4444',
  net: '#6366f1',
  outstanding: '#f59e0b',
  collections: '#10b981',
};

// Compact axis label, e.g. 25_048 -> "25.0K", 1_200_000 -> "1.2M".
export function compactNumber(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${v}`;
}

export function money(v: number | string | undefined, currency = 'KES'): string {
  return formatCurrency(Number(v ?? 0), currency);
}
