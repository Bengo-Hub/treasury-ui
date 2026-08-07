'use client';

// DataTable column definitions for the Deductions tab's "Flagged costs" table
// — split out of deductions-tab.tsx to mirror the vendors/expenses/budgets
// list convention. Read-only (no actions in the original).

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { FlaggedExpense } from '@/lib/api/tax';
import { formatCurrency } from '@/lib/utils/currency';

/** A flagged expense plus a stable synthetic row key (the API gives no line id). */
export type FlaggedExpenseRow = FlaggedExpense & { _key: string };

export function buildFlaggedExpenseColumns(): DataTableColumn<FlaggedExpenseRow>[] {
  return [
    { key: 'date', header: 'Date', primary: true, sortable: true, accessor: (f) => f.date },
    { key: 'reference', header: 'Reference', accessor: (f) => f.reference },
    { key: 'description', header: 'Description', mobileHidden: true, accessor: (f) => f.description },
    {
      key: 'amount', header: 'Amount', align: 'right', sortable: true, mobileAction: true,
      accessor: (f) => Number(f.amount), render: (f) => formatCurrency(Number(f.amount)),
    },
    { key: 'reason', header: 'Issue', cellClassName: 'text-muted-foreground', accessor: (f) => f.reason },
  ];
}
