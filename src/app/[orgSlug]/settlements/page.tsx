'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { usePayoutHistory } from '@/hooks/use-analytics';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { PayoutRecord } from '@/lib/api/analytics';
import { cn } from '@/lib/utils';
import {
    ArrowUpRight,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Loader2,
    Wallet
} from 'lucide-react';
import { useMemo, useState } from 'react';

export default function SettlementsPage() {
  const { tenantPathId } = useResolvedTenant();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, error } = usePayoutHistory(tenantPathId, !!tenantPathId);
  const payouts = data?.payouts ?? [];

  const filtered = useMemo(() => {
    return statusFilter === 'all' ? payouts : payouts.filter((b) => b.status === statusFilter);
  }, [payouts, statusFilter]);

  const summary = useMemo(() => {
    const settled = payouts.filter((p) => p.status === 'completed' || p.status === 'settled');
    const pending = payouts.filter((p) => p.status === 'pending' || p.status === 'processing');
    const settledAmount = settled.reduce((sum, p) => sum + parseFloat(p.net_amount || '0'), 0);
    const pendingAmount = pending.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const totalFees = payouts.reduce((sum, p) => sum + parseFloat(p.fee || '0'), 0);
    const totalTxns = payouts.reduce((sum, p) => sum + (p.transaction_count || 0), 0);
    return { settledAmount, pendingAmount, totalFees, settledCount: settled.length, pendingCount: pending.length, totalTxns };
  }, [payouts]);

  const statusOptions = ['all', 'completed', 'settled', 'pending', 'processing', 'failed'];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settlements</h1>
          <p className="text-muted-foreground mt-1">Track settlement batches and payout status across gateways.</p>
        </div>
        <Button variant="outline" className="gap-2" disabled>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load settlements. Check your connection and try again.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-green-500">Settled</span>
            </div>
            <p className="text-3xl font-bold">
              {summary.settledAmount > 0 ? `${payouts[0]?.currency ?? 'KES'} ${summary.settledAmount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{summary.settledCount} batches</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Pending</span>
            </div>
            <p className="text-3xl font-bold">
              {summary.pendingAmount > 0 ? `${payouts[0]?.currency ?? 'KES'} ${summary.pendingAmount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{summary.pendingCount} batches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Fees</span>
            </div>
            <p className="text-3xl font-bold">
              {summary.totalFees > 0 ? `KES ${summary.totalFees.toLocaleString('en-KE', { maximumFractionDigits: 0 })}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{summary.totalTxns} transactions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Payout History</h3>
          </div>
          <div className="flex gap-2">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading payouts…
              </div>
            )}
            {!isLoading && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Reference</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Txns</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Fees</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Net</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Period / Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((batch: PayoutRecord) => (
                    <tr key={batch.id} className="hover:bg-accent/5 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{batch.reference}</td>
                      <td className="px-6 py-4 text-center text-xs">{batch.transaction_count}</td>
                      <td className="px-6 py-4 text-right text-xs">{batch.currency} {batch.amount}</td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">{batch.currency} {batch.fee}</td>
                      <td className="px-6 py-4 text-right text-xs font-bold">{batch.currency} {batch.net_amount}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={batch.status === 'completed' || batch.status === 'settled' ? 'success' : batch.status === 'pending' || batch.status === 'processing' ? 'warning' : 'error'}>
                          {batch.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        <div className="flex items-center justify-end gap-2">
                          {batch.period_start ? `${batch.period_start.slice(0, 10)} – ${batch.period_end?.slice(0, 10) ?? ''}` : new Date(batch.created_at).toLocaleString()}
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No payout records match your filters.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
