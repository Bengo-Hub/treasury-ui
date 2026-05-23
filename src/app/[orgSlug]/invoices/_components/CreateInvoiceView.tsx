'use client';

import type { CreateInvoiceRequest, LineRequest } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Columns,
  Percent,
  Plus,
  Scale,
  UserPlus,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface ExtendedLineRequest extends LineRequest {
  tax_rate: number;
}

const emptyLine = (): ExtendedLineRequest => ({
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
});

interface CreateInvoiceViewProps {
  onBack: () => void;
  onSave: (data: Partial<CreateInvoiceRequest>) => void;
  isPending: boolean;
}

export function CreateInvoiceView({ onBack, onSave, isPending }: CreateInvoiceViewProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('INV-0001');
  const [lines, setLines] = useState<ExtendedLineRequest[]>([emptyLine()]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [currency, setCurrency] = useState('KES');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Thanks for doing business with us');

  const [displayUnitAs, setDisplayUnitAs] = useState('Merge with quantity');
  const [showTaxSummary, setShowTaxSummary] = useState('Do not show');
  const [hideCountryOfSupply, setHideCountryOfSupply] = useState(false);
  const [addOriginalImages, setAddOriginalImages] = useState(false);
  const [showThumbnailsSep, setShowThumbnailsSep] = useState(false);
  const [showDescFullWidth, setShowDescFullWidth] = useState(false);
  const [hideSubtotalGroup, setHideSubtotalGroup] = useState(false);

  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    const computedLines = lines.map((line) => {
      const qty = Number(line.quantity || 0);
      const rate = Number(line.unit_price || 0);
      const tx = Number(line.tax_rate || 0);
      const net = qty * rate;
      const taxAmount = net * (tx / 100);
      subtotal += net;
      totalTax += taxAmount;
      return { ...line, amount: net, taxAmount, total: net + taxAmount };
    });
    return { lines: computedLines, subtotal, totalTax, grandTotal: subtotal + totalTax };
  }, [lines]);

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));
  const updateLine = (idx: number, field: keyof ExtendedLineRequest, value: unknown) =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));

  const handleSubmit = useCallback(() => {
    onSave({
      invoice_date: invoiceDate,
      due_date: dueDate,
      currency,
      notes,
      terms,
      lines: lines.filter((l) => l.description.trim()),
    });
  }, [onSave, invoiceDate, dueDate, currency, notes, terms, lines]);

  const inputCls =
    'w-full rounded-lg py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring border border-input text-foreground bg-background';

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Sticky navbar */}
      <div className="sticky top-0 z-50 border-b border-border px-6 py-4 flex items-center justify-between shadow-sm bg-card">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl transition-all text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight">Create New Invoice</h1>
            <p className="text-[11px] font-medium text-muted-foreground">Draft · Unsaved</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-xs font-bold rounded-lg transition-all bg-muted text-muted-foreground border border-border"
          >
            Save As Draft
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? 'Processing…' : 'Save & Continue'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-8">

          {/* Invoice header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-4 w-full max-w-sm">
              <div>
                <label className="text-xs font-bold block mb-1 text-foreground">
                  Invoice No<span className="text-destructive">*</span>
                </label>
                <input
                  className={cn(inputCls, 'font-bold')}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
                <p className="text-[11px] mt-1 font-medium text-muted-foreground">Last No: INV-0000 (—)</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">
                    Invoice Date<span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-foreground">
                    Due Date<span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center w-64 h-36 shrink-0 bg-accent/30">
              <div className="text-sm font-black tracking-tight text-foreground">Your Business Name</div>
              <div className="text-[10px] mt-3 flex items-center gap-3 font-semibold text-muted-foreground">
                <span className="hover:underline cursor-pointer">✕ Remove</span>
                <span className="text-border">|</span>
                <span className="hover:underline cursor-pointer text-foreground">✎ Change Logo</span>
              </div>
            </div>
          </div>

          {/* From / For */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl space-y-3 bg-accent/30 border border-border">
              <span className="text-xs font-bold border-b-2 border-foreground pb-0.5 block w-fit text-foreground">Invoice From</span>
              <select className="w-full rounded-lg py-2 px-3 text-xs font-semibold focus:outline-none border border-input bg-background text-foreground">
                <option>Your Business</option>
              </select>
              <div className="text-xs space-y-1 pt-1 leading-relaxed">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Business Name</span>
                  <span className="font-bold text-foreground">Your Business</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-foreground text-right">Your Address Here</span>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-xl flex flex-col justify-between space-y-3 bg-accent/30 border border-border">
              <span className="text-xs font-bold border-b-2 border-foreground pb-0.5 block w-fit text-foreground">Invoice For</span>
              <div className="space-y-3 my-auto py-2">
                <select className="w-full rounded-lg py-2 px-3 text-xs font-semibold focus:outline-none border border-input bg-background text-foreground">
                  <option>Select a Client</option>
                </select>
                <div className="text-center p-4 border border-dashed border-border rounded-lg bg-background">
                  <p className="text-xs font-medium mb-2.5 text-muted-foreground">Select Client from the list OR</p>
                  <button className="inline-flex items-center gap-1 px-4 py-2 text-primary-foreground text-xs font-bold rounded-lg bg-primary hover:bg-primary/90">
                    <UserPlus className="h-3.5 w-3.5" /> Add New Client
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Currency strip */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:bg-accent bg-muted text-muted-foreground">
              <Percent className="h-3 w-3" /> Configure TAX
            </button>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg py-1.5 px-3 text-xs font-bold focus:outline-none transition-all bg-muted text-foreground border-0"
            >
              <option value="KES">Kenyan Shilling (KES)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
            </select>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:bg-accent bg-muted text-muted-foreground">
              <Scale className="h-3 w-3" /> Number & Currency Format
            </button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:bg-accent bg-muted text-muted-foreground">
              <Columns className="h-3 w-3" /> Edit Columns/Formulas
            </button>
          </div>

          {/* Line items table */}
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center text-xs font-bold bg-primary text-primary-foreground">
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-center">TAX Rate</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-center">Rate</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1 text-right">TAX</div>
              <div className="col-span-1 text-right">Total</div>
            </div>
            <div className="p-4 space-y-4 divide-y divide-border bg-background">
              {calculations.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-start pt-3 first:pt-0">
                  <div className="col-span-5 space-y-2">
                    <span className="text-xs font-black text-foreground">{idx + 1}.</span>
                    <input
                      placeholder="Item Name / Description"
                      value={line.description}
                      onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      className="w-full rounded-lg py-2 px-3 text-xs font-semibold focus:outline-none border border-input text-foreground bg-background"
                    />
                  </div>
                  <div className="col-span-2 pt-6">
                    <div className="relative">
                      <input
                        type="number"
                        value={line.tax_rate || ''}
                        onChange={(e) => updateLine(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg py-2 pl-3 pr-6 text-xs text-center font-mono font-bold focus:outline-none border border-input text-foreground bg-background"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="col-span-1 pt-6">
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg py-2 px-1 text-xs text-center font-mono font-bold focus:outline-none border border-input text-foreground bg-background"
                    />
                  </div>
                  <div className="col-span-1 pt-6">
                    <input
                      type="number"
                      value={line.unit_price || ''}
                      onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg py-2 px-1 text-xs text-center font-mono font-bold focus:outline-none border border-input text-foreground bg-background"
                    />
                  </div>
                  <div className="col-span-1 pt-8 text-right font-mono font-semibold text-xs text-muted-foreground">
                    {line.amount.toFixed(2)}
                  </div>
                  <div className="col-span-1 pt-8 text-right font-mono font-semibold text-xs text-muted-foreground">
                    {line.taxAmount.toFixed(2)}
                  </div>
                  <div className="col-span-1 pt-8 text-right font-mono font-black text-xs flex items-center justify-end gap-1 text-foreground">
                    <span>{line.total.toFixed(2)}</span>
                    {calculations.lines.length > 1 && (
                      <button
                        onClick={() => removeLine(idx)}
                        className="p-1 rounded-md transition-all ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex items-center gap-2 bg-accent/30">
              <button
                onClick={addLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all bg-background border border-border text-foreground hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" /> Add New Line
              </button>
            </div>
          </div>

          {/* Terms + Totals */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-6">
              <div className="p-4 rounded-xl space-y-2 bg-accent/30 border border-border">
                <span className="text-xs font-bold underline block border-b border-border pb-1.5 text-foreground">
                  Terms and Conditions
                </span>
                <div className="text-xs font-semibold text-foreground">
                  <div className="flex items-center p-1 rounded">
                    <span>
                      <span className="font-mono mr-1.5 text-muted-foreground">01</span>
                      {terms}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-6">
              <div className="rounded-xl p-4 space-y-3 bg-accent/30 border border-border">
                <div className="space-y-1.5 text-xs font-semibold border-b border-border pb-3 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="font-mono font-bold text-foreground">
                      {currency} {calculations.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TAX</span>
                    <span className="font-mono font-bold text-foreground">
                      {currency} {calculations.totalTax.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-foreground">Total ({currency})</span>
                  <span className="font-mono font-black text-lg text-foreground">
                    {currency} {calculations.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold block mb-1 text-foreground">Notes</label>
            <textarea
              className="w-full rounded-lg py-2 px-3 text-xs focus:outline-none min-h-[60px] border border-input text-foreground bg-background"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes for the customer…"
            />
          </div>

          {/* Advanced options */}
          <div className="rounded-xl p-5 space-y-4 bg-accent/30 border border-border">
            <h3 className="text-sm font-bold tracking-tight text-foreground">Advanced Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold block text-muted-foreground">Display unit as</label>
                <select
                  value={displayUnitAs}
                  onChange={(e) => setDisplayUnitAs(e.target.value)}
                  className="w-full rounded-lg py-1.5 px-3 focus:outline-none border border-input bg-background text-foreground"
                >
                  <option>Merge with quantity</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold block text-muted-foreground">Show tax summary in invoice</label>
                <select
                  value={showTaxSummary}
                  onChange={(e) => setShowTaxSummary(e.target.value)}
                  className="w-full rounded-lg py-1.5 px-3 focus:outline-none border border-input bg-background text-foreground"
                >
                  <option>Do not show</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-semibold text-muted-foreground">
              {([
                [hideCountryOfSupply, setHideCountryOfSupply, 'Hide place/country of supply'],
                [addOriginalImages, setAddOriginalImages, 'Add original images in line items'],
                [showThumbnailsSep, setShowThumbnailsSep, 'Show thumbnails in separate column'],
                [showDescFullWidth, setShowDescFullWidth, 'Show description in full width'],
                [hideSubtotalGroup, setHideSubtotalGroup, 'Hide subtotal for group items'],
              ] as const).map(([val, setter, label]) => (
                <label key={label} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val as boolean}
                    onChange={(e) =>
                      (setter as React.Dispatch<React.SetStateAction<boolean>>)(e.target.checked)
                    }
                    className="rounded h-3.5 w-3.5 border-input"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-start gap-3 pt-4 border-t border-border">
            <button
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold text-primary-foreground rounded-lg transition-all bg-primary hover:bg-primary/90"
            >
              Save & Continue
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold rounded-lg border border-border transition-all text-foreground bg-background hover:bg-accent"
            >
              Save & Create New
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold rounded-lg border border-border transition-all text-muted-foreground bg-muted hover:bg-accent"
            >
              Save As Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
