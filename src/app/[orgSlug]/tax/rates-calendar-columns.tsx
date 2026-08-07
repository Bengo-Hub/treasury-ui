'use client';

// DataTable column definitions for the Rates & Calendar tab's statutory rates
// table — split out of rates-calendar-tab.tsx to mirror the vendors/expenses/
// budgets list convention. Read-only reference data (no actions).

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { StatutoryRate } from '@/lib/api/tax';

function rateLabel(rate: number | string, rateType: string): string {
  const n = Number(rate);
  if (rateType === 'percent' || rateType === 'percentage') return `${n}%`;
  if (rateType === 'fixed' || rateType === 'amount') return `KES ${n.toLocaleString()}`;
  return String(rate);
}

export function buildStatutoryRateColumns(): DataTableColumn<StatutoryRate & { _key: string }>[] {
  return [
    {
      key: 'category', header: 'Category', filterable: true, accessor: (r) => r.category,
      render: (r) => <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase">{r.category}</span>,
    },
    {
      key: 'name', header: 'Name', primary: true, sortable: true, accessor: (r) => r.name,
      render: (r) => (
        <>
          {r.name}
          {r.notes && <span className="block text-xs text-muted-foreground">{r.notes}</span>}
        </>
      ),
    },
    {
      key: 'rate', header: 'Rate', align: 'right', sortable: true, mobileAction: true, cellClassName: 'font-medium tabular-nums',
      accessor: (r) => Number(r.rate), render: (r) => rateLabel(r.rate, r.rate_type),
    },
    { key: 'filing_frequency', header: 'Frequency', mobileHidden: true, cellClassName: 'text-muted-foreground', accessor: (r) => r.filing_frequency ?? '', render: (r) => r.filing_frequency || '—' },
    {
      key: 'effective_from', header: 'Effective', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (r) => r.effective_from ?? '', render: (r) => (r.effective_from ? new Date(r.effective_from).toLocaleDateString() : '—'),
    },
  ];
}
