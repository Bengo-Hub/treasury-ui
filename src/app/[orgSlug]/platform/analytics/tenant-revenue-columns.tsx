'use client';

// DataTable column definitions for the "Revenue by Tenant" table, following
// service-revenue-columns.tsx. The one action verifies the tenant's payout destination.

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { TenantRevenue } from '@/hooks/use-platform-analytics';
import { Button } from '@/components/ui/base';
import { formatCurrency } from '@/lib/utils/currency';
import { ShieldCheck } from 'lucide-react';

export function buildTenantRevenueColumns(onVerifyPayout?: (r: TenantRevenue) => void): DataTableColumn<TenantRevenue>[] {
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
    ...(onVerifyPayout ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (r: TenantRevenue) => (
        <Button variant="ghost" size="sm" className="h-7 px-2" title="Verify this tenant's payout destination" onClick={() => onVerifyPayout(r)}>
          <ShieldCheck className="h-4 w-4 mr-1" /> Verify payout
        </Button>
      ),
    }] : []),
  ];
}
