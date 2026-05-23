'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

export interface AdditionalCharge {
  _key: string;
  label: string;
  amount: number;
  tax_rate: number;
}

export interface TotalsSectionProps {
  subtotal: number;
  totalTax: number;
  totalDiscount: number;
  currency: string;
  /** Global discount applied to the invoice total (flat) */
  globalDiscount: number;
  onGlobalDiscountChange: (v: number) => void;
  globalDiscountMode: 'flat' | 'percent';
  onGlobalDiscountModeChange: (m: 'flat' | 'percent') => void;
  additionalCharges: AdditionalCharge[];
  onAdditionalChargesChange: (charges: AdditionalCharge[]) => void;
}

function newCharge(): AdditionalCharge {
  return { _key: Math.random().toString(36).slice(2), label: '', amount: 0, tax_rate: 0 };
}

export function TotalsSection({
  subtotal,
  totalTax,
  totalDiscount,
  currency,
  globalDiscount,
  onGlobalDiscountChange,
  globalDiscountMode,
  onGlobalDiscountModeChange,
  additionalCharges,
  onAdditionalChargesChange,
}: TotalsSectionProps) {
  const [showCharges, setShowCharges] = useState(false);

  const globalDiscountAmt =
    globalDiscountMode === 'percent' ? (subtotal * globalDiscount) / 100 : globalDiscount;

  const chargesSubtotal = additionalCharges.reduce((s, c) => s + c.amount, 0);
  const chargesTax = additionalCharges.reduce((s, c) => s + (c.amount * c.tax_rate) / 100, 0);

  const grandTotal = subtotal - globalDiscountAmt - totalDiscount + totalTax + chargesSubtotal + chargesTax;

  const fmt = (n: number) => n.toFixed(2);

  const inputCls = 'rounded-lg py-1.5 px-2 text-xs font-mono border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

  const addCharge = () => onAdditionalChargesChange([...additionalCharges, newCharge()]);
  const removeCharge = (key: string) => onAdditionalChargesChange(additionalCharges.filter(c => c._key !== key));
  const updateCharge = (key: string, patch: Partial<AdditionalCharge>) =>
    onAdditionalChargesChange(additionalCharges.map(c => c._key === key ? { ...c, ...patch } : c));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 space-y-3">

        {/* Summary rows */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-foreground">{currency} {fmt(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Line Discounts</span>
              <span className="font-mono font-bold">-{currency} {fmt(totalDiscount)}</span>
            </div>
          )}

          {/* Global discount */}
          <div className="flex items-center justify-between gap-3">
            <span className="shrink-0">Global Discount</span>
            <div className="flex items-center gap-1.5">
              <button type="button"
                onClick={() => onGlobalDiscountModeChange(globalDiscountMode === 'flat' ? 'percent' : 'flat')}
                className="px-2 py-1 text-[10px] font-bold rounded border border-border bg-muted text-muted-foreground hover:bg-accent transition-all">
                {globalDiscountMode === 'percent' ? '%' : currency}
              </button>
              <input type="number" min="0" step="0.01"
                value={globalDiscount || ''}
                onChange={e => onGlobalDiscountChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={inputCls + ' w-24 text-right'} />
              {globalDiscountAmt > 0 && (
                <span className="font-mono text-amber-600 font-bold">-{currency} {fmt(globalDiscountAmt)}</span>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <span>Tax</span>
            <span className="font-mono font-bold text-foreground">{currency} {fmt(totalTax)}</span>
          </div>

          {/* Additional charges toggle */}
          {chargesSubtotal > 0 && (
            <div className="flex justify-between">
              <span>Additional Charges</span>
              <span className="font-mono font-bold text-foreground">+{currency} {fmt(chargesSubtotal + chargesTax)}</span>
            </div>
          )}
        </div>

        {/* Grand total */}
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <span className="text-sm font-black text-foreground">Total ({currency})</span>
          <span className="font-mono font-black text-lg text-foreground">{currency} {fmt(grandTotal)}</span>
        </div>
      </div>

      {/* Additional charges section */}
      <div className="border-t border-border">
        <button type="button" onClick={() => setShowCharges(!showCharges)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-accent/50 transition-colors">
          <span className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Additional Charges / Shipping
          </span>
          {showCharges ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {showCharges && (
          <div className="px-5 pb-4 space-y-2">
            {additionalCharges.map(charge => (
              <div key={charge._key} className="grid grid-cols-12 gap-2 items-center">
                <input placeholder="Label (e.g. Shipping)" value={charge.label}
                  onChange={e => updateCharge(charge._key, { label: e.target.value })}
                  className={inputCls + ' col-span-5'} />
                <input type="number" min="0" step="0.01" placeholder="Amount" value={charge.amount || ''}
                  onChange={e => updateCharge(charge._key, { amount: parseFloat(e.target.value) || 0 })}
                  className={inputCls + ' col-span-3 text-right'} />
                <div className="col-span-3 flex items-center gap-1">
                  <input type="number" min="0" max="100" step="0.1" placeholder="Tax%" value={charge.tax_rate || ''}
                    onChange={e => updateCharge(charge._key, { tax_rate: parseFloat(e.target.value) || 0 })}
                    className={inputCls + ' w-full text-right'} />
                  <span className="text-[10px] text-muted-foreground">%</span>
                </div>
                <button type="button" onClick={() => removeCharge(charge._key)}
                  className="col-span-1 p-1 rounded text-muted-foreground hover:text-destructive transition-colors flex justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addCharge}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-dashed border-border text-muted-foreground hover:bg-accent transition-all">
              <Plus className="h-3.5 w-3.5" /> Add Charge
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
