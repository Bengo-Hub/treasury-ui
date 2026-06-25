'use client';

import { Card } from '@/components/ui/base';
import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { useVATReturnSummary } from '@/hooks/use-tax';
import { AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface Props { tenantSlug: string }

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

/**
 * VATReturnTab — "reconcile before you file" VAT-3 preparation. Shows the period's output/input
 * VAT and net payable, RECONCILED against the general ledger so drift is caught before filing.
 * From Jan 2026 KRA auto-validates returns against eTIMS/WHT/customs — a mismatch gets the return
 * rejected even after payment, so the reconciliation banner is the headline.
 */
export function VATReturnTab({ tenantSlug }: Props) {
  const [month, setMonth] = useState(currentMonth());
  const range = monthRange(month);
  const { data, isLoading } = useVATReturnSummary(tenantSlug, range);
  const reconciled = data?.reconciled;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">VAT-3 return prep</h3>
          <p className="text-xs text-muted-foreground">Reconcile your books against the ledger before you file.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Period</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
      </div>

      {/* Reconciliation banner */}
      {!isLoading && data && (
        <Card className={`p-4 ${reconciled ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${reconciled ? 'bg-green-500/15 text-green-600' : 'bg-amber-500/15 text-amber-600'}`}>
              {reconciled ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{reconciled ? 'Books reconcile with the ledger' : 'Reconciliation mismatch — do not file yet'}</p>
              <p className="text-muted-foreground">
                {reconciled
                  ? 'Source documents agree with the general ledger for this period. Confirm the figures also match the KRA pre-filled (eTIMS) return before submitting.'
                  : <>Source-document VAT and the general ledger disagree by <span className="font-semibold text-foreground">{money(data.reconciliation_variance)}</span>. Resolve the variance before filing — from Jan 2026 KRA auto-validates returns and a mismatch can be rejected even after payment.</>}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* VAT-3 boxes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Output VAT (sales)" value={money(data?.output_vat)} tone="default" loading={isLoading}
          hint="VAT you charged customers" />
        <StatCard label="Input VAT (purchases)" value={money(data?.input_vat)} tone="default" loading={isLoading}
          hint="VAT you paid suppliers" />
        <StatCard label="Net VAT payable" value={money(data?.net_vat_payable)} tone={Number(data?.net_vat_payable ?? 0) >= 0 ? 'warning' : 'success'} loading={isLoading}
          hint={Number(data?.net_vat_payable ?? 0) >= 0 ? 'Payable to KRA' : 'Credit carried forward'} />
      </div>

      {/* Ledger comparison + due date */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          VAT-3 due <span className="font-medium text-foreground">{data?.due_date ?? '—'}</span> (20th of the following month)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-2 py-2 font-medium">Figure</th>
                <th className="px-2 py-2 font-medium text-right">From documents</th>
                <th className="px-2 py-2 font-medium text-right">From ledger</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr className="border-b border-border/50">
                <td className="px-2 py-2">Output VAT</td>
                <td className="px-2 py-2 text-right">{money(data?.output_vat)}</td>
                <td className="px-2 py-2 text-right">{money(data?.gl_output_vat)}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-2 py-2">Input VAT</td>
                <td className="px-2 py-2 text-right">{money(data?.input_vat)}</td>
                <td className="px-2 py-2 text-right">{money(data?.gl_input_vat)}</td>
              </tr>
              {Number(data?.whvat_withheld ?? 0) > 0 && (
                <tr className="border-b border-border/50">
                  <td className="px-2 py-2">Less: WHVAT withheld</td>
                  <td className="px-2 py-2 text-right text-green-600">−{money(data?.whvat_withheld)}</td>
                  <td className="px-2 py-2 text-right text-muted-foreground">credit</td>
                </tr>
              )}
              <tr className="font-medium">
                <td className="px-2 py-2">Net VAT</td>
                <td className="px-2 py-2 text-right">{money(data?.net_vat_payable)}</td>
                <td className="px-2 py-2 text-right">{money(data?.gl_net_vat)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {data?.notes?.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
      </Card>
    </div>
  );
}
