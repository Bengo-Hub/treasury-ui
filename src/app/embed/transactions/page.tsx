'use client';

import { useTransactions } from '@/hooks/use-analytics';
import { Card, CardContent, Badge } from '@/components/ui/base';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
function formatCurrency(amount: number | string, currency = 'KES') {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString()}`;
  }
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  succeeded: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export default function EmbedTransactionsPage() {
  const searchParams = useSearchParams();
  const tenant = searchParams?.get('tenant') ?? '';

  const { data, isLoading, isError } = useTransactions(tenant);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Unable to load transactions.
      </div>
    );
  }

  const transactions = data?.transactions ?? [];

  if (transactions.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{data?.count ?? 0} total transactions</p>
      {transactions.map((tx) => (
        <Card key={tx.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-sm">{tx.reference_id || tx.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                {tx.source_service} &middot; {tx.payment_method}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(tx.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusColors[tx.status] ?? 'bg-gray-100 text-gray-600'}>
                {tx.status}
              </Badge>
              <span className="font-bold text-sm">
                {formatCurrency(tx.amount, tx.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
