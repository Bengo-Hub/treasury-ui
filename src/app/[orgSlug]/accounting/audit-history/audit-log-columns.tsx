'use client';

// DataTable column definitions for the Audit History list — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention. Read-only
// (no actions in the original div-list).

import { Badge } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { AuditLogEntry } from '@/lib/api/audit';

// Semantic-token tones per action (the codebase convention is semantic tokens, not raw colors).
export const actionColors: Record<string, string> = {
  create: 'bg-primary/10 text-primary border-primary/20',
  update: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  post: 'bg-green-500/10 text-green-600 border-green-500/20',
  approve: 'bg-primary/10 text-primary border-primary/20',
};

export function buildAuditLogColumns(): DataTableColumn<AuditLogEntry>[] {
  return [
    {
      key: 'action', header: 'Action', primary: true, sortable: true, filterable: true,
      accessor: (l) => l.action,
      render: (l) => <Badge className={actionColors[l.action.toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'}>{l.action}</Badge>,
    },
    { key: 'user_email', header: 'User', sortable: true, accessor: (l) => l.user_email },
    { key: 'resource_type', header: 'Resource', filterable: true, accessor: (l) => l.resource_type },
    {
      key: 'changes', header: 'Changes', mobileHidden: true, cellClassName: 'text-muted-foreground',
      accessor: (l) => l.changes ?? '', render: (l) => l.changes || 'No change details provided',
    },
    {
      key: 'created_at', header: 'Date', align: 'right', sortable: true, mobileAction: true, cellClassName: 'text-muted-foreground',
      accessor: (l) => l.created_at, render: (l) => new Date(l.created_at).toLocaleString(),
    },
  ];
}
