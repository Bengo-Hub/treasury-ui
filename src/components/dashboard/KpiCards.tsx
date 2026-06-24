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
  const pl = useProfitLossSummary(tenant, from, to);
  const pos = useTaxPositionEstimate(tenant);
  const d = pl.data;
  const netProfit = Number(d?.net_profit ?? 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Revenue" value={money(d?.total_revenue)} tone="success" loading={pl.isLoading}
        icon={<Banknote className="h-5 w-5" />} hint={`COGS ${money(d?.cost_of_goods)}`} />
      <StatCard label="Expenses" value={money(d?.total_expenses)} tone="destructive" loading={pl.isLoading}
        icon={<Receipt className="h-5 w-5" />} />
      <StatCard label="Net Profit" value={money(netProfit)} tone={netProfit >= 0 ? 'primary' : 'destructive'}
        loading={pl.isLoading} icon={<TrendingUp className="h-5 w-5" />} hint={`Gross ${money(d?.gross_profit)}`} />
      <StatCard label="VAT Payable (this period)" value={money(pos.data?.vat_payable)} tone="warning"
        loading={pos.isLoading} icon={<Landmark className="h-5 w-5" />}
        hint={pos.data?.vat_registered ? 'Output − input VAT' : 'Not VAT-registered'} />
    </div>
  );
}
