'use client';

// DataTable column definitions for the "Revenue by Tenant" table — mirrors
// service-revenue-columns.tsx's convention. Read-only (no actions).

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { TenantRevenue } from '@/hooks/use-platform-analytics';
import { formatCurrency } from '@/lib/utils/currency';

export function buildTenantRevenueColumns(): DataTableColumn<TenantRevenue>[] {
  return [
    {
      key: 'tenant_name',
      header: 'Tenant',
      primary: true,
      sortable: true,
      cellClassName: 'font-medium',
      accessor: (r) => r.tenant_name || r.tenant_slug || r.tenant_id,
      render: (r) => {
        const label = r.tenant_name || r.tenant_slug || r.tenant_id;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0 uppercase">
              {label.slice(0, 2)}
            </div>
            <span className="truncate">{label}</span>
          </div>
        );
      },
    },
    {
      key: 'gmv',
      header: 'GMV',
      align: 'right',
      sortable: true,
      cellClassName: 'font-bold',
      accessor: (r) => parseFloat(r.gmv || r.total_revenue),
      render: (r) => formatCurrency(parseFloat(r.gmv || r.total_revenue), 'KES'),
    },
    {
      key: 'commission',
      header: 'Commission',
      align: 'right',
      mobileHidden: true,
      cellClassName: 'text-muted-foreground',
      accessor: (r) => parseFloat(r.commission || '0'),
      render: (r) => formatCurrency(parseFloat(r.commission || '0'), 'KES'),
    },
    {
      key: 'net_payable',
      header: 'Net Payable',
      align: 'right',
      sortable: true,
      mobileAction: true,
      cellClassName: 'font-bold text-emerald-600',
      accessor: (r) => parseFloat(r.net_payable || '0'),
      render: (r) => formatCurrency(parseFloat(r.net_payable || '0'), 'KES'),
    },
    {
      key: 'transaction_count',
      header: 'Transactions',
      align: 'right',
      sortable: true,
      mobileHidden: true,
      cellClassName: 'text-muted-foreground',
      accessor: (r) => r.transaction_count,
    },
  ];
}
