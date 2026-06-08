import type { ReactNode } from 'react';
import { allowedActions, type ActionKey, type DocType } from '@/lib/documents/actions';
import type { DocAction, DocumentRow } from '@/components/documents/SharedDocumentList';

export interface ActionRunner {
  label: string;
  icon: ReactNode;
  onClick: (row: DocumentRow) => void;
  destructive?: boolean;
}

/**
 * Binds a page's action handlers (runners) to the centralized per-document-type policy
 * (lib/documents/actions.ts). Each runner becomes a DocAction whose `visible` is decided
 * by `allowedActions(docType, row)`, so the same row only shows actions valid for its type
 * + status. SharedDocumentList already filters by `visible`, so no list changes are needed.
 * Only keys present in `runners` are rendered — a page supplies handlers for the actions it
 * implements.
 */
export function useDocumentActions(
  docType: DocType,
  runners: Partial<Record<ActionKey, ActionRunner>>,
): DocAction[] {
  return (Object.entries(runners) as [ActionKey, ActionRunner][]).map(([key, r]) => ({
    label: r.label,
    icon: r.icon,
    destructive: r.destructive,
    onClick: r.onClick,
    visible: (row: DocumentRow) =>
      allowedActions(docType, { status: row.status, payment_status: row.payment_status }).includes(key),
  }));
}
