import type { ReactNode } from 'react';
import { allowedActions, type ActionKey, type DocType, type DocContext } from '@/lib/documents/actions';
import type { DocAction, DocumentRow } from '@/components/documents/SharedDocumentList';
import type { RelatedDocuments } from '@/lib/api/invoices';

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
    visible: (row: DocumentRow) => allowedActions(docType, docContextFromRow(row)).includes(key),
  }));
}

/** Minimal shape both a list DocumentRow and a full Invoice/Quotation satisfy. */
interface RelatedDocsSource {
  status: string;
  payment_status?: string;
  total_amount: string;
  related_documents?: RelatedDocuments;
}

/**
 * Builds the centralized policy's DocContext from any row/detail object carrying a
 * RelatedDocuments summary — the ONE place that turns "does a credit note/receipt/delivery
 * note already exist" into the gating flags actions.ts consumes. Used by both the list
 * (useDocumentActions above) and the invoice detail page, so the two never diverge.
 */
export function docContextFromRow(row: RelatedDocsSource): DocContext {
  const rd = row.related_documents;
  const total = parseFloat(row.total_amount) || 0;
  const credited = parseFloat(rd?.credited_amount || '0') || 0;
  return {
    status: row.status,
    payment_status: row.payment_status,
    hasCreditNote: !!rd?.credit_note_ids?.length,
    fullyCredited: !!rd?.fully_credited || (!!rd?.credit_note_ids?.length && total > 0 && credited >= total),
    hasDebitNote: !!rd?.debit_note_ids?.length,
    hasDeliveryNote: !!rd?.delivery_note_id,
    hasReceipt: !!rd?.receipt_id,
  };
}
