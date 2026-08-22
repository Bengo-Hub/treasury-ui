'use client';

// DataTable column definitions for the "Referral Performance" top-earners leaderboard — split out
// of page.tsx to mirror the service-revenue-columns.tsx / referral-columns.tsx convention.
// Read-only (no actions), like service-revenue-columns.tsx.

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { ReferralTopEarner } from '@/hooks/use-platform-analytics';
import { formatCurrency } from '@/lib/utils/currency';

export function buildReferralEarnerColumns(currency: string): DataTableColumn<ReferralTopEarner>[] {
  return [
    {
      key: 'holder_name', header: 'Holder', primary: true, sortable: true, cellClassName: 'font-medium',
      accessor: (r) => r.holder_name,
    },
    {
      key: 'referred_tenant', header: 'Referred Tenant', mobileHidden: true, cellClassName: 'text-xs truncate max-w-[160px]',
      // Never show the bare UUID when a resolved tenant name is available; fall back to a
      // truncated id (mirrors referral-columns.tsx's "Referred" column) rather than nothing.
      accessor: (r) => r.referred_tenant_name || r.referred_tenant_id || '',
      render: (r) =>
        r.referred_tenant_name ? (
          <span>{r.referred_tenant_name}</span>
        ) : r.referred_tenant_id ? (
          <span className="font-mono text-muted-foreground" title={r.referred_tenant_id}>{r.referred_tenant_id.slice(0, 8)}…</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'gross', header: 'Gross', align: 'right', sortable: true, cellClassName: 'font-bold',
      accessor: (r) => parseFloat(r.gross), render: (r) => formatCurrency(parseFloat(r.gross), currency),
    },
    {
      key: 'tax_withheld', header: 'Tax Withheld', align: 'right', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (r) => parseFloat(r.tax_withheld), render: (r) => formatCurrency(parseFloat(r.tax_withheld), currency),
    },
    {
      key: 'net', header: 'Net', align: 'right', sortable: true, mobileAction: true, cellClassName: 'font-bold text-emerald-600',
      accessor: (r) => parseFloat(r.net), render: (r) => formatCurrency(parseFloat(r.net), currency),
    },
  ];
}
