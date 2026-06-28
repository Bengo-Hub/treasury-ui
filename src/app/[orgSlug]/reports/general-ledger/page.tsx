'use client';

import { useState } from 'react';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useTrialBalance } from '@/hooks/use-ledger';
import { ReportDocument } from '@/components/reports/ReportDocument';
import { ReportTable, type ReportTableSection, type ReportTableColumn, type ReportTableRow } from '@/components/reports/ReportTable';
import { money } from '@/components/charts/chart-theme';
import { FormField } from '@/components/ui/form-field';

const ACCOUNT_GROUPS: { key: string; title: string }[] = [
  { key: 'asset', title: 'Assets' },
  { key: 'liability', title: 'Liabilities' },
  { key: 'equity', title: 'Equity' },
  { key: 'revenue', title: 'Revenue' },
  { key: 'expense', title: 'Expenses' },
];

const columns: ReportTableColumn[] = [
  { header: 'Code', align: 'left', className: 'w-24' },
  { header: 'Account', align: 'left' },
  { header: 'Debit', align: 'right' },
  { header: 'Credit', align: 'right' },
];

const num = (v: string | number | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : v ?? 0;
  return Number.isFinite(n) ? n : 0;
};

/**
 * General Ledger report — the trial-balance view of every active account grouped by type, with
 * per-account debit/credit and a balanced check. Reuses ReportDocument/ReportTable so it prints and
 * exports CSV like every other financial statement. (Drill into a single account's running ledger
 * from Chart of Accounts → account.)
 */
export default function GeneralLedgerPage() {
  const { tenantPathId } = useResolvedTenant();
  const [asOf, setAsOf] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const { data: tb, isLoading } = useTrialBalance(tenantPathId, asOf);

  const sections: ReportTableSection[] = ACCOUNT_GROUPS.map((g) => {
    const rows: ReportTableRow[] = (tb?.rows ?? [])
      .filter((r) => r.account_type === g.key)
      .map((r) => ({
        cells: [
          r.account_code,
          r.account_name,
          num(r.debit) ? money(num(r.debit)) : '—',
          num(r.credit) ? money(num(r.credit)) : '—',
        ],
      }));
    return { title: g.title, rows };
  }).filter((s) => s.rows.length > 0);

  const grandTotal: ReportTableRow = {
    cells: ['', 'Total', money(num(tb?.total_debit)), money(num(tb?.total_credit))],
    grandTotal: true,
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="max-w-xs">
        <FormField label="As of date">
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-input text-foreground"
          />
        </FormField>
      </div>

      <ReportDocument
        title="General Ledger"
        periodLabel={`As at ${new Date(asOf).toLocaleDateString()}`}
        kpis={[
          { label: 'Total Debits', value: money(num(tb?.total_debit)), tone: 'primary' },
          { label: 'Total Credits', value: money(num(tb?.total_credit)), tone: 'primary' },
          {
            label: 'Books',
            value: tb?.is_balanced ? 'Balanced' : 'Out of balance',
            tone: tb?.is_balanced ? 'success' : 'destructive',
          },
        ]}
      >
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        ) : (
          <ReportTable columns={columns} sections={sections} grandTotal={grandTotal} />
        )}
      </ReportDocument>
    </div>
  );
}
