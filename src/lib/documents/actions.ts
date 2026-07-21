// Centralized, per-document-type action policy. A single source of truth deciding which
// workflow actions are valid for a given document type + status, so every document page
// (and the detail view) gates its action menu consistently — e.g. credit notes, delivery
// notes and receipts never show Record Payment / Mark Paid / Generate Delivery Note, and
// quotations show Accept / Decline / Convert. Pages supply the actual handlers (runners);
// this module only decides visibility/ordering.

export type DocType =
  | 'invoice'
  | 'proforma_invoice'
  | 'credit_note'
  | 'debit_note'
  | 'sales_order'
  | 'delivery_challan'
  | 'payment_receipt'
  | 'subscription'
  | 'quotation';

export type ActionKey =
  | 'view_details'
  | 'view_public'
  | 'download_pdf'
  | 'edit'
  | 'submit_for_approval'
  | 'approve'
  | 'reject'
  | 'send'
  | 'record_payment'
  | 'view_payments'
  | 'mark_paid'
  | 'generate_delivery_note'
  | 'view_delivery_note'
  | 'create_credit_note'
  | 'view_credit_note'
  | 'create_debit_note'
  | 'view_debit_note'
  | 'generate_receipt'
  | 'view_receipt'
  | 'convert_to_invoice'
  | 'convert_to_proforma'
  | 'convert_to_sales_order'
  | 'accept'
  | 'decline'
  | 'duplicate'
  | 'void'
  | 'cancel'
  | 'delete';

export interface DocContext {
  status: string;
  payment_status?: string;
  /** Whether one or more credit notes already exist against this document (RelatedDocuments). */
  hasCreditNote?: boolean;
  /** Whether the credited amount already covers the full invoice total — payment/mark-paid
   *  no longer make sense once the supply has been fully reversed. */
  fullyCredited?: boolean;
  /** Whether a debit note already exists against this document. */
  hasDebitNote?: boolean;
  /** Whether a delivery note has already been generated for this document. */
  hasDeliveryNote?: boolean;
  /** Whether a payment receipt has already been generated for this document. */
  hasReceipt?: boolean;
}

const isVoided = (s: string) => s === 'void' || s === 'cancelled';
const isFinalized = (s: string) => s === 'sent' || s === 'paid' || s === 'overdue' || s === 'partially_paid';
// A document is ISSUED once it has cleared approval and become a real fiscal supply: approved (not
// yet emailed), sent, overdue, or partially paid. draft/pending_approval are NOT issued.
const isIssued = (s: string) => s === 'approved' || s === 'sent' || s === 'overdue' || s === 'partially_paid';
// Payments may only be recorded against an ISSUED, not-fully-paid document — never a draft or a
// document still awaiting approval sign-off.
const isPayable = (c: DocContext) => !isVoided(c.status) && isIssued(c.status) && c.payment_status !== 'paid';

/**
 * Ordered list of action keys valid for a document type + context. The order here is the
 * order rendered in the action menu. Pages filter their available runners against this.
 */
export function allowedActions(docType: DocType, ctx: DocContext): ActionKey[] {
  const out: ActionKey[] = ['view_details', 'view_public', 'download_pdf'];
  const draft = ctx.status === 'draft';
  const pendingApproval = ctx.status === 'pending_approval';
  // INVOICE-family Send is workflow-gated: an invoice/credit/debit note may only be sent once it
  // has cleared approval (status "approved") — never straight from draft or while pending sign-off.
  // Send doubles as "resend" for already-sent/overdue documents. Non-fiscal documents (quotations,
  // proformas, sales orders, delivery challans) need no approval and stay sendable from draft.
  const canSendInvoice = ctx.status === 'approved' || ctx.status === 'sent' || ctx.status === 'overdue';
  const canSend = draft || canSendInvoice;

  // A document can be edited while it is still a draft (the backend UpdateInvoice/
  // UpdateQuotation reject finalized documents); past that, status is managed via the
  // lifecycle actions below (send / record payment / mark paid / void / cancel).
  if (draft) out.push('edit');

  switch (docType) {
    case 'invoice':
    case 'subscription': {
      // Approval workflow: a draft can be submitted; a pending_approval invoice can be
      // approved/rejected. These gate on treasury.invoices.change|manage at the button.
      if (draft) out.push('submit_for_approval');
      if (pendingApproval) out.push('approve', 'reject');
      if (canSendInvoice) out.push('send');
      // A fully-credited invoice has had its entire supply reversed — collecting or marking a
      // reversed supply as paid would let the customer be charged for goods/services already
      // credited back. Never allowed regardless of status/payment_status.
      if (isPayable(ctx) && !ctx.fullyCredited) out.push('record_payment', 'mark_paid');
      // Recorded-payments history (view/edit/void per payment) once anything was collected —
      // but not on a voided document, which never held a real collectible payment worth viewing.
      if (!isVoided(ctx.status) && (ctx.payment_status === 'partial' || ctx.payment_status === 'paid' || ctx.status === 'paid')) {
        out.push('view_payments');
      }
      if (!isVoided(ctx.status)) {
        out.push(ctx.hasDeliveryNote ? 'view_delivery_note' : 'generate_delivery_note');
      }
      if (isFinalized(ctx.status)) {
        // A credit note already exists: link to it instead of re-offering "Create Credit Note",
        // UNLESS the prior credit note(s) didn't cover the full total (backend's own remainder
        // guard still enforces the cap — this just keeps the button visible while a remainder
        // exists so a genuine partial credit can still be raised).
        out.push(ctx.hasCreditNote && ctx.fullyCredited ? 'view_credit_note' : 'create_credit_note');
        out.push(ctx.hasDebitNote ? 'view_debit_note' : 'create_debit_note');
      }
      if (ctx.payment_status === 'paid' || ctx.status === 'paid') {
        out.push(ctx.hasReceipt ? 'view_receipt' : 'generate_receipt');
      }
      out.push('duplicate');
      if (!isVoided(ctx.status) && ctx.status !== 'paid') out.push('void');
      break;
    }
    case 'proforma_invoice': {
      if (canSend) out.push('send');
      out.push('convert_to_invoice', 'duplicate');
      if (!isVoided(ctx.status)) out.push('void');
      break;
    }
    case 'sales_order': {
      if (canSend) out.push('send');
      out.push('generate_delivery_note', 'duplicate');
      if (!isVoided(ctx.status)) out.push('void');
      break;
    }
    case 'credit_note':
    case 'debit_note': {
      if (canSend) out.push('send');
      out.push('duplicate');
      if (!isVoided(ctx.status)) out.push('void');
      if (draft) out.push('delete');
      break;
    }
    case 'delivery_challan': {
      // Goods-dispatch doc: no payment / no notes. Lifecycle only.
      out.push('duplicate');
      if (!isVoided(ctx.status)) out.push('void');
      if (draft) out.push('delete');
      break;
    }
    case 'payment_receipt': {
      // Already paid: no payment/send actions — only view, duplicate and lifecycle.
      out.push('duplicate');
      if (!isVoided(ctx.status)) out.push('void');
      if (draft) out.push('delete');
      break;
    }
    case 'quotation': {
      if (canSend) out.push('send');
      if (ctx.status === 'sent' || ctx.status === 'draft') out.push('accept', 'decline');
      out.push('convert_to_proforma', 'convert_to_sales_order', 'generate_delivery_note', 'duplicate');
      if (ctx.status !== 'converted' && !isVoided(ctx.status)) out.push('cancel');
      if (draft) out.push('delete');
      break;
    }
  }
  return out;
}
