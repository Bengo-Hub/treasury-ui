'use client';

import { money } from '@/components/charts/chart-theme';
import { Card } from '@/components/ui/base';
import {
  useCreateTaxPeriod,
  useFileTaxPeriod,
  useMarkTaxPeriodPaid,
  useTaxPeriods,
} from '@/hooks/use-tax';
import { exportVATReturn, type TaxPeriod, type TaxPeriodType } from '@/lib/api/tax';
import { downloadBlob } from '@/lib/utils/download-blob';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const PERIOD_TYPES: { value: TaxPeriodType; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Half yearly' },
  { value: 'annual', label: 'Yearly' },
];

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-muted text-foreground',
  overdue: 'bg-destructive/10 text-destructive',
  filed: 'bg-primary/10 text-primary',
  paid: 'bg-primary/15 text-primary',
};

// Periods are stored in UTC, so read their dates in UTC or a month end falls into the next month.
const day = (iso: string) => iso.slice(0, 10);
const label = (p: TaxPeriod) => `${day(p.start_date)} to ${day(p.end_date)}`;
const today = () => new Date().toISOString().slice(0, 10);

type Action = { kind: 'file' | 'pay'; period: TaxPeriod };

const inputClass =
  'rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const primaryButton =
  'inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50';
const quietButton = 'rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent';

/**
 * TaxPeriodsPanel lists the business's VAT filing periods and records each step on them: open a
 * period, note the KRA acknowledgement once the VAT-3 is filed on iTax, then note the payment. It
 * records what happened on iTax; it does not file anything itself.
 */
export function TaxPeriodsPanel({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading } = useTaxPeriods(tenantSlug);
  const create = useCreateTaxPeriod(tenantSlug);
  const file = useFileTaxPeriod(tenantSlug);
  const pay = useMarkTaxPeriodPaid(tenantSlug);

  const [type, setType] = useState<TaxPeriodType>('monthly');
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 7));
  const [action, setAction] = useState<Action | null>(null);
  const [reference, setReference] = useState('');
  const [prn, setPrn] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [exporting, setExporting] = useState('');

  const periods = [...(data?.periods ?? [])].sort((a, b) => b.start_date.localeCompare(a.start_date));

  function open(kind: Action['kind'], period: TaxPeriod) {
    setAction({ kind, period });
    setReference('');
    setPrn('');
    setAmount(String(period.total_payable ?? ''));
    setDate(today());
  }

  async function exportCsv(p: TaxPeriod) {
    setExporting(p.id);
    try {
      const { blob, fileName } = await exportVATReturn(tenantSlug, { from: day(p.start_date), to: day(p.end_date) });
      downloadBlob(blob, fileName);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not export the VAT return');
    } finally {
      setExporting('');
    }
  }

  function submit() {
    if (!action) return;
    const done = { onSuccess: () => setAction(null) };
    if (action.kind === 'file') {
      file.mutate({ periodID: action.period.id, reference: reference.trim(), filed_at: date }, done);
    } else {
      pay.mutate({ periodID: action.period.id, prn: prn.trim(), amount, paid_at: date }, done);
    }
  }

  const pending = file.isPending || pay.isPending;
  const canSubmit = action?.kind === 'file' ? reference.trim() !== '' : prn.trim() !== '' && Number(amount) > 0;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Filing periods</h3>
          <p className="text-xs text-muted-foreground">
            Open a period, then record the KRA acknowledgement after you file on iTax and the payment after you pay.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted-foreground">
            Type
            <select value={type} onChange={(e) => setType(e.target.value as TaxPeriodType)} className={`${inputClass} ml-2`}>
              {PERIOD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Starts
            <input type="month" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputClass} ml-2`} />
          </label>
          <button
            type="button"
            className={primaryButton}
            disabled={create.isPending || !start}
            onClick={() => create.mutate({ period_type: type, start_date: `${start}-01` })}
          >
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Open period
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-2 py-2 font-medium">Period</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 text-right font-medium">Net VAT payable</th>
              <th className="px-2 py-2 font-medium">KRA reference</th>
              <th className="px-2 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {isLoading && (
              <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">Loading periods...</td></tr>
            )}
            {!isLoading && periods.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">No periods yet. Open the first one above.</td></tr>
            )}
            {periods.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="px-2 py-2">
                  <div className="font-medium">{label(p)}</div>
                  <div className="text-xs text-muted-foreground">{PERIOD_TYPES.find((t) => t.value === p.period_type)?.label ?? p.period_type}</div>
                </td>
                <td className="px-2 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status] ?? 'bg-muted text-foreground'}`}>{p.status}</span>
                </td>
                <td className="px-2 py-2 text-right">{money(p.total_payable)}</td>
                <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{p.kra_filing_reference || '—'}</td>
                <td className="px-2 py-2">
                  <div className="flex justify-end gap-2">
                    {(p.status === 'open' || p.status === 'overdue') && (
                      <button type="button" className={quietButton} onClick={() => open('file', p)}>Record filing</button>
                    )}
                    {p.status === 'filed' && (
                      <button type="button" className={quietButton} onClick={() => open('pay', p)}>Record payment</button>
                    )}
                    <button
                      type="button"
                      className={quietButton}
                      disabled={exporting === p.id}
                      onClick={() => exportCsv(p)}
                      aria-label={`Export the VAT return for ${label(p)}`}
                    >
                      {exporting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {action && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium">
            {action.kind === 'file' ? 'Record the filing for ' : 'Record the payment for '}
            {label(action.period)}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            {action.kind === 'file' ? (
              <label className="text-xs text-muted-foreground">
                KRA acknowledgement reference
                <input value={reference} onChange={(e) => setReference(e.target.value)} className={`${inputClass} mt-1 block w-64`} />
              </label>
            ) : (
              <>
                <label className="text-xs text-muted-foreground">
                  Payment registration number (PRN)
                  <input value={prn} onChange={(e) => setPrn(e.target.value)} className={`${inputClass} mt-1 block w-56`} />
                </label>
                <label className="text-xs text-muted-foreground">
                  Amount paid
                  <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} mt-1 block w-36`} />
                </label>
              </>
            )}
            <label className="text-xs text-muted-foreground">
              {action.kind === 'file' ? 'Filed on' : 'Paid on'}
              <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={`${inputClass} mt-1 block`} />
            </label>
            <button type="button" className={primaryButton} disabled={pending || !canSubmit} onClick={submit}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
            <button type="button" className={quietButton} onClick={() => setAction(null)}>Cancel</button>
          </div>
        </div>
      )}
    </Card>
  );
}
