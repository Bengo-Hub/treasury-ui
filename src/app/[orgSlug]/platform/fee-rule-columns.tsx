'use client';

// DataTable column definitions for the Platform Configuration page's Fee
// Structures table — split out of page.tsx to mirror the vendors/expenses/
// budgets list convention.

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { FeeRule } from '@/lib/api/fee-rules';
import { MoreVertical } from 'lucide-react';

export const FEE_GATEWAY_LABELS: Record<string, string> = {
  paystack: 'Paystack',
  mpesa_paybill: 'M-Pesa Paybill',
  mpesa_till: 'M-Pesa Till',
  cod: 'Cash on Delivery',
  all: 'All Gateways',
};

export const FEE_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  fixed: 'Fixed',
  tiered: 'Tiered',
};

export interface FeeRuleColumnCallbacks {
  feeMenuOpen: string | null;
  onToggleMenu: (id: string | null) => void;
  onEdit: (rule: FeeRule) => void;
  onToggleActive: (rule: FeeRule) => void;
}

export function buildFeeRuleColumns(cb: FeeRuleColumnCallbacks): DataTableColumn<FeeRule>[] {
  return [
    {
      key: 'gateway_type', header: 'Gateway', primary: true, sortable: true, cellClassName: 'font-medium text-xs',
      accessor: (r) => r.gateway_type, render: (r) => FEE_GATEWAY_LABELS[r.gateway_type] || r.gateway_type,
    },
    {
      key: 'fee_type', header: 'Fee Type', accessor: (r) => r.fee_type,
      render: (r) => <Badge variant="default">{FEE_TYPE_LABELS[r.fee_type] || r.fee_type}</Badge>,
    },
    {
      key: 'percentage', header: 'Percentage', cellClassName: 'text-xs', accessor: (r) => r.percentage ?? '',
      render: (r) => (r.percentage ? `${r.percentage}%` : '-'),
    },
    {
      key: 'fixed_amount', header: 'Fixed Amount', mobileHidden: true, cellClassName: 'text-xs', accessor: (r) => r.fixed_amount ?? '',
      render: (r) => (r.fixed_amount ? `${r.currency} ${r.fixed_amount}` : '-'),
    },
    {
      key: 'min_max', header: 'Min / Max', mobileHidden: true, cellClassName: 'text-xs text-muted-foreground',
      accessor: (r) => r.min_amount ?? '',
      render: (r) =>
        r.min_amount || r.max_amount
          ? `${r.min_amount ? `${r.currency} ${r.min_amount}` : '-'} / ${r.max_amount ? `${r.currency} ${r.max_amount}` : '-'}`
          : '-',
    },
    {
      key: 'is_active', header: 'Status', mobileAction: true, filterable: true,
      filterOptions: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
      accessor: (r) => String(r.is_active),
      render: (r) => <Badge variant={r.is_active ? 'success' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions', header: '', align: 'right', exportable: false,
      render: (rule) => (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => cb.onToggleMenu(cb.feeMenuOpen === rule.id ? null : rule.id)}
            className="p-1 rounded hover:bg-accent"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {cb.feeMenuOpen === rule.id && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-accent"
                onClick={() => { cb.onEdit(rule); cb.onToggleMenu(null); }}
              >
                Edit
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-accent"
                onClick={() => { cb.onToggleActive(rule); cb.onToggleMenu(null); }}
              >
                {rule.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];
}
