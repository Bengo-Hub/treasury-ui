'use client';

import { useDeductionsSummary } from '@/hooks/use-tax';

interface Props { tenantSlug: string }

const label = 'text-xs text-muted-foreground';

function money(v?: string) {
  return `KES ${Number(v ?? 0).toLocaleString()}`;
}

/**
 * Deductions optimizer — "pay less tax legally". Shows deductible vs at-risk costs under
 * "No eTIMS, No Expense" (Jan 2026): costs lacking an eTIMS-validated supplier invoice are
 * disallowed until validated, and the card quantifies the extra tax exposure of not fixing them.
 */
export function DeductionsTab({ tenantSlug }: Props) {
  const { data, isLoading } = useDeductionsSummary(tenantSlug);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">No expense data for this period.</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">
          Deductible expenses <span className="font-normal text-muted-foreground">({data.period_start} → {data.period_end})</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div><span className={label}>Deductible (eTIMS-validated)</span><div className="font-medium text-primary">{money(data.deductible_amount)}</div></div>
          <div><span className={label}>At risk (no eTIMS invoice)</span><div className="font-medium text-destructive">{money(data.at_risk_amount)}</div></div>
          <div><span className={label}>Non-deductible</span><div className="font-medium">{money(data.non_deductible_amount)}</div></div>
          <div><span className={label}>Recoverable input VAT</span><div className="font-medium">{money(data.recoverable_input_vat)}</div></div>
          <div><span className={label}>Missed input VAT</span><div className="font-medium text-destructive">{money(data.missed_input_vat)}</div></div>
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
          <table className="w-full text-sm border">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Issue</th>
              </tr>
            </thead>
            <tbody>
              {data.flagged.map((f, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{f.date}</td>
                  <td className="px-3 py-2">{f.reference}</td>
                  <td className="px-3 py-2">{f.description}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{money(f.amount)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
