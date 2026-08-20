'use client';

import { Card } from '@/components/ui/base';
import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { useBadDebtRelief, useClaimVATRelief, useTaxProfile } from '@/hooks/use-tax';
import { ObligationGate } from '@/components/tax/obligation-gate';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildBadDebtReliefColumns } from './bad-debt-relief-columns';
import { Info } from 'lucide-react';
import { useMemo } from 'react';

interface Props { tenantSlug: string }

const label = 'text-xs text-muted-foreground';

/**
 * BadDebtReliefTab — VAT bad-debt relief (VAT Act s.31). Output VAT is remitted on the invoice
 * date even if the customer never pays; this surfaces the unpaid VAT-bearing sales and how much
 * of that VAT is reclaimable from KRA, with the per-invoice eligibility clock.
 */
export function BadDebtReliefTab({ tenantSlug }: Props) {
  const { data, isLoading } = useBadDebtRelief(tenantSlug);
  const { data: profile } = useTaxProfile(tenantSlug);
  const claim = useClaimVATRelief();
  const columns = useMemo(
    () =>
      buildBadDebtReliefColumns({
        onClaim: (c) => claim.mutate({ tenantSlug, invoiceID: c.invoice_id }),
        claimPending: claim.isPending,
        claimPendingInvoiceId: claim.variables?.invoiceID,
      }),
    [tenantSlug, claim],
  );

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
        <DataTable
          columns={columns}
          rows={data?.candidates ?? []}
          rowKey={(c) => c.invoice_id}
          loading={isLoading}
          loadingRows={8}
          storageKey="bad-debt-relief-table"
          emptyText="No unpaid VAT-bearing sales — nothing to reclaim."
        />
        {data?.notes?.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
      </Card>
    </div>
    </ObligationGate>
  );
}
