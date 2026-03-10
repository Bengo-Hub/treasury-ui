'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { usePlatformByTenant, usePlatformOverview } from '@/hooks/use-platform-analytics';
import { formatCurrency } from '@/lib/utils/currency';
import { Activity, BarChart, Building2, Download, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function PlatformAnalyticsPage() {
  // Normally use real date pickers, skipping for MVP speeds
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: overview, isLoading: loadingOverview } = usePlatformOverview();
  const { data: byTenant, isLoading: loadingTenants } = usePlatformByTenant();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ecosystem Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform-wide overview of all payment flows and tenant performance.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Total Volume</h3>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <div className="animate-pulse h-8 bg-muted rounded w-32"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(parseFloat(overview?.total_revenue || '0'), overview?.currency || 'KES')}</div>
                <p className="text-xs text-muted-foreground mt-1 text-emerald-600 font-medium">+14.2% from last month</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Transactions</h3>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <div className="animate-pulse h-8 bg-muted rounded w-24"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{overview?.total_transactions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Succeeded: {overview?.succeeded_count}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Active Tenants</h3>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <div className="animate-pulse h-8 bg-muted rounded w-16"></div>
            ) : (
              <>
                <div className="text-2xl font-bold">{overview?.active_tenants}</div>
                <p className="text-xs text-muted-foreground mt-1">Contributing this period</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <h3 className="text-lg font-bold">Revenue by Tenant</h3>
          </CardHeader>
          <CardContent>
            {loadingTenants ? (
              <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">Loading breakdown...</div>
            ) : byTenant?.tenants?.length === 0 ? (
              <div className="min-h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <BarChart className="h-12 w-12 mb-4 opacity-20" />
                <p>No tenant revenue in this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {byTenant?.tenants.map((t: any) => (
                  <div key={t.tenant_id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0 uppercase">
                      {t.tenant_id.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.tenant_id}</p>
                      <p className="text-xs text-muted-foreground">{t.transaction_count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(parseFloat(t.total_revenue), 'KES')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <h3 className="text-lg font-bold">Data Exports</h3>
            <p className="text-sm text-muted-foreground">Generate platform-wide analytical extracts.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Transaction Details</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Full ecosystem general ledger export (CSV)</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Tenant Summary</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Aggregated payouts by tenant footprint</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
