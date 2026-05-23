'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSupportedCurrencies, useExchangeRates, useSetExchangeRate } from '@/hooks/use-currencies';

interface CurrencySectionProps {
  tenant: string;
  currency: string;
  onCurrencyChange: (code: string) => void;
  transactionCurrency?: string;
  onTransactionCurrencyChange?: (code: string) => void;
}

export function CurrencySection({
  tenant,
  currency,
  onCurrencyChange,
  transactionCurrency,
  onTransactionCurrencyChange,
}: CurrencySectionProps) {
  const { data: supported } = useSupportedCurrencies();
  const { data: ratesData } = useExchangeRates(tenant);
  const setRate = useSetExchangeRate(tenant);

  const [customRate, setCustomRate] = useState('');
  const [editing, setEditing] = useState(false);

  const currencies = supported?.currencies ?? [];
  const txCurrency = transactionCurrency ?? currency;

  const existingRate = ratesData?.rates.find(
    r => r.base_currency === currency && r.quote_currency === txCurrency,
  );

  useEffect(() => {
    if (existingRate) setCustomRate(existingRate.rate);
  }, [existingRate]);

  const handleSaveRate = () => {
    if (!customRate || currency === txCurrency) return;
    setRate.mutate({
      base_currency: currency,
      quote_currency: txCurrency,
      rate: customRate,
      effective_date: new Date().toISOString().slice(0, 10),
    }, { onSuccess: () => setEditing(false) });
  };

  const selectCls = 'rounded-lg py-2 px-3 text-xs font-bold border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl border border-border bg-card">
      {/* Base currency */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Currency
        </label>
        <select value={currency} onChange={e => onCurrencyChange(e.target.value)} className={selectCls}>
          {currencies.length > 0 ? (
            currencies.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
            ))
          ) : (
            <>
              <option value="KES">KES — Kenyan Shilling</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="UGX">UGX — Ugandan Shilling</option>
              <option value="TZS">TZS — Tanzanian Shilling</option>
            </>
          )}
        </select>
      </div>

      {/* Transaction currency (optional) */}
      {onTransactionCurrencyChange && (
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Transaction Currency
          </label>
          <select value={txCurrency} onChange={e => onTransactionCurrencyChange(e.target.value)} className={selectCls}>
            {currencies.length > 0 ? (
              currencies.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
              ))
            ) : (
              <>
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="UGX">UGX</option>
                <option value="TZS">TZS</option>
              </>
            )}
          </select>
        </div>
      )}

      {/* Exchange rate */}
      {txCurrency && txCurrency !== currency && (
        <div className="flex items-end gap-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Rate (1 {currency} = ? {txCurrency})
            </label>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" step="0.0001" value={customRate}
                  onChange={e => setCustomRate(e.target.value)}
                  className="rounded-lg py-2 px-3 text-xs font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-28" />
                <button type="button" onClick={handleSaveRate} disabled={setRate.isPending}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
                  Save
                </button>
                <button type="button" onClick={() => setEditing(false)}
                  className="px-3 py-2 text-xs font-bold rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-all">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-foreground">
                  {existingRate ? existingRate.rate : '—'}
                </span>
                <button type="button" onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-all">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
