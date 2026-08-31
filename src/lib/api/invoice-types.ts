/**
 * The real `invoice_type` values treasury-api's `invoices` table actually stores — confirmed by
 * grepping every `SetInvoiceType`/`InvoiceType:` call site across treasury-api (invoicing/service.go,
 * invoice_receipts.go) and subscriptions-api (billing/invoice_service.go, which posts `subscription`
 * invoices here). This is the single source of truth for anything that needs to offer/validate an
 * invoice type — e.g. BankAccount's "which invoice types default here" picker — instead of each
 * surface guessing or hand-rolling its own list.
 */
export const INVOICE_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard Invoice',
  subscription: 'Subscription Invoice',
  proforma_invoice: 'Proforma Invoice',
  sales_order: 'Sales Order',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  delivery_challan: 'Delivery Challan',
  payment_receipt: 'Payment Receipt',
};

export const INVOICE_TYPE_OPTIONS: { value: string; label: string }[] = Object.entries(
  INVOICE_TYPE_LABELS,
).map(([value, label]) => ({ value, label }));

export function getInvoiceTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  return INVOICE_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}
