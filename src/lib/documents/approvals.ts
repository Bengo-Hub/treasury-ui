/**
 * Shared labels + role helpers for the centralized treasury Approvals UI.
 * Kept in one place so the inbox, rules editor and per-document approval card
 * stay in sync (mirrors inventory-ui's MODULE_LABEL / ROLE_LABEL pattern).
 */

import type { ApprovalModule } from '@/lib/api/approvals';
import type { DocType } from '@/lib/documents/actions';

export const MODULE_LABEL: Record<string, string> = {
  invoice: 'Invoice',
  expense: 'Expense',
  bill: 'Bill (Payable)',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  payment: 'Payment',
  quotation: 'Quotation',
  proforma_invoice: 'Proforma Invoice',
  sales_order: 'Sales Order',
  journal_entry: 'Journal Entry',
};

export const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'treasury_admin', label: 'Treasury Admin' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'approver', label: 'Approver' },
  { value: 'viewer', label: 'Viewer' },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

export function roleLabel(code: string): string {
  return ROLE_LABEL[code] ?? code;
}

/** Map a treasury document type to its approval module, when one applies. */
export function moduleForDocType(docType: DocType | string): ApprovalModule | undefined {
  switch (docType) {
    case 'invoice':
    case 'standard':
    case 'subscription':
      return 'invoice';
    case 'expense':
      return 'expense';
    case 'bill':
      return 'bill';
    case 'credit_note':
      return 'credit_note';
    case 'debit_note':
      return 'debit_note';
    case 'payment':
      return 'payment';
    case 'quotation':
      return 'quotation';
    case 'proforma':
    case 'proforma_invoice':
      return 'proforma_invoice';
    case 'sales_order':
      return 'sales_order';
    default:
      return undefined;
  }
}
