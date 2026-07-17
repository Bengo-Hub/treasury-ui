'use client';

import { Card } from '@/components/ui/base';
import { StatCard } from '@/components/charts/StatCard';
import { StatusBanner } from '@/components/tax/kra-cards';
import { money } from '@/components/charts/chart-theme';
import { useVATReturnSummary, useTaxProfile } from '@/hooks/use-tax';
import { ObligationGate } from '@/components/tax/obligation-gate';
import { CalendarClock } from 'lucide-react';
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
  const { data: profile } = useTaxProfile(tenantSlug);
  const reconciled = data?.reconciled;

  return (
    <ObligationGate
      met={profile?.vat_registered}
      title="Not registered for VAT"
      message="This business isn't VAT-registered, so a VAT-3 return doesn't apply. Register for VAT to file VAT returns."
    >
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

      {/* Where VAT-3 is actually filed */}
      <StatusBanner tone="info" title="VAT-3 is filed on iTax">
        KRA pre-fills the VAT-3 from your eTIMS transmissions; this screen reconciles your books first so the pre-filled figures match before you submit on iTax (by the 20th).
      </StatusBanner>

      {/* Reconciliation banner */}
      {!isLoading && data && (
        <StatusBanner
          tone={reconciled ? 'success' : 'warning'}
          title={reconciled ? 'Books reconcile with the ledger' : 'Reconciliation mismatch — do not file yet'}
        >
          {reconciled
            ? 'Source documents agree with the general ledger for this period. Confirm the figures also match the KRA pre-filled (eTIMS) return before submitting.'
            : <>Source-document VAT and the general ledger disagree by <strong>{money(data.reconciliation_variance)}</strong>. Resolve the variance before filing — from Jan 2026 KRA auto-validates returns and a mismatch can be rejected even after payment.</>}
        </StatusBanner>
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
    </ObligationGate>
  );
}
