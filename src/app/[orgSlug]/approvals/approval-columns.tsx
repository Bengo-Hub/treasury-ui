'use client';

// DataTable column definitions for the Approvals inbox list — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention. The row
// click opens the approve/reject/OTP detail modal (unchanged) — this file
// only builds the summary columns, no action buttons live here.

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { ApprovalRequest } from '@/lib/api/approvals';
import { MODULE_LABEL, roleLabel } from '@/lib/documents/approvals';

export const APPROVAL_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'outline',
};

export function buildApprovalColumns(): DataTableColumn<ApprovalRequest>[] {
  return [
    {
      key: 'object_reference',
      header: 'Document',
      primary: true,
      sortable: true,
      accessor: (r) => r.object_reference || r.object_id,
      cellClassName: 'font-mono text-xs font-medium',
      render: (r) => r.object_reference || r.object_id.slice(0, 8),
    },
    {
      key: 'module',
      header: 'Type',
      filterable: true,
      filterOptions: Object.entries(MODULE_LABEL).map(([value, label]) => ({ value, label })),
      accessor: (r) => r.module,
      render: (r) => MODULE_LABEL[r.module] ?? r.module,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      mobileAction: true,
      cellClassName: 'tabular-nums',
      accessor: (r) => r.amount,
      render: (r) => r.amount.toLocaleString(),
    },
    {
      key: 'awaiting',
      header: 'Awaiting',
      mobileHidden: true,
      cellClassName: 'text-muted-foreground',
      accessor: (r) => (r.status === 'pending' && r.current_step ? r.current_step.name : ''),
      render: (r) =>
        r.status === 'pending' && r.current_step
          ? `${r.current_step.name} · ${roleLabel(r.current_step.approver_role)}`
          : '—',
    },
    {
      key: 'status',
      header: 'Status',
      filterable: true,
      filterOptions: Object.keys(APPROVAL_STATUS_VARIANT).map((value) => ({ value })),
      accessor: (r) => r.status,
      render: (r) => <Badge variant={APPROVAL_STATUS_VARIANT[r.status] ?? 'default'}>{r.status}</Badge>,
    },
  ];
}
