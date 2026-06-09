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
  | 'send'
  | 'record_payment'
  | 'mark_paid'
  | 'generate_delivery_note'
  | 'create_credit_note'
  | 'create_debit_note'
  | 'generate_receipt'
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
}

const isVoided = (s: string) => s === 'void' || s === 'cancelled';
const isFinalized = (s: string) => s === 'sent' || s === 'paid' || s === 'overdue' || s === 'partially_paid';
const isPayable = (c: DocContext) =>
  !isVoided(c.status) && c.payment_status !== 'paid' && (c.payment_status === 'unpaid' || c.payment_status === 'partial' || c.status === 'sent' || c.status === 'overdue');

/**
 * Ordered list of action keys valid for a document type + context. The order here is the
 * order rendered in the action menu. Pages filter their available runners against this.
 */
export function allowedActions(docType: DocType, ctx: DocContext): ActionKey[] {
  const out: ActionKey[] = ['view_details', 'view_public', 'download_pdf'];
  const draft = ctx.status === 'draft';
  // Send doubles as "resend": the backend re-emails the customer on sent→sent, so the
  // action stays available for sent/overdue documents (not just drafts).
  const canSend = draft || ctx.status === 'sent' || ctx.status === 'overdue';

  // A document can be edited while it is still a draft (the backend UpdateInvoice/
  // UpdateQuotation reject finalized documents); past that, status is managed via the
  // lifecycle actions below (send / record payment / mark paid / void / cancel).
  if (draft) out.push('edit');

  switch (docType) {
    case 'invoice':
    case 'subscription': {
      if (canSend) out.push('send');
      if (isPayable(ctx)) out.push('record_payment', 'mark_paid');
      if (!isVoided(ctx.status)) out.push('generate_delivery_note');
      if (isFinalized(ctx.status)) out.push('create_credit_note', 'create_debit_note');
      if (ctx.payment_status === 'paid' || ctx.status === 'paid') out.push('generate_receipt');
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
