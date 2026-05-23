'use client';

import { useState } from 'react';
import { CheckCircle, ChevronRight, CreditCard, Loader2, Receipt, X } from 'lucide-react';
import { useRecordPayment, useInvoices } from '@/hooks/use-invoices';
import type { Invoice } from '@/lib/api/invoices';

type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'mpesa' | 'card' | 'other';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

interface Step1State {
  receipt_number: string;
  payment_date: string;
  reference: string;
}

interface Step2State {
  method: PaymentMethod;
  amount: string;
}

interface Props {
  tenant: string;
  /** Pre-selected invoice (from invoice detail or list action). If undefined, step 3 picks from unpaid invoices. */
  invoiceId?: string;
  invoiceTotal?: string;
  currency?: string;
  onClose: () => void;
}

export function RecordPaymentModal({ tenant, invoiceId, invoiceTotal, currency = 'KES', onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [s1, setS1] = useState<Step1State>({
    receipt_number: '',
    payment_date: new Date().toISOString().slice(0, 10),
    reference: '',
  });
  const [s2, setS2] = useState<Step2State>({
    method: 'bank_transfer',
    amount: invoiceTotal ?? '',
  });
  const [allocatedIds, setAllocatedIds] = useState<string[]>(invoiceId ? [invoiceId] : []);

  const recordPayment = useRecordPayment(tenant);

  // For step 3 — list unpaid invoices to allocate
  const { data: invoicesData } = useInvoices(
    tenant,
    { payment_status: 'unpaid', limit: 50 },
    step === 3 && !invoiceId,
  );
  const unpaidInvoices: Invoice[] = invoicesData?.invoices ?? [];

  const inputCls = 'w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const labelCls = 'text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1';

  const canProceed1 = s1.payment_date.trim().length > 0;
  const canProceed2 = parseFloat(s2.amount) > 0;
  const canFinish = allocatedIds.length > 0 || !!invoiceId;

  const handleFinish = () => {
    const targetIds = invoiceId ? [invoiceId] : allocatedIds;
    let pending = targetIds.length;
    if (pending === 0) return;
    targetIds.forEach(id => {
      recordPayment.mutate({ invoiceId: id, amount: s2.amount }, {
        onSuccess: () => {
          pending--;
          if (pending === 0) onClose();
        },
      });
    });
  };

  const toggleAllocation = (id: string) => {
    setAllocatedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-black text-foreground">Record Payment</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Step {step} of {invoiceId ? 2 : 3}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border bg-accent/10">
          {(['Receipt', 'Payment', ...(invoiceId ? [] : ['Allocate'])] as string[]).map((label, i) => {
            const s = (i + 1) as 1 | 2 | 3;
            const done = step > s;
            const active = step === s;
            return (
              <div key={label} className="flex items-center gap-1">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-colors ${active ? 'bg-primary text-primary-foreground' : done ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {done ? <CheckCircle className="h-3 w-3" /> : s === 1 ? <Receipt className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                  {label}
                </div>
                {i < (invoiceId ? 1 : 2) && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Step 1 — Receipt details */}
          {step === 1 && (
            <>
              <div>
                <label className={labelCls}>Payment Date <span className="text-destructive">*</span></label>
                <input type="date" className={inputCls} value={s1.payment_date}
                  onChange={e => setS1(p => ({ ...p, payment_date: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Receipt Number</label>
                <input className={inputCls} value={s1.receipt_number} placeholder="RCP-001"
                  onChange={e => setS1(p => ({ ...p, receipt_number: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Reference / Notes</label>
                <input className={inputCls} value={s1.reference} placeholder="e.g. Bank ref, cheque number…"
                  onChange={e => setS1(p => ({ ...p, reference: e.target.value }))} />
              </div>
            </>
          )}

          {/* Step 2 — Payment method + amount */}
          {step === 2 && (
            <>
              <div>
                <label className={labelCls}>Payment Method <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {PAYMENT_METHODS.map(pm => (
                    <button key={pm.value} type="button"
                      onClick={() => setS2(p => ({ ...p, method: pm.value }))}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${s2.method === pm.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background text-foreground hover:bg-accent'}`}>
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Amount ({currency}) <span className="text-destructive">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{currency}</span>
                  <input type="number" min="0.01" step="0.01" className={inputCls + ' pl-12'} value={s2.amount}
                    onChange={e => setS2(p => ({ ...p, amount: e.target.value }))} />
                </div>
              </div>
            </>
          )}

          {/* Step 3 — Allocate to invoices (only when no invoiceId pre-set) */}
          {step === 3 && !invoiceId && (
            <>
              <p className="text-xs text-muted-foreground">Select invoices to apply this payment to:</p>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {unpaidInvoices.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No unpaid invoices found.</p>
                )}
                {unpaidInvoices.map(inv => (
                  <label key={inv.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${allocatedIds.includes(inv.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}>
                    <input type="checkbox" checked={allocatedIds.includes(inv.id)} onChange={() => toggleAllocation(inv.id)} className="accent-primary h-3.5 w-3.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">{inv.invoice_number}</div>
                      <div className="text-[10px] text-muted-foreground">{inv.customer_name} · Due {inv.due_date?.slice(0, 10)}</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-foreground">{inv.currency} {Number(inv.total_amount).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-accent/10">
          <button type="button" onClick={() => step > 1 ? setStep(s => (s - 1) as 1 | 2 | 3) : onClose()}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-all">
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {(step < 2 || (step === 2 && !invoiceId)) ? (
            <button type="button"
              disabled={step === 1 ? !canProceed1 : !canProceed2}
              onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button type="button" disabled={!canFinish || recordPayment.isPending} onClick={handleFinish}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
              {recordPayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              {recordPayment.isPending ? 'Recording…' : 'Record Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
