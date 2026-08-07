'use client';

// DataTable column definitions for the EntitlementsModal's per-service equity
// table — split out of page.tsx to mirror the vendors/expenses/budgets list
// convention.

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { EquityEntitlement } from '@/lib/api/equity';

export interface EntitlementColumnCallbacks {
  onDeactivate: (entitlement: EquityEntitlement) => void;
  deactivatePending: boolean;
}

export function buildEntitlementColumns(cb: EntitlementColumnCallbacks): DataTableColumn<EquityEntitlement>[] {
  return [
    { key: 'service_id', header: 'Service', primary: true, cellClassName: 'font-mono text-xs', accessor: (e) => e.service_id },
    {
      key: 'equity_pct', header: 'Equity %', align: 'right', sortable: true, mobileAction: true, cellClassName: 'font-bold',
      accessor: (e) => parseFloat(e.equity_pct), render: (e) => `${parseFloat(e.equity_pct).toFixed(2)}%`,
    },
    {
      key: 'vesting', header: 'Vesting', align: 'right', cellClassName: 'text-xs text-muted-foreground',
      accessor: (e) => e.vesting_type, render: (e) => `${e.vesting_type} ${e.cliff_months > 0 ? `(${e.cliff_months}m cliff)` : ''}`,
    },
    {
      key: 'is_active', header: 'Status', align: 'right', filterable: true,
      filterOptions: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
      accessor: (e) => String(e.is_active), render: (e) => <Badge variant={e.is_active ? 'success' : 'outline'}>{e.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions', header: '', align: 'right', exportable: false,
      render: (e) =>
        e.is_active ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => cb.onDeactivate(e)}
            disabled={cb.deactivatePending}
          >
            Deactivate
          </Button>
        ) : null,
    },
  ];
}
