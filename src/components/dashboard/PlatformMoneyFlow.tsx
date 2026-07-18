'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { SERIES, money } from '@/components/charts/chart-theme';
import { usePlatformByService } from '@/hooks/use-platform-analytics';
import { ArrowUpRight } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';

interface Props { from: string; to: string; tenantIds?: string }

/**
 * PlatformMoneyFlow — the platform-owner (All Tenants) money in vs out: gross collected vs
 * transaction costs per source service across the fleet, from /platform/analytics/revenue-by-service.
 * Quick links jump to the underlying records (transactions, platform invoices, bills).
 */
export function PlatformMoneyFlow({ from, to, tenantIds }: Props) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) ?? '';
  const byService = usePlatformByService(from, to, tenantIds);

  const data = (byService.data?.breakdown ?? []).map((s) => ({
    name: s.source_service || 'unknown',
    in: Number(s.gross_revenue),
    out: Number(s.transaction_costs),
  }));

  const links = [
    { label: 'Transactions', href: `/${orgSlug}/platform/analytics` },
    { label: 'Platform invoices', href: `/${orgSlug}/platform/invoices` },
    { label: 'Bills', href: `/${orgSlug}/bills` },
  ];

  return (
    <div className="space-y-2">
      <ChartCard
        title="Money In vs Out — Platform"
        subtitle="Gross collected vs transaction costs by service, across all tenants"
        height={240}
        empty={!byService.isLoading && data.length === 0}
      >
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => money(v).replace('KES', '').trim()} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
          <Tooltip formatter={(v) => money(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="in" name="Money In" fill={SERIES.collections} radius={[4, 4, 0, 0]} />
          <Bar dataKey="out" name="Costs / Out" fill={SERIES.expenses} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
      <div className="flex flex-wrap items-center gap-2 px-1">
        {links.map((l) => (
          <button
            key={l.href}
            onClick={() => router.push(l.href)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-accent transition-colors"
          >
            {l.label} <ArrowUpRight className="h-3 w-3" />
          </button>
        ))}
      </div>
    </div>
  );
}
