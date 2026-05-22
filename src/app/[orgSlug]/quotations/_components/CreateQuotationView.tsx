'use client';

import { Card } from '@/components/ui/base';
import { useCreateQuotation } from '@/hooks/use-invoices';
import type { CreateQuotationRequest, LineRequest } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Columns, Percent, Plus, Scale, UserPlus, X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface ExtendedLineRequest extends LineRequest {
  tax_rate: number;
}

const emptyLine = (): ExtendedLineRequest => ({ description: '', quantity: 1, unit_price: 1, tax_rate: 0 });

interface CreateQuotationViewProps {
  effectiveTenant: string;
  onClose: () => void;
  editId?: string;
}

export function CreateQuotationView({ effectiveTenant, onClose, editId }: CreateQuotationViewProps) {
  const createMutation = useCreateQuotation(effectiveTenant);

  const [quoteNumber, setQuoteNumber] = useState('A00023');
  const [newQuote, setNewQuote] = useState({
    customer_name: '', customer_email: '',
    quote_date:  new Date().toISOString().slice(0, 10),
    valid_until: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    currency: 'KES', notes: '', terms: 'Thanks for doing business with us', lines: [emptyLine()],
  });

  const [displayUnitAs,       setDisplayUnitAs]       = useState('Merge with quantity');
  const [showTaxSummary,      setShowTaxSummary]      = useState('Do not show');
  const [hideCountryOfSupply, setHideCountryOfSupply] = useState(false);
  const [addOriginalImages,   setAddOriginalImages]   = useState(false);
  const [showThumbnailsSep,   setShowThumbnailsSep]   = useState(false);
  const [showDescFullWidth,   setShowDescFullWidth]   = useState(false);
  const [hideSubtotalGroup,   setHideSubtotalGroup]   = useState(false);
  const [showSkuInQuote,      setShowSkuInQuote]      = useState(false);
  const [showSerialNumbers,   setShowSerialNumbers]   = useState(false);
  const [displayBatchDetails, setDisplayBatchDetails] = useState(false);

  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    const computedLines = newQuote.lines.map(line => {
      const net = Number(line.quantity || 0) * Number(line.unit_price || 0);
      const taxComponent = net * (Number(line.tax_rate || 0) / 100);
      subtotal += net;
      totalTax += taxComponent;
      return { ...line, amount: net, taxAmount: taxComponent, total: net + taxComponent };
    });
    return { lines: computedLines, subtotal, totalTax, grandTotal: subtotal + totalTax };
  }, [newQuote.lines]);

  const handleCreate = useCallback(() => {
    const body: CreateQuotationRequest = {
      customer_name:  newQuote.customer_name,
      customer_email: newQuote.customer_email,
      quote_date:     newQuote.quote_date,
      valid_until:    newQuote.valid_until,
      currency:       newQuote.currency,
      notes:          newQuote.notes,
      terms:          newQuote.terms,
      lines: newQuote.lines
        .filter(l => l.description.trim())
        .map(({ description, quantity, unit_price }) => ({ description, quantity, unit_price })),
    };
    createMutation.mutate(body, { onSuccess: onClose });
  }, [newQuote, createMutation, onClose]);

  const addLine    = () => setNewQuote(p => ({ ...p, lines: [...p.lines, emptyLine()] }));
  const removeLine = (idx: number) => setNewQuote(p => ({
    ...p, lines: p.lines.length > 1 ? p.lines.filter((_, i) => i !== idx) : p.lines,
  }));
  const updateLine = (idx: number, field: keyof ExtendedLineRequest, value: unknown) =>
    setNewQuote(p => ({ ...p, lines: p.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l) }));

  const advancedToggles: [boolean, (v: boolean) => void, string][] = [
    [hideCountryOfSupply, setHideCountryOfSupply, 'Hide place/country of supply'],
    [addOriginalImages,   setAddOriginalImages,   'Add original images in line items'],
    [showThumbnailsSep,   setShowThumbnailsSep,   'Show thumbnails in separate column'],
    [showDescFullWidth,   setShowDescFullWidth,   'Show description in full width'],
    [hideSubtotalGroup,   setHideSubtotalGroup,   'Hide subtotal for group items'],
    [showSkuInQuote,      setShowSkuInQuote,      'Show SKU in Quotation'],
    [showSerialNumbers,   setShowSerialNumbers,   'Show Serial Numbers in Quotation'],
    [displayBatchDetails, setDisplayBatchDetails, 'Display Batch Details in columns'],
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24 font-sans antialiased text-slate-800">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <h1 className="text-base font-black text-white tracking-tight">Create New Quotation</h1>
            <p className="text-[11px] text-slate-400 font-medium">Step 1 of 2 — Quotation Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCreate} disabled={createMutation.isPending}
            className="px-4 py-2 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-all shadow-sm">
            Save As Draft
          </button>
          <button onClick={handleCreate} disabled={createMutation.isPending || !newQuote.customer_name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-emphasis hover:bg-brand-dark rounded-lg transition-all shadow-md disabled:opacity-50">
            {createMutation.isPending ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-md p-6 space-y-8">

          {/* Quotation header — number + dates + logo placeholder */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-4 w-full max-w-sm">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Quotation No<span className="text-red-500">*</span></label>
                <input className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} />
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Last No: {quoteNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quotation Date<span className="text-red-500">*</span></label>
                  <input type="date" className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={newQuote.quote_date} onChange={e => setNewQuote(p => ({ ...p, quote_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valid Till Date<span className="text-red-500">*</span></label>
                  <input type="date" className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={newQuote.valid_until} onChange={e => setNewQuote(p => ({ ...p, valid_until: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-4 flex flex-col items-center justify-center text-center w-64 h-36 shrink-0 hover:bg-slate-50 shadow-sm cursor-pointer">
              <div className="text-sm font-black text-slate-800 tracking-tight">Company Logo</div>
              <div className="text-[10px] text-slate-400 mt-3 flex items-center gap-3 font-semibold">
                <span className="text-slate-500 hover:text-slate-800 hover:underline">✕ Remove</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 hover:text-slate-900 hover:underline">✎ Change</span>
              </div>
            </div>
          </div>

          {/* Quotation From / Quotation For */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-200/60 space-y-3">
              <span className="text-xs font-bold text-slate-900 border-b-2 border-slate-900 pb-0.5 block w-fit">Quotation From</span>
              <select className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none">
                <option>Codevertex IT Solutions</option>
              </select>
              <div className="text-xs space-y-1 text-slate-600 pt-1 leading-relaxed">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Business Name</span>
                  <span className="text-slate-900 font-bold">Codevertex IT Solutions</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Address</span>
                  <span className="text-slate-800 text-right">OGINGA STREET, PIONEER HSE, 2ND FLOOR, Kisumu, Kenya - 40100</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Email</span>
                  <span className="text-slate-800 font-mono">codevertexitsolutions@gmail.com</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-400">Phone</span>
                  <span className="text-slate-800 font-mono">+254 743 793901</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-200/60 flex flex-col justify-between space-y-3">
              <span className="text-xs font-bold text-slate-900 border-b-2 border-slate-900 pb-0.5 block w-fit">Quotation For</span>
              <div className="space-y-3 my-auto py-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Name</label>
                  <input placeholder="Select a Client" value={newQuote.customer_name}
                    onChange={e => setNewQuote(p => ({ ...p, customer_name: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Email</label>
                  <input type="email" placeholder="customer@email.com" value={newQuote.customer_email}
                    onChange={e => setNewQuote(p => ({ ...p, customer_email: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-sm" />
                </div>
                <div className="text-center pt-1">
                  <button className="inline-flex items-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-sm">
                    <UserPlus className="h-3.5 w-3.5" /> Add New Client
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tax / Currency toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-bold text-slate-700 transition-all flex items-center gap-1">
              <Percent className="h-3 w-3 text-slate-500" /> Configure TAX
            </button>
            <select value={newQuote.currency} onChange={e => setNewQuote(p => ({ ...p, currency: e.target.value }))}
              className="bg-slate-100 hover:bg-slate-200/80 border border-transparent rounded-lg py-1.5 px-3 text-xs font-bold text-slate-700 focus:outline-none transition-all">
              <option value="KES">Kenyan Shilling (KES, Ksh)</option>
              <option value="USD">US Dollar (USD, $)</option>
              <option value="EUR">Euro (EUR, €)</option>
            </select>
            <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-bold text-slate-700 transition-all flex items-center gap-1">
              <Scale className="h-3 w-3 text-slate-500" /> Number and Currency Format
            </button>
            <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-bold text-slate-700 transition-all flex items-center gap-1">
              <Columns className="h-3 w-3 text-slate-500" /> Edit Columns/Formulas
            </button>
          </div>

          {/* Line items table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-900 px-4 py-2.5 text-xs font-bold text-white grid grid-cols-12 gap-3 items-center">
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-center">TAX Rate</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-center">Rate</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1 text-right">TAX</div>
              <div className="col-span-1 text-right">Total</div>
            </div>
            <div className="p-4 space-y-4 divide-y divide-slate-100 bg-white">
              {calculations.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-start pt-3 first:pt-0">
                  <div className="col-span-5 space-y-2">
                    <span className="text-xs font-black text-slate-900 block">{idx + 1}.</span>
                    <input placeholder="Item Name / SKU Id" value={line.description}
                      onChange={e => updateLine(idx, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 font-semibold focus:outline-none focus:border-slate-400 shadow-sm" />
                  </div>
                  <div className="col-span-2 pt-6">
                    <div className="relative rounded-lg">
                      <input type="number" value={line.tax_rate || ''}
                        onChange={e => updateLine(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-6 text-xs text-center font-mono font-bold text-slate-800 focus:outline-none" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                  <div className="col-span-1 pt-6">
                    <input type="number" min="1" value={line.quantity}
                      onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 px-1 text-xs text-center font-mono font-bold text-slate-900 focus:outline-none" />
                  </div>
                  <div className="col-span-1 pt-6">
                    <input type="number" value={line.unit_price || ''}
                      onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 px-1 text-xs text-center font-mono font-bold text-slate-900 focus:outline-none" />
                  </div>
                  <div className="col-span-1 pt-8 text-right font-mono font-semibold text-xs text-slate-600">{line.amount.toFixed(2)}</div>
                  <div className="col-span-1 pt-8 text-right font-mono font-semibold text-xs text-slate-500">{line.taxAmount.toFixed(2)}</div>
                  <div className="col-span-1 pt-8 text-right font-mono font-black text-xs text-slate-900 flex items-center justify-end gap-1">
                    <span>{line.total.toFixed(2)}</span>
                    {calculations.lines.length > 1 && (
                      <button onClick={() => removeLine(idx)} className="p-1 text-slate-300 hover:text-red-600 rounded-md transition-all ml-1">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
              <button onClick={addLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-900 rounded-lg shadow-sm transition-all">
                <Plus className="h-3.5 w-3.5" /> Add New Line
              </button>
            </div>
          </div>

          {/* Summary + Terms */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-6 space-y-3">
              <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-900 underline block border-b border-slate-100 pb-1.5">Terms and Conditions</span>
                <textarea rows={3} value={newQuote.terms} onChange={e => setNewQuote(p => ({ ...p, terms: e.target.value }))}
                  className="w-full bg-transparent text-xs font-semibold text-slate-700 resize-none focus:outline-none" />
              </div>
            </div>
            <div className="md:col-span-6 space-y-4">
              <Card className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 space-y-3 shadow-inner">
                <div className="space-y-1.5 text-xs font-semibold text-slate-600 border-b border-slate-200/60 pb-3">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold text-slate-900">Ksh {calculations.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TAX</span>
                    <span className="font-mono font-bold text-slate-900">Ksh {calculations.totalTax.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-slate-900">Total ({newQuote.currency})</span>
                  <span className="font-mono font-black text-lg text-slate-900">Ksh {calculations.grandTotal.toFixed(2)}</span>
                </div>
              </Card>
            </div>
          </div>

          {/* Advanced options */}
          <Card className="border border-slate-200 bg-slate-50/20 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Advanced options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Display unit as</label>
                <select value={displayUnitAs} onChange={e => setDisplayUnitAs(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none transition-all">
                  <option>Merge with quantity</option>
                  <option>Show separately</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">Show tax summary in invoice</label>
                <select value={showTaxSummary} onChange={e => setShowTaxSummary(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none transition-all">
                  <option>Do not show</option>
                  <option>Show tax summary</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-semibold text-slate-600">
              {advancedToggles.map(([val, setter, label]) => (
                <label key={label} className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5 focus:ring-0" />
                  <span className="group-hover:text-slate-900 transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Action buttons */}
          <div className={cn('flex flex-wrap items-center justify-start gap-3 pt-4 border-t border-slate-100')}>
            <button onClick={handleCreate} disabled={createMutation.isPending || !newQuote.customer_name.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50">
              Save & Continue
            </button>
            <button onClick={handleCreate} disabled={createMutation.isPending || !newQuote.customer_name.trim()}
              className="px-5 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-900 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50">
              Save & Create New
            </button>
            <button onClick={handleCreate} disabled={createMutation.isPending}
              className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-all">
              Save As Draft
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
