'use client';

import { formatCurrency } from '@/lib/utils/currency';
import { useDeductionsSummary, useTaxProfile } from '@/hooks/use-tax';
import { formatDateRange } from '@/lib/utils/date';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildFlaggedExpenseColumns, type FlaggedExpenseRow } from './deduction-columns';
import { useMemo } from 'react';

interface Props { tenantSlug: string }

const label = 'text-xs text-muted-foreground';

function money(v?: string | number) {
  // Delegate to the shared 2-decimal formatter so tax figures never render 3-dp
  // artefacts (e.g. 275.862) from toLocaleString()'s default maximumFractionDigits.
  return formatCurrency(Number(v ?? 0));
}

/**
 * Deductions optimizer — "pay less tax legally". Shows deductible vs at-risk costs under
 * "No eTIMS, No Expense" (Jan 2026): costs lacking an eTIMS-validated supplier invoice are
 * disallowed until validated, and the card quantifies the extra tax exposure of not fixing them.
 */
export function DeductionsTab({ tenantSlug }: Props) {
  const { data, isLoading } = useDeductionsSummary(tenantSlug);
  const { data: profile } = useTaxProfile(tenantSlug);
  const showVAT = profile?.vat_registered ?? true; // input-VAT recovery only matters if VAT-registered
  const flaggedColumns = useMemo(() => buildFlaggedExpenseColumns(), []);
  const flaggedRows: FlaggedExpenseRow[] = useMemo(
    () => (data?.flagged ?? []).map((f, i) => ({ ...f, _key: `${f.reference}-${i}` })),
    [data],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">No expense data for this period.</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">
          Deductible expenses <span className="font-normal text-muted-foreground">({formatDateRange(data.period_start, data.period_end)})</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div><span className={label}>Deductible (eTIMS-validated)</span><div className="font-medium text-primary">{money(data.deductible_amount)}</div></div>
          <div><span className={label}>At risk (no eTIMS invoice)</span><div className="font-medium text-destructive">{money(data.at_risk_amount)}</div></div>
          <div><span className={label}>Non-deductible</span><div className="font-medium">{money(data.non_deductible_amount)}</div></div>
          {showVAT && <div><span className={label}>Recoverable input VAT</span><div className="font-medium">{money(data.recoverable_input_vat)}</div></div>}
          {showVAT && <div><span className={label}>Missed input VAT</span><div className="font-medium text-destructive">{money(data.missed_input_vat)}</div></div>}
          <div><span className={label}>Extra tax at risk (CIT {Number(data.cit_rate)}%)</span><div className="font-medium text-destructive">{money(data.estimated_tax_at_risk)}</div></div>
        </div>
        {data.notes?.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <h3 className="font-semibold text-sm">Income tax projection</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div><span className={label}>Business revenue</span><div className="font-medium">{money(data.taxable_revenue)}</div></div>
          <div><span className={label}>Less deductible costs</span><div className="font-medium">{money(data.deductible_amount)}</div></div>
          <div><span className={label}>Less capital allowances</span><div className="font-medium">{money(data.capital_allowance)}</div></div>
          <div><span className={label}>Estimated taxable profit</span><div className="font-medium">{money(data.estimated_taxable_profit)}</div></div>
          <div><span className={label}>Estimated CIT ({Number(data.cit_rate)}%)</span><div className="font-medium">{money(data.estimated_cit)}</div></div>
          <div><span className={label}>Potential saving if at-risk costs validated</span><div className="font-medium text-primary">{money(data.estimated_tax_at_risk)}</div></div>
        </div>
      </div>

      {data.flagged.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Flagged costs ({data.flagged.length})</h3>
          <DataTable columns={flaggedColumns} rows={flaggedRows} rowKey={(f) => f._key} storageKey="tax-deductions-flagged-table" />
        </div>
      )}
    </div>
  );
}
