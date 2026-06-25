'use client';

import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { useProfitLossSummary } from '@/hooks/use-reports';
import { useTaxPositionEstimate } from '@/hooks/use-tax';
import { Banknote, Receipt, TrendingUp, Landmark } from 'lucide-react';

interface Props { tenant: string; from: string; to: string }

/**
 * KpiCards — the dashboard headline metrics (revenue, expenses, net profit, VAT payable),
 * sourced from the P&L summary + tax position. A self-contained widget reusing StatCard.
 */
export function KpiCards({ tenant, from, to }: Props) {
  const pl = useProfitLossSummary(tenant, { from, to });
  const pos = useTaxPositionEstimate(tenant);
  const d = pl.data;
  // Headline P&L is GL-sourced (complete — includes POS sales that post to the ledger without an
  // invoice). The source-doc figures + variance live on the reports P&L reconciliation card.
  const netProfit = Number(d?.gl_net_profit ?? 0);
  const variance = Number(d?.reconciliation_variance ?? 0);
  const reconciled = Math.abs(variance) < 0.01;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Revenue" value={money(d?.gl_revenue)} tone="success" loading={pl.isLoading}
        icon={<Banknote className="h-5 w-5" />} hint="General ledger" />
      <StatCard label="Expenses" value={money(d?.gl_expenses)} tone="destructive" loading={pl.isLoading}
        icon={<Receipt className="h-5 w-5" />} hint="General ledger" />
      <StatCard label="Net Profit" value={money(netProfit)} tone={netProfit >= 0 ? 'primary' : 'destructive'}
        loading={pl.isLoading} icon={<TrendingUp className="h-5 w-5" />}
        hint={reconciled ? 'Reconciled with source docs' : `Source-doc variance ${money(variance)}`} />
      <StatCard label="VAT Payable (this period)" value={money(pos.data?.vat_payable)} tone="warning"
        loading={pos.isLoading} icon={<Landmark className="h-5 w-5" />}
        hint={pos.data?.vat_registered ? 'Output − input VAT' : 'Not VAT-registered'} />
    </div>
  );
}
