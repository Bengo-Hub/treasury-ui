'use client';

import { Card } from '@/components/ui/base';
import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { useBadDebtRelief, useClaimVATRelief, useTaxProfile } from '@/hooks/use-tax';
import { ObligationGate } from '@/components/tax/obligation-gate';
import { AlertTriangle, CheckCircle2, Clock, Info, Loader2 } from 'lucide-react';

interface Props { tenantSlug: string }

const label = 'text-xs text-muted-foreground';

function StatusPill({ status, days }: { status: string; days: number }) {
  if (status === 'eligible') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"><CheckCircle2 className="h-3 w-3" />Eligible now</span>;
  }
  if (status === 'expired') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"><AlertTriangle className="h-3 w-3" />Past 10-yr deadline</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"><Clock className="h-3 w-3" />Eligible in {Math.max(0, days)}d</span>;
}

/**
 * BadDebtReliefTab — VAT bad-debt relief (VAT Act s.31). Output VAT is remitted on the invoice
 * date even if the customer never pays; this surfaces the unpaid VAT-bearing sales and how much
 * of that VAT is reclaimable from KRA, with the per-invoice eligibility clock.
 */
export function BadDebtReliefTab({ tenantSlug }: Props) {
  const { data, isLoading } = useBadDebtRelief(tenantSlug);
  const { data: profile } = useTaxProfile(tenantSlug);
  const claim = useClaimVATRelief();

  return (
    <ObligationGate
      met={profile?.vat_registered}
      title="Not registered for VAT"
      message="VAT bad-debt relief (s.31) reclaims output VAT already accounted for — it only applies to VAT-registered businesses."
    >
    <div className="space-y-6">
      {/* Explainer: credit note vs bad-debt relief */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Info className="h-5 w-5" /></div>
          <div className="space-y-1 text-sm">
            <p className="font-semibold">Raised an eTIMS invoice that was never paid — am I still taxed?</p>
            <p className="text-muted-foreground">
              Yes. Kenyan VAT is charged on the <span className="font-medium text-foreground">invoice date</span> (VAT Act s.12/19), so you remit the output VAT even if the customer never pays.
              A <span className="font-medium text-foreground">credit note (s.16)</span> is <span className="font-medium text-foreground">not</span> the remedy for a genuine unpaid sale — it's only for returns/cancellations/repricing within 6 months, linked to the original invoice.
              The remedy is <span className="font-medium text-foreground">VAT bad-debt relief (s.31)</span>: reclaim the output VAT via iTax once the debt has aged past the waiting period (2 years from 1 Jul 2025, else 3), within a 10-year deadline; repay within 60 days if later collected.
            </p>
          </div>
        </div>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Output VAT at risk" value={money(data?.output_vat_at_risk)} tone="warning" loading={isLoading}
          hint="On unpaid sales you've already remitted" />
        <StatCard label="Reclaimable now" value={money(data?.reclaimable_now)} tone="success" loading={isLoading}
          hint="Past the s.31 waiting period" />
        <StatCard label="Reclaimable upcoming" value={money(data?.reclaimable_upcoming)} tone="default" loading={isLoading}
          hint="Not yet eligible" />
        <StatCard label="Expired" value={money(data?.expired_vat)} tone="destructive" loading={isLoading}
          hint="Past the 10-yr claim deadline" />
      </div>

      {/* Candidates */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Unpaid VAT-bearing sales ({data?.candidates.length ?? 0})</h3>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded bg-muted" />)}</div>
        ) : !data || data.candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unpaid VAT-bearing sales — nothing to reclaim.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-2 py-2 font-medium">Invoice</th>
                  <th className="px-2 py-2 font-medium">Customer</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium text-right">Recoverable VAT</th>
                  <th className="px-2 py-2 font-medium">Eligible from</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.candidates.map((c) => (
                  <tr key={c.invoice_id} className="border-b border-border/50 hover:bg-accent/5">
                    <td className="px-2 py-2 font-mono text-xs">{c.invoice_number}</td>
                    <td className="px-2 py-2">{c.customer_name || '—'}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{c.invoice_date}</td>
                    <td className="px-2 py-2 text-right tabular-nums font-medium">{money(c.recoverable_vat)}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{c.eligible_from}</td>
                    <td className="px-2 py-2"><StatusPill status={c.status} days={c.days_until_eligible} /></td>
                    <td className="px-2 py-2 text-right">
                      {c.status === 'eligible' && (
                        <button
                          onClick={() => claim.mutate({ tenantSlug, invoiceID: c.invoice_id })}
                          disabled={claim.isPending}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                          {claim.isPending && claim.variables?.invoiceID === c.invoice_id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Claim relief
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data?.notes?.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
      </Card>
    </div>
    </ObligationGate>
  );
}
