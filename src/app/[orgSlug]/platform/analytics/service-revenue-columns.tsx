'use client';

// DataTable column definitions for the "Revenue by Ecosystem Service" table —
// split out of page.tsx to mirror the vendors/expenses/budgets list convention.
// Read-only (no actions in the original).

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { ServiceRevenue } from '@/hooks/use-platform-analytics';
import { formatCurrency } from '@/lib/utils/currency';

export function buildServiceRevenueColumns(): DataTableColumn<ServiceRevenue>[] {
  return [
    {
      key: 'source_service', header: 'Service', primary: true, sortable: true, cellClassName: 'font-medium capitalize',
      accessor: (r) => r.source_service, render: (r) => r.source_service.replace(/_/g, ' '),
    },
    {
      key: 'gross_revenue', header: 'Gross Revenue', align: 'right', sortable: true, cellClassName: 'font-bold',
      accessor: (r) => parseFloat(r.gross_revenue), render: (r) => formatCurrency(parseFloat(r.gross_revenue), 'KES'),
    },
    {
      key: 'transaction_costs', header: 'Fees', align: 'right', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (r) => parseFloat(r.transaction_costs), render: (r) => formatCurrency(parseFloat(r.transaction_costs), 'KES'),
    },
    {
      key: 'net_revenue', header: 'Net Revenue', align: 'right', sortable: true, mobileAction: true, cellClassName: 'font-bold text-emerald-600',
      accessor: (r) => parseFloat(r.net_revenue), render: (r) => formatCurrency(parseFloat(r.net_revenue), 'KES'),
    },
    {
      key: 'transaction_count', header: 'Transactions', align: 'right', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (r) => r.transaction_count,
    },
  ];
}
