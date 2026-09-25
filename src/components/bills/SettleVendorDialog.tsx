'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useSettleVendorBills, useVendorSettlementPreview } from '@/hooks/use-bills';
import type { Bill, SettleVendorBillsRequest, VendorSettlementLine } from '@/lib/api/bills';
import { formatCurrency } from '@/lib/utils/currency';
import { AlertTriangle, CheckCircle2, CircleDashed, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BillPaymentFields } from './BillPaymentFields';
import { useBillPaymentForm } from './use-bill-payment-form';

const inputClass =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all';
const num = (v?: string | number | null) => Number(v ?? 0) || 0;
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '—');
const newSettlementId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

interface SettleVendorDialogProps {
  tenant: string;
  orgSlug: string;
  vendor: { id?: string; name: string } | null;
  /** The supplier's open bills, oldest due first. */
  bills: Bill[];
  onClose: () => void;
}

/**
 * Pay a supplier ONE amount (everything it is owed, or part of it) instead of bill by bill.
 * Treasury applies the supplier's unapplied credit notes (purchase returns) first, then spreads
 * the cash across the selected bills oldest due first: bills it fully covers become paid, the one
 * it partly covers is left with the remainder owed, the rest are untouched. The allocation shown
 * here is the server's own dry run, so what you see is exactly what gets recorded (one journal
 * for the whole amount, one payment row per bill, all voidable individually from View Payments).
 */
