'use client';

import { Badge, Card } from '@/components/ui/base';
import { StatCard } from '@/components/charts/StatCard';
import { StatusBanner } from '@/components/tax/kra-cards';
import { money } from '@/components/charts/chart-theme';
import { useEtimsReconciliation, useImportEtimsTransactions, useVAAReconciliation, useImportedEtimsTxns } from '@/hooks/use-tax';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildImportedEtimsColumns, buildOnlyInKraColumns } from './etims-sync-columns';
import { AlertTriangle, CheckCircle2, DownloadCloud, Loader2, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';

interface Props { tenantSlug: string }

/**
 * EtimsSyncTab — reconciles treasury's recorded transmissions against what KRA eTIMS actually
 * holds (selectTrnsSalesList). For a newly-onboarded business this confirms the books are in sync
 * with eTIMS before filing, and surfaces sales KRA has that treasury doesn't (pre-onboarding
 * history / another device) so they can be accounted for without re-transmission.
 */
export function EtimsSyncTab({ tenantSlug }: Props) {
  const { data, isLoading, isFetching, refetch } = useEtimsReconciliation(tenantSlug);
  const { data: vaa } = useVAAReconciliation(tenantSlug);
  const { data: imported } = useImportedEtimsTxns(tenantSlug);
  const importTxns = useImportEtimsTransactions();
  const inSync = data?.in_sync;
  const importedRows = imported?.items ?? [];
  const onlyInKraColumns = useMemo(() => buildOnlyInKraColumns(), []);
  const onlyInKraRows = useMemo(
    () => (data?.only_in_kra ?? []).map((r, i) => ({ ...r, _key: `${r.receipt_no}-${i}` })),
    [data],
  );
  const importedColumns = useMemo(() => buildImportedEtimsColumns(), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">eTIMS reconciliation</h3>
          <p className="text-xs text-muted-foreground">Pull your history from KRA and reconcile your books against it.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => importTxns.mutate({ tenantSlug })} disabled={importTxns.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {importTxns.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}Import from KRA
          </button>
          <button onClick={() => refetch()} disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent/10 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />Re-check
          </button>
        </div>
      </div>

      {/* VAA (buyer-side input-VAT) reconciliation */}
      {vaa && (vaa.imported_purchases > 0 || vaa.imported_sales > 0) && (
        <Card className={`p-4 ${vaa.overclaim_risk ? 'border-amber-500/40 bg-amber-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${vaa.overclaim_risk ? 'bg-amber-500/15 text-amber-600' : 'bg-green-500/15 text-green-600'}`}>
              {vaa.overclaim_risk ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div className="flex-1 space-y-2 text-sm">
              <p className="font-semibold">VAA input-VAT check {vaa.overclaim_risk ? '— over-claim risk' : '— within tolerance'}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Input VAT — KRA (suppliers)" value={money(vaa.kra_input_vat)} tone="default" hint={`${vaa.imported_purchases} purchases imported`} />
                <StatCard label="Input VAT — your books" value={money(vaa.treasury_input_vat)} tone="default" hint="Trailing 12 months" />
                <StatCard label="Variance (books − KRA)" value={money(vaa.input_vat_variance)} tone={vaa.overclaim_risk ? 'warning' : 'success'} />
              </div>
              {vaa.imported_purchases > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">{vaa.matched_purchases} matched to bills</Badge>
                  {vaa.unmatched_purchases > 0 && <Badge variant="warning">{vaa.unmatched_purchases} unrecorded (possible missed input VAT)</Badge>}
                </div>
              )}
              {vaa.notes.map((n, i) => <p key={i} className="text-muted-foreground">{n}</p>)}
            </div>
          </div>
        </Card>
      )}

      {!isLoading && data && !data.configured ? (
        <Card className="p-4 text-sm text-muted-foreground">
          No active eTIMS device for this tenant — register and initialize a device to reconcile with KRA.
        </Card>
      ) : (
        <>
          {!isLoading && data && (
            <StatusBanner tone={inSync ? 'success' : 'warning'} title={inSync ? 'In sync with KRA eTIMS' : 'Out of sync with KRA eTIMS'}>
              {data.notes.map((n, i) => <p key={i}>{n}</p>)}
            </StatusBanner>
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
              <DataTable columns={onlyInKraColumns} rows={onlyInKraRows} rowKey={(r) => r._key} storageKey="etims-sync-only-in-kra-table" />
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

          {/* Imported transactions from KRA — capped at 100 rows, same as before. */}
          {importedRows.length > 0 && (
            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-semibold">Imported from KRA ({importedRows.length})</h4>
              <DataTable columns={importedColumns} rows={importedRows.slice(0, 100)} rowKey={(t) => t.id} storageKey="etims-sync-imported-table" showExportCsv exportFileName="etims-imported" />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
