'use client';

import { useSettlements } from '@/hooks/use-settlements';
import { Card, CardContent, Badge } from '@/components/ui/base';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEmbedAuth } from '../layout';

function formatCurrency(amount: number, currency = 'KES') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
};

export default function EmbedSettlementsPage() {
  const searchParams = useSearchParams();
  const tenant = searchParams?.get('tenant') ?? '';

  const { ready } = useEmbedAuth();
  const { data, isLoading, isError } = useSettlements(tenant, undefined, ready);

  if (!ready || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Unable to load settlements.
      </div>
    );
  }

  const settlements = data?.settlements ?? [];

  if (!Array.isArray(settlements) || settlements.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        No settlements found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((s: any) => (
        <Card key={s.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-sm">{s.reference || s.id?.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                {s.settled_at ? new Date(s.settled_at).toLocaleString() : s.created_at ? new Date(s.created_at).toLocaleString() : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusColors[s.status] ?? 'bg-gray-100 text-gray-600'}>
                {s.status}
              </Badge>
              <span className="font-bold text-sm">
                {formatCurrency(s.amount ?? 0, s.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