export function SettleVendorDialog({ tenant, orgSlug, vendor, bills, onClose }: SettleVendorDialogProps) {
  const settle = useSettleVendorBills(tenant);
  // The parent remounts this dialog per supplier (key), so every open starts fresh: all bills
  // selected, a new settlement id (kept across retries of THIS settlement, e.g. after approval).
  const [settlementId] = useState(newSettlementId);
  const [selected, setSelected] = useState<string[]>(() => bills.map((b) => b.id));
  const [applyCredits, setApplyCredits] = useState(true);
  // null until the user types: the amount then defaults to everything the selection still owes.
  const [typedAmount, setTypedAmount] = useState<string | null>(null);
  const [debouncedAmount, setDebouncedAmount] = useState(0);
  const [error, setError] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const currency = bills[0]?.currency || 'KES';
  const [ceilingAmount, setCeilingAmount] = useState('');
  const amount = typedAmount ?? ceilingAmount;
  const form = useBillPaymentForm(tenant, num(amount));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(num(amount)), 300);
    return () => clearTimeout(t);
  }, [amount]);

  const allSelected = selected.length === bills.length;
  const baseReq = useMemo<SettleVendorBillsRequest | null>(() => {
    if (!vendor || selected.length === 0) return null;
    return {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      amount: debouncedAmount,
      bill_ids: allSelected ? undefined : selected,
      apply_credits: applyCredits,
    };
  }, [vendor, selected, allSelected, applyCredits, debouncedAmount]);

  // The preview also tells us the most cash the selection can take; ask for it at amount 0 so a
  // too-large typed amount never hides the ceiling.
  const ceilingReq = useMemo(() => (baseReq ? { ...baseReq, amount: 0 } : null), [baseReq]);
  const { data: ceiling } = useVendorSettlementPreview(tenant, ceilingReq);
  const maxCash = num(ceiling?.max_cash);
  const ceilingKey = ceiling ? String(maxCash) : '';
  if (ceilingKey !== ceilingAmount) setCeilingAmount(ceilingKey);
  const overMax = debouncedAmount > maxCash + 0.0001;
  const { data: preview, isFetching: previewing, error: previewError } = useVendorSettlementPreview(
    tenant,
    baseReq && !overMax ? baseReq : null,
  );

  const toggleBill = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const close = () => {
    if (settle.isPending) return;
    onClose();
  };

  const submit = () => {
    if (!vendor) return;
    setError('');
    setApprovalRequired(false);
    const amt = num(amount);
    if (selected.length === 0) return setError('Select at least one bill.');
    if (amt < 0) return setError('Enter a valid amount.');
    if (amt > maxCash + 0.0001) {
      return setError(`The selected bills only owe ${formatCurrency(maxCash, currency)} after credits.`);
    }
    if (amt <= 0 && num(preview?.credit_applied) <= 0) return setError('Enter an amount to pay.');
    let channel = {};
    if (amt > 0) {
      const built = form.build();
      if (!built.channel) return setError(built.error ?? 'Complete the payment details.');
      channel = built.channel;
    }
    settle.mutate(
      { ...channel, vendor_id: vendor.id, vendor_name: vendor.name, settlement_id: settlementId, amount: amt,
        bill_ids: allSelected ? undefined : selected, apply_credits: applyCredits },
      {
        onSuccess: () => onClose(),
        onError: (e: any) => {
          if (e?.response?.data?.error === 'approval_required') setApprovalRequired(true);
          else setError(e?.response?.data?.error || 'Failed to record the settlement.');
        },
      },
    );
  };

  const lineByBill = useMemo(() => {
    const m = new Map<string, VendorSettlementLine>();
    (preview?.lines ?? []).forEach((l: VendorSettlementLine) => m.set(l.bill_id, l));
    return m;
  }, [preview]);
  const creditAvailable = num(ceiling?.credit_available);
  const previewErr = (previewError as any)?.response?.data?.error as string | undefined;

  return (
    <Dialog open={!!vendor} onOpenChange={(o) => !o && close()}>
      {vendor && (
        <DialogContent
          title={`Settle ${vendor.name}`}
          description="Pay one amount across this supplier's open bills, oldest due first."
          onClose={close}
          className="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Open bills', value: num(ceiling?.total_open) },
                { label: 'Supplier credit', value: creditAvailable, hint: 'returns / credit notes' },
                { label: 'Payable now', value: maxCash, strong: true },
                { label: 'Left after this', value: num(preview?.remaining_open ?? ceiling?.remaining_open) },
              ].map((c) => (
                <div key={c.label} className={`rounded-lg border px-3 py-2 ${c.strong ? 'border-primary/40 bg-primary/5' : 'border-border bg-accent/5'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p>
                  <p className={`text-sm font-bold tabular-nums ${c.strong ? 'text-primary' : ''}`}>{formatCurrency(c.value, currency)}</p>
                  {c.hint && <p className="text-[10px] text-muted-foreground">{c.hint}</p>}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? [] : bills.map((b) => b.id))}
                  />
                  {selected.length} of {bills.length} bill{bills.length === 1 ? '' : 's'} selected
                </label>
                {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {bills.map((b) => {
                  const line = lineByBill.get(b.id);
                  const open = num(b.balance_due ?? b.total_amount);
                  const isSel = selected.includes(b.id);
                  return (
                    <label key={b.id} className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${isSel ? '' : 'opacity-60'}`}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleBill(b.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{b.bill_number}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Due {fmtDate(b.due_date)} · owes {formatCurrency(open, b.currency)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-[11px]">
                        {isSel && line && line.outcome !== 'untouched' ? (
                          <>
                            <p className={`flex items-center justify-end gap-1 font-bold ${line.outcome === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {line.outcome === 'paid' ? <CheckCircle2 className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                              {line.outcome === 'paid' ? 'Paid in full' : `Part-paid, ${formatCurrency(num(line.open_after), b.currency)} left`}
                            </p>
                            <p className="text-muted-foreground">
                              {num(line.credit_applied) > 0 && <>credit {formatCurrency(num(line.credit_applied), b.currency)}</>}
                              {num(line.credit_applied) > 0 && num(line.cash_applied) > 0 && ' + '}
                              {num(line.cash_applied) > 0 && <>cash {formatCurrency(num(line.cash_applied), b.currency)}</>}
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">{isSel ? 'Not covered' : 'Excluded'}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {creditAvailable > 0 && (
              <label className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs">
                <input type="checkbox" className="mt-0.5" checked={applyCredits} onChange={(e) => setApplyCredits(e.target.checked)} />
                <span>
                  <span className="font-semibold">Use the supplier&apos;s {formatCurrency(creditAvailable, currency)} credit first</span>
                  <span className="block text-muted-foreground">
                    Purchase returns and credit notes already reduced what you owe; applying them clears those bills without paying that part again.
                  </span>
                </span>
              </label>
            )}

            <FormField
              label="Amount to pay now"
              required
              description={
                overMax
                  ? `The selected bills only owe ${formatCurrency(maxCash, currency)}${applyCredits && creditAvailable > 0 ? ' after credits' : ''}.`
                  : num(amount) < maxCash
                    ? `Partial settlement: ${formatCurrency(maxCash - num(amount), currency)} will stay owed on the latest bills.`
                    : 'Clears every selected bill.'
              }
            >
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={maxCash}
                  value={amount}
                  onChange={(e) => setTypedAmount(e.target.value)}
                  className={inputClass}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setTypedAmount(String(maxCash))}>
                  Full
                </Button>
              </div>
            </FormField>

            {num(amount) > 0 && <BillPaymentFields form={form} tenant={tenant} currency={currency} />}

            {previewErr && !overMax && <p className="text-xs text-destructive font-medium">{previewErr}</p>}

            {approvalRequired && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">This payment needs approval before it can be released.</p>
                  <p>Once it is approved, open this again and submit the same amount.</p>
                  <Link href={`/${orgSlug}/approvals`} className="underline font-medium hover:no-underline">
                    Go to the Approvals inbox
                  </Link>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={close} disabled={settle.isPending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={settle.isPending || selected.length === 0 || overMax}>
                {settle.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                <CreditCard className="h-4 w-4 mr-1" />
                {num(amount) > 0 ? `Settle ${formatCurrency(num(amount), currency)}` : 'Apply credit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
