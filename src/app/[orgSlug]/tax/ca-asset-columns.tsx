'use client';

// DataTable column definitions for the Capital Allowances tab's asset
// register table — split out of capital-allowances-tab.tsx to mirror the
// vendors/expenses/budgets list convention.

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { CAAsset, CAClassOption } from '@/lib/api/tax';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

function money(v?: string | number) {
  return formatCurrency(Number(v ?? 0));
}

const field = 'rounded border px-3 py-2 text-sm';

export interface CAAssetColumnCallbacks {
  classes: CAClassOption[];
  onClassify: (asset: CAAsset, classCode: string) => void;
  classifyPending: boolean;
  onRemove: (asset: CAAsset) => void;
}

export function buildCAAssetColumns(cb: CAAssetColumnCallbacks): DataTableColumn<CAAsset>[] {
  return [
    {
      key: 'name', header: 'Name', primary: true, sortable: true, accessor: (a) => a.name,
      render: (a) => (
        <>
          {a.name}
          {a.source_asset_id && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">from inventory</span>
          )}
        </>
      ),
    },
    {
      key: 'ca_class_code', header: 'Class', cellClassName: 'text-muted-foreground', accessor: (a) => a.ca_class_code || 'UNCLASSIFIED',
      render: (a) => {
        const unclassified = a.ca_class_code === 'UNCLASSIFIED' || !a.ca_class_code;
        if (!unclassified) return a.ca_class_code;
        return (
          <select
            className={cn(field, 'py-1 border-yellow-500/60')}
            defaultValue=""
            disabled={cb.classifyPending}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { if (e.target.value) cb.onClassify(a, e.target.value); }}
          >
            <option value="">Classify…</option>
            {cb.classes.map((c) => <option key={c.code} value={c.code}>{c.name} ({Number(c.rate)}%)</option>)}
          </select>
        );
      },
    },
    {
      key: 'cost', header: 'Cost', align: 'right', sortable: true, mobileAction: true, cellClassName: 'tabular-nums',
      accessor: (a) => Number(a.cost), render: (a) => money(a.cost),
    },
    {
      key: 'written_down_value', header: 'WDV', align: 'right', sortable: true, mobileHidden: true, cellClassName: 'tabular-nums',
      accessor: (a) => Number(a.written_down_value), render: (a) => money(a.written_down_value),
    },
    {
      key: 'purchase_date', header: 'Purchased', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (a) => a.purchase_date ?? '', render: (a) => a.purchase_date?.slice(0, 10),
    },
    {
      key: 'actions', header: '', align: 'right', exportable: false,
      render: (a) => (
        <button className="text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); cb.onRemove(a); }}>
          Remove
        </button>
      ),
    },
  ];
}
