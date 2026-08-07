'use client';

// DataTable column definitions for the Approval Rules list — split out of
// page.tsx to mirror the vendors/expenses/budgets list convention.

import { Badge, Button } from '@/components/ui/base';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import type { ApprovalRule } from '@/lib/api/approvals';
import { MODULE_LABEL, roleLabel } from '@/lib/documents/approvals';
import { Trash2 } from 'lucide-react';

export function band(rule: ApprovalRule): string {
  const min = rule.min_amount.toLocaleString();
  return rule.max_amount != null ? `${min} – ${rule.max_amount.toLocaleString()}` : `${min} and above`;
}

export interface ApprovalRuleColumnCallbacks {
  onEdit: (rule: ApprovalRule) => void;
  onDelete: (rule: ApprovalRule) => void;
  canChange: boolean;
  canDelete: boolean;
}

export function buildApprovalRuleColumns(cb: ApprovalRuleColumnCallbacks): DataTableColumn<ApprovalRule>[] {
  return [
    {
      key: 'name',
      header: 'Rule',
      primary: true,
      sortable: true,
      accessor: (r) => r.name,
      cellClassName: 'font-medium',
    },
    {
      key: 'module',
      header: 'Module',
      filterable: true,
      filterOptions: Object.entries(MODULE_LABEL).map(([value, label]) => ({ value, label })),
      accessor: (r) => r.module,
      render: (r) => MODULE_LABEL[r.module] ?? r.module,
    },
    {
      key: 'amount_band',
      header: 'Amount Band',
      cellClassName: 'tabular-nums',
      accessor: (r) => r.min_amount,
      render: (r) => band(r),
    },
    {
      key: 'steps',
      header: 'Steps',
      mobileHidden: true,
      accessor: (r) => r.steps.length,
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.steps.map((s) => (
            <Badge key={s.id ?? s.sequence} variant="outline">{s.sequence}. {roleLabel(s.approver_role)}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Active',
      filterable: true,
      filterOptions: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
      accessor: (r) => String(r.is_active),
      render: (r) => <Badge variant={r.is_active ? 'success' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      exportable: false,
      mobileAction: true,
      render: (rule) => (
        <div className="flex items-center justify-end gap-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {cb.canChange && (
            <Button variant="ghost" size="sm" onClick={() => cb.onEdit(rule)}>Edit</Button>
          )}
          {cb.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Delete rule"
              className="text-destructive hover:text-destructive"
              onClick={() => cb.onDelete(rule)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];
}
