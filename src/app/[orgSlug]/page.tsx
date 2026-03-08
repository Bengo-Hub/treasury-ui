'use client';

import { Badge, Card, CardContent } from '@/components/ui/base';
import { useAnalyticsSummary, useTransactions } from '@/hooks/use-analytics';
import {
    ArrowUpRight,
    Banknote,
    CreditCard,
    DollarSign,
    Loader2,
    Wallet
} from 'lucide-react';
import { useParams } from 'next/navigation';

function formatDateRange(from: Date, to: Date): { from: string; to: string } {
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function DashboardPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const now = new Date();
  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 30);
  const range = formatDateRange(last30, now);

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useAnalyticsSummary(orgSlug, range);
  const { data: txData, isLoading: txLoading, error: txError } = useTransactions(orgSlug, { ...range }, !!orgSlug);

  const recentTransactions = txData?.transactions?.slice(0, 6) ?? [];
  const currency = summary?.currency ?? 'KES';

  const kpis = [
    {
      label: 'Total Revenue',
      value: summary ? `${currency} ${Number(summary.total_revenue).toLocaleString('en-KE', { maximumFractionDigits: 0 })}` : '—',
      trend: summary ? `${summary.succeeded_count} succeeded` : '',
      up: true,
      icon: DollarSign,
      color: 'text-green-500 bg-green-500/10',
    },
    {
      label: 'Pending',
      value: summary ? `${summary.pending_count} txns` : '—',
      trend: summary ? `${summary.pending_count} pending` : '',
      up: false,
      icon: Wallet,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      label: 'Payment methods',
      value: '—',
      trend: 'From gateways',
      up: true,
      icon: CreditCard,
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      label: 'Transactions (period)',
      value: summary ? String(summary.succeeded_count + summary.pending_count + summary.failed_count) : '—',
      trend: summary ? `${summary.succeeded_count} ok, ${summary.failed_count} failed` : '',
      up: true,
      icon: Banknote,
      color: 'text-purple-500 bg-purple-500/10',
    },
  ];

  const loading = summaryLoading || txLoading;
  const hasError = summaryError || txError;

  return (
    <div className="p-8">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Treasury Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor revenue, settlements, and payment operations.</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
          </div>
        )}
        {hasError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load dashboard data. Check your connection and try again.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="group hover:border-primary/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  {kpi.trend && (
                    <div className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
                      {kpi.up && <ArrowUpRight className="h-3 w-3" />}
                      {kpi.trend}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold">Recent Transactions</h3>
            <Badge variant="outline">{summary?.period ?? 'Last 30 days'}</Badge>
          </div>
          <div className="divide-y divide-border">
            {recentTransactions.length === 0 && !txLoading && (
              <div className="px-6 py-12 text-center text-muted-foreground">No transactions in this period.</div>
            )}
            {recentTransactions.map((txn) => (
              <div key={txn.id} className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-accent/30 flex items-center justify-center">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-mono">{txn.reference_id}</p>
                    <p className="text-xs text-muted-foreground">{txn.payment_method}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className="text-sm font-bold">{txn.currency} {txn.amount}</p>
                  <Badge variant={txn.status === 'succeeded' ? 'success' : txn.status === 'pending' || txn.status === 'processing' ? 'warning' : 'error'}>
                    {txn.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground w-32 text-right">{new Date(txn.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
