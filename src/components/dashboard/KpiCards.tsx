'use client';

import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { useProfitLossSummary } from '@/hooks/use-reports';
import { useTaxPositionEstimate } from '@/hooks/use-tax';
import { Banknote, Receipt, TrendingUp, Landmark, Clock } from 'lucide-react';

interface Props { tenant: string; from: string; to: string }

/**
 * KpiCards — the dashboard headline metrics, sourced from the P&L summary + tax position.
 *
 * Revenue/Net Profit are accrual (GL — revenue recognised when invoiced, the standard basis), so
 * they include issued-but-unpaid invoices. The accrued-but-uncollected portion is shown as its
 * own "Outstanding" card rather than mislabeled as a variance. Now that the source-document P&L is
 * also accrual, `reconciliation_variance` only fires on GENUINE drift (e.g. a manual GL entry with
 * no source document), so the hint stays clean for ordinary unpaid invoices.
 */
export function KpiCards({ tenant, from, to }: Props) {
  const pl = useProfitLossSummary(tenant, { from, to });
  const pos = useTaxPositionEstimate(tenant);
  const d = pl.data;
  const netProfit = Number(d?.gl_net_profit ?? 0);
  const variance = Number(d?.reconciliation_variance ?? 0);
  const reconciled = Math.abs(variance) < 0.01;
  const outstanding = Number(d?.outstanding_ar ?? 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard label="Revenue" value={money(d?.gl_revenue)} tone="success" loading={pl.isLoading}
        icon={<Banknote className="h-5 w-5" />} hint="Accrual (when invoiced)" />
      <StatCard label="Expenses" value={money(d?.gl_expenses)} tone="destructive" loading={pl.isLoading}
        icon={<Receipt className="h-5 w-5" />} hint="General ledger" />
      <StatCard label="Net Profit" value={money(netProfit)} tone={netProfit >= 0 ? 'primary' : 'destructive'}
        loading={pl.isLoading} icon={<TrendingUp className="h-5 w-5" />}
        hint={reconciled ? 'Books reconciled' : `Unreconciled drift ${money(variance)}`} />
      <StatCard label="Outstanding (unpaid)" value={money(outstanding)} tone={outstanding > 0 ? 'warning' : 'default'}
        loading={pl.isLoading} icon={<Clock className="h-5 w-5" />}
        hint={`Cash collected ${money(d?.cash_revenue)}`} />
      <StatCard label="VAT Payable (this period)" value={money(pos.data?.vat_payable)} tone="warning"
        loading={pos.isLoading} icon={<Landmark className="h-5 w-5" />}
        hint={pos.data?.vat_registered ? 'Output − input VAT' : 'Not VAT-registered'} />
    </div>
  );
}
