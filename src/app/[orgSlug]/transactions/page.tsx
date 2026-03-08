'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useTransactions } from '@/hooks/use-analytics';
import type { TransactionItem } from '@/lib/api/analytics';
import { cn } from '@/lib/utils';
import {
    ArrowUpRight,
    Calendar,
    Download,
    Filter,
    Loader2,
    Search
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function TransactionsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const dateRange = useMemo(() => defaultDateRange(), []);

  const queryParams = useMemo(() => ({
    from: dateRange.from,
    to: dateRange.to,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(typeFilter !== 'all' ? { payment_method: typeFilter } : {}),
  }), [dateRange, statusFilter, typeFilter]);

  const { data, isLoading, error } = useTransactions(orgSlug, queryParams, !!orgSlug);
  const list = data?.transactions ?? [];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (txn: TransactionItem) =>
        txn.reference_id?.toLowerCase().includes(q) ||
        txn.source_service?.toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const statusOptions = ['all', 'succeeded', 'pending', 'processing', 'failed', 'cancelled'];
  const methodOptions = ['all', 'mpesa', 'card', 'cash', 'bank_transfer'];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">View and filter all payment transactions across gateways.</p>
        </div>
        <Button variant="outline" className="gap-2" disabled>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load transactions. Check your connection and try again.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search by reference or source..."
              className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">Status:</span>
            </div>
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
            <div className="w-px h-5 bg-border mx-2" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">Method:</span>
            </div>
            {methodOptions.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                  typeFilter === t ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:text-foreground"
                )}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading transactions…
              </div>
            )}
            {!isLoading && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Reference</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Source</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Method</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((txn: TransactionItem) => (
                    <tr key={txn.id} className="hover:bg-accent/5 transition-colors cursor-pointer">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{txn.reference_id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                          <span className="capitalize text-xs font-medium">{txn.reference_type || 'payment'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">{txn.source_service || '—'}</td>
                      <td className="px-6 py-4 text-xs">{txn.payment_method}</td>
                      <td className="px-6 py-4 text-right font-bold text-xs">{txn.currency} {txn.amount}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={txn.status === 'succeeded' ? 'success' : txn.status === 'pending' || txn.status === 'processing' ? 'warning' : 'error'}>
                          {txn.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No transactions match your filters.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
