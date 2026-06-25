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
  payout: 'Payout',
  journal_entry: 'Journal Entry',
  budget: 'Budget',
  vendor_bill: 'Vendor Bill',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  quotation: 'Quotation',
};

// Role codes MUST match the treasury-api seeded roles (rbac seed): a rule step's approver_role is
// checked against the acting user's roles at approval time.
export const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'treasury_admin', label: 'Treasury Admin' },
  { value: 'finance_admin', label: 'Finance Admin' },
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
    case 'vendor_bill':
      return 'vendor_bill';
    case 'credit_note':
      return 'credit_note';
    case 'debit_note':
      return 'debit_note';
    case 'payment':
    case 'payout':
      return 'payout';
    case 'quotation':
      return 'quotation';
    case 'budget':
      return 'budget';
    case 'journal':
    case 'journal_entry':
      return 'journal_entry';
    // proforma invoices are an invoice variant; sales orders have no treasury approval module.
    case 'proforma':
    case 'proforma_invoice':
      return 'invoice';
    default:
      return undefined;
  }
}
