/**
 * Currency defaults in one place. The tenant's own currency is the `default_currency` setting
 * (Settings > General), read through useTenantCurrency; these are only what applies before that
 * setting or the supported-currency list has loaded. Forms used to hardcode 'KES' and their own
 * copy of the fallback list.
 */

/** The platform's base currency, used until the tenant's setting is known. */
export const FALLBACK_CURRENCY = 'KES';

/** Shown when the supported-currency list cannot be loaded. */
export const FALLBACK_CURRENCY_CODES = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'] as const;

/** The tenant setting that names its own (books) currency. */
export const DEFAULT_CURRENCY_SETTING = 'default_currency';

/** Supported codes, or the fallback list when none loaded. */
export function currencyCodes(currencies: { code: string }[] | undefined): string[] {
  const codes = (currencies ?? []).map((c) => c.code).filter(Boolean);
  return codes.length ? codes : [...FALLBACK_CURRENCY_CODES];
}

/**
 * The amount credited in the books' currency for money received in another one. rate is
 * "1 base = rate foreign", the convention every exchange rate in treasury uses.
 */
export function baseEquivalent(foreignAmount: number, rate: number): number {
  if (!(foreignAmount > 0) || !(rate > 0)) return 0;
  return Math.round((foreignAmount / rate) * 100) / 100;
}
