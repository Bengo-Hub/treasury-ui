'use client';

import { useAnalyticsSummary } from '@/hooks/use-analytics';
import { Card, CardContent } from '@/components/ui/base';
import { Loader2, TrendingUp, CreditCard, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEmbedAuth } from '../layout';

function formatCurrency(amount: number, currency = 'KES') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function EmbedDashboardPage() {
  const searchParams = useSearchParams();
  const tenant = searchParams?.get('tenant') ?? '';
  const { ready } = useEmbedAuth();

  // Wait for auth token before firing API calls
  const { data: summary, isLoading, isError } = useAnalyticsSummary(tenant, {}, ready);

  if (!ready || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <p>Unable to load payment dashboard.</p>
        <p className="text-sm mt-1">Treasury service may not be configured for this tenant.</p>
      </div>
    );
  }

  const revenue = parseFloat(summary.total_revenue) || 0;

  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(revenue),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      label: 'Succeeded',
      value: String(summary.succeeded_count ?? 0),
      icon: CreditCard,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Pending',
      value: String(summary.pending_count ?? 0),
      icon: ArrowUpRight,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'Failed',
      value: String(summary.failed_count ?? 0),
      icon: ArrowDownRight,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
