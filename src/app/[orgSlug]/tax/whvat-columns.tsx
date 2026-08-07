'use client';

// DataTable column definitions for the WHVAT tab's certificates table — split
// out of whvat-tab.tsx to mirror the vendors/expenses/budgets list convention.

import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { WHVATCertificate } from '@/lib/api/tax';
import { money } from '@/components/charts/chart-theme';
import { Trash2 } from 'lucide-react';

export interface WhvatColumnCallbacks {
  onDelete: (cert: WHVATCertificate) => void;
  deletePending: boolean;
}

export function buildWhvatColumns(cb: WhvatColumnCallbacks): DataTableColumn<WHVATCertificate>[] {
  return [
    { key: 'certificate_no', header: 'Certificate', primary: true, sortable: true, cellClassName: 'font-mono text-xs', accessor: (c) => c.certificate_no },
    {
      key: 'withholder', header: 'Withholder', accessor: (c) => c.withholder_name || c.withholder_pin || '',
      render: (c) => c.withholder_name || c.withholder_pin || '—',
    },
    {
      key: 'cert_date', header: 'Date', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (c) => c.cert_date ?? '', render: (c) => (c.cert_date ? new Date(c.cert_date).toLocaleDateString() : '—'),
    },
    {
      key: 'withheld_amount', header: 'Withheld', align: 'right', sortable: true, mobileAction: true, cellClassName: 'font-medium tabular-nums',
      accessor: (c) => Number(c.withheld_amount), render: (c) => money(Number(c.withheld_amount)),
    },
    {
      key: 'actions', header: '', align: 'right', exportable: false,
      render: (cert) => (
        <button
          onClick={(e) => { e.stopPropagation(); cb.onDelete(cert); }}
          disabled={cb.deletePending}
          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];
}
