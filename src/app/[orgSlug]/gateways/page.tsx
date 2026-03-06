'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { useTenantGateways } from '@/hooks/use-gateways';
import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';
import {
  CreditCard,
  ExternalLink,
  Loader2,
  Plus,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function GatewaysPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { data: gateways = [], isLoading: loading, error: queryError } = useTenantGateways(orgSlug);
  const { user } = useMe();
  const isSuperAdmin = user?.roles?.includes('super_admin');
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load gateways') : null;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payment Gateways</h1>
          <p className="text-muted-foreground mt-1 text-sm">Available gateways for this tenant. Payments route through treasury (default: Paystack).</p>
        </div>
        {isSuperAdmin && (
          <Link href={`/${orgSlug}/platform`}>
            <Button className="gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Platform config
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading gateways…
        </div>
      ) : error ? (
        <div className="text-sm text-destructive py-4">{error}</div>
      ) : gateways.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No gateways available. Platform admin can configure Paystack or M-Pesa in Platform Configuration.
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 gap-6">
        {gateways.map((gw) => {
          const isPaystack = gw.gateway_type === 'paystack';
          const isMpesa = gw.gateway_type?.startsWith('mpesa');
          const color = isPaystack ? 'blue' : isMpesa ? 'green' : 'purple';
          return (
          <Card key={gw.gateway_type} className="overflow-hidden group hover:border-primary/30 transition-all">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-6 md:w-80 bg-accent/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center border border-border shadow-sm",
                      color === 'green' ? "bg-green-500/10" : color === 'blue' ? "bg-blue-500/10" : "bg-purple-500/10"
                    )}>
                      {isMpesa ? <Smartphone className="h-6 w-6 text-muted-foreground" /> : <CreditCard className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{gw.name}</h3>
                      <Badge variant="success">Available</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{gw.gateway_type}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {gw.supports_stk_push && <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">{gw.transaction_fee_type || '—'}</span>
                  </div>
                  {isSuperAdmin && (
                    <div className="mt-6">
                      <Link href={`/${orgSlug}/platform`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <ExternalLink className="h-3 w-3" /> Platform config
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 bg-card flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-semibold uppercase tracking-tight">Connected via Treasury</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">All payments for this tenant route through treasury and use the configured platform gateway.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
