'use client';

import { useEffect } from 'react';
import { useCurrencyOptions, useLiveRate } from '@/hooks/use-currencies';
import { baseEquivalent } from '@/lib/currency/config';
import { formatCurrency } from '@/lib/utils/currency';

/** What the payer actually handed over. currency '' means the books' own currency (no conversion). */
export interface ReceivedCurrency {
  currency: string;
  amount: string;
  rate: string;
}

export const SAME_CURRENCY: ReceivedCurrency = { currency: '', amount: '', rate: '' };

/**
 * The foreign-currency part of a receipt, or null when the money came in the books' currency.
 * Throws a readable error for a half-filled conversion.
 */
export function receivedCurrencyPayload(
  value: ReceivedCurrency,
  baseCurrency: string,
): { foreignCurrency: string; foreignAmount: number; exchangeRate: number } | null {
  if (!value.currency || value.currency === baseCurrency) return null;
  const amount = parseFloat(value.amount);
  const rate = parseFloat(value.rate);
  if (!(amount > 0) || !(rate > 0)) {
    throw new Error(`Enter the ${value.currency} amount received and its rate, or choose ${baseCurrency}.`);
  }
  return { foreignCurrency: value.currency, foreignAmount: amount, exchangeRate: rate };
}

const inputCls = 'w-full mt-0.5 bg-gray-50 border-none rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-black';

/**
 * "Received in" for a customer receipt: preselects the books' currency (the tenant's
 * default_currency, or the ledger's currency) and, only when another currency is picked, asks for
 * the amount received and the rate, pre-filled from the live rate. The Amount on the form stays
 * what is credited in the books' currency; the real amount and rate are stored with the receipt.
 */
export function ReceivedCurrencyFields({
  tenant,
  baseCurrency,
  value,
  onChange,
}: {
  tenant: string;
  baseCurrency: string;
  value: ReceivedCurrency;
  onChange: (next: ReceivedCurrency) => void;
}) {
  const options = useCurrencyOptions();
  const selected = value.currency || baseCurrency;
  const foreign = selected !== baseCurrency ? selected : '';
  const { data: liveRate, isFetching } = useLiveRate(tenant, baseCurrency, foreign);

  // Offer the live rate once it arrives, unless the user already typed one.
  useEffect(() => {
    if (foreign && liveRate && !value.rate) onChange({ ...value, rate: String(liveRate) });
  }, [foreign, liveRate]); // eslint-disable-line react-hooks/exhaustive-deps

  const codes = options.some((o) => o.value === baseCurrency) ? options : [{ value: baseCurrency, label: baseCurrency }, ...options];
  const credited = baseEquivalent(parseFloat(value.amount), parseFloat(value.rate));

  return (
    <div className="rounded-lg border border-gray-200 p-2.5">
      <div className={foreign ? 'grid grid-cols-3 gap-2' : ''}>
        <div>
          <label className="text-[11px] font-semibold text-gray-500">Received in</label>
          <select
            value={selected}
            onChange={(e) => {
              const c = e.target.value;
              onChange(c === baseCurrency ? SAME_CURRENCY : { currency: c, amount: value.amount, rate: '' });
            }}
            className={inputCls}
          >
            {codes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value === baseCurrency ? `${o.value} (no conversion)` : o.value}
              </option>
            ))}
          </select>
        </div>
        {foreign && (
          <>
            <div>
              <label className="text-[11px] text-gray-500">Amount received ({foreign})</label>
              <input type="number" inputMode="decimal" min="0" value={value.amount}
                onChange={(e) => onChange({ ...value, amount: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] text-gray-500">Rate (1 {baseCurrency} = ? {foreign})</label>
              <input type="number" inputMode="decimal" min="0" step="0.0001" value={value.rate}
                placeholder={isFetching ? 'Fetching rate…' : ''}
                onChange={(e) => onChange({ ...value, rate: e.target.value })} className={inputCls} />
            </div>
          </>
        )}
      </div>
      {foreign && (
        <p className="text-[11px] text-gray-400 mt-1.5">
          {credited > 0
            ? `${formatCurrency(credited, baseCurrency)} at this rate. Enter that as the Amount above, and the real transaction ID in Reference.`
            : `The Amount above is what you credit in ${baseCurrency}. Put the real transaction ID in Reference.`}
          {!isFetching && !liveRate &&' No live rate is available for this pair; enter the rate you used.'}
        </p>
      )}
    </div>
  );
}
