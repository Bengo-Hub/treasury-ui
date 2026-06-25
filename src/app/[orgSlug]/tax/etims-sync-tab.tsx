'use client';

import { Card } from '@/components/ui/base';
import { StatCard } from '@/components/charts/StatCard';
import { money } from '@/components/charts/chart-theme';
import { useEtimsReconciliation } from '@/hooks/use-tax';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface Props { tenantSlug: string }

/**
 * EtimsSyncTab — reconciles treasury's recorded transmissions against what KRA eTIMS actually
 * holds (selectTrnsSalesList). For a newly-onboarded business this confirms the books are in sync
 * with eTIMS before filing, and surfaces sales KRA has that treasury doesn't (pre-onboarding
 * history / another device) so they can be accounted for without re-transmission.
 */
export function EtimsSyncTab({ tenantSlug }: Props) {
  const { data, isLoading, isFetching, refetch } = useEtimsReconciliation(tenantSlug);
  const inSync = data?.in_sync;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">eTIMS reconciliation</h3>
          <p className="text-xs text-muted-foreground">Compare treasury records against KRA eTIMS.</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent/10 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />Re-check
        </button>
      </div>

      {!isLoading && data && !data.configured ? (
        <Card className="p-4 text-sm text-muted-foreground">
          No active eTIMS device for this tenant — register and initialize a device to reconcile with KRA.
        </Card>
      ) : (
        <>
          {!isLoading && data && (
            <Card className={`p-4 ${inSync ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${inSync ? 'bg-green-500/15 text-green-600' : 'bg-amber-500/15 text-amber-600'}`}>
                  {inSync ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{inSync ? 'In sync with KRA eTIMS' : 'Out of sync with KRA eTIMS'}</p>
                  {data.notes.map((n, i) => <p key={i} className="text-muted-foreground">{n}</p>)}
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="KRA sales (window)" value={String(data?.kra_sales_count ?? 0)} tone="default" loading={isLoading} hint={money(data?.kra_sales_total)} />
            <StatCard label="Treasury transmitted" value={String(data?.treasury_transmitted_count ?? 0)} tone="default" loading={isLoading} />
            <StatCard label="Matched" value={String(data?.matched_count ?? 0)} tone="success" loading={isLoading} />
            <StatCard label="Discrepancies" value={String((data?.only_in_kra.length ?? 0) + (data?.only_in_treasury.length ?? 0))} tone={inSync ? 'success' : 'warning'} loading={isLoading} />
          </div>

          {!!data?.only_in_kra.length && (
            <Card className="p-4 space-y-2">
              <h4 className="text-sm font-semibold">In KRA but not in treasury ({data.only_in_kra.length})</h4>
              <p className="text-xs text-muted-foreground">Account for these as opening balances — do not re-transmit.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground"><tr className="border-b border-border">
                    <th className="px-2 py-2 font-medium">Receipt</th><th className="px-2 py-2 font-medium">Invoice</th>
                    <th className="px-2 py-2 font-medium">Customer</th><th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium text-right">Amount</th>
                  </tr></thead>
                  <tbody>{data.only_in_kra.map((r, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-2 py-2 font-mono text-xs">{r.receipt_no}</td>
                      <td className="px-2 py-2">{r.invoice_no ?? '—'}</td>
                      <td className="px-2 py-2">{r.customer || '—'}</td>
                      <td className="px-2 py-2 text-muted-foreground">{r.date || '—'}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{money(r.amount)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}

          {!!data?.only_in_treasury.length && (
            <Card className="p-4 space-y-2">
              <h4 className="text-sm font-semibold">In treasury but not in KRA window ({data.only_in_treasury.length})</h4>
              <p className="text-xs text-muted-foreground">Verify these transmissions landed (or they fall outside the pull window).</p>
              <div className="flex flex-wrap gap-2">
                {data.only_in_treasury.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                    <span className="font-mono">{r.receipt_no}</span>
                    {r.source && <span className="text-muted-foreground">· {r.source}</span>}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
