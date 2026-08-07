'use client';

// DataTable column definitions for the platform-wide Audit Log list — split
// out of page.tsx to mirror the vendors/expenses/budgets list convention.
// Read-only (no actions in the original).

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { AuditLogEntry } from '@/lib/api/audit';

export const actionVariant: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  create: 'success',
  update: 'default',
  delete: 'error',
  approve: 'success',
  reject: 'error',
};

export function buildPlatformAuditLogColumns(): DataTableColumn<AuditLogEntry>[] {
  return [
    {
      key: 'created_at', header: 'Time', primary: true, sortable: true, cellClassName: 'text-muted-foreground whitespace-nowrap',
      accessor: (e) => e.created_at, render: (e) => new Date(e.created_at).toLocaleString(),
    },
    {
      key: 'user_email', header: 'User', sortable: true, accessor: (e) => e.user_email,
      render: (e) => (
        <>
          <div className="text-xs font-medium">{e.user_email}</div>
          <div className="text-xs text-muted-foreground font-mono">{e.user_id.slice(0, 8)}…</div>
        </>
      ),
    },
    {
      key: 'action', header: 'Action', align: 'center', mobileAction: true, filterable: true,
      accessor: (e) => e.action, render: (e) => <Badge variant={actionVariant[e.action] ?? 'default'}>{e.action}</Badge>,
    },
    {
      key: 'resource_type', header: 'Resource', cellClassName: 'capitalize', filterable: true,
      accessor: (e) => e.resource_type, render: (e) => e.resource_type.replace(/_/g, ' '),
    },
    {
      key: 'resource_id', header: 'Resource ID', mobileHidden: true, cellClassName: 'font-mono text-xs text-muted-foreground',
      accessor: (e) => e.resource_id, render: (e) => `${e.resource_id.slice(0, 16)}${e.resource_id.length > 16 ? '…' : ''}`,
    },
    {
      key: 'ip_address', header: 'IP', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (e) => e.ip_address ?? '', render: (e) => e.ip_address ?? '—',
    },
    {
      key: 'changes', header: 'Changes', mobileHidden: true, cellClassName: 'text-muted-foreground max-w-xs truncate',
      accessor: (e) => e.changes ?? '',
      render: (e) =>
        e.changes ? (
          <span title={e.changes} className="cursor-help">
            {e.changes.slice(0, 60)}{e.changes.length > 60 ? '…' : ''}
          </span>
        ) : '—',
    },
  ];
}
