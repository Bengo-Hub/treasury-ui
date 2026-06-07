/**
 * Document download helpers — fetch generated PDFs as blobs through the shared
 * apiClient (so auth + tenant headers and 401-refresh apply), returning the blob
 * plus a server-suggested file name for the shared PdfPreview component.
 *
 * Base path: /api/v1/{tenant}. Receipts are invoices of type `payment_receipt`,
 * so they stream from the same invoice PDF endpoint.
 */
import { apiClient } from './client';

const BASE = '/api/v1';

export function downloadInvoicePdf(
  tenant: string,
  invoiceId: string,
  fallbackName = 'invoice'
): Promise<{ blob: Blob; fileName: string }> {
  return apiClient.getBlob(`${BASE}/${tenant}/invoices/${invoiceId}/pdf`, `${fallbackName}.pdf`);
}

export function downloadQuotationPdf(
  tenant: string,
  quotationId: string,
  fallbackName = 'quotation'
): Promise<{ blob: Blob; fileName: string }> {
  return apiClient.getBlob(`${BASE}/${tenant}/quotations/${quotationId}/pdf`, `${fallbackName}.pdf`);
}

/** Payment receipts are invoices of type payment_receipt — same PDF endpoint. */
export function downloadReceiptPdf(
  tenant: string,
  invoiceId: string,
  fallbackName = 'receipt'
): Promise<{ blob: Blob; fileName: string }> {
  return downloadInvoicePdf(tenant, invoiceId, fallbackName);
}

/**
 * Public (token-addressed) PDF endpoints. Invoice-family documents (invoices,
 * proforma invoices, credit/debit notes, sales orders, delivery challans and
 * payment receipts) all share the public invoice endpoint; quotations have their
 * own. Used by the document lists to preview-first via the shared PdfPreview
 * instead of force-downloading. No `?download=true` so the server streams the PDF
 * inline (Content-Disposition: inline) for in-modal rendering.
 */
export function downloadPublicInvoicePdf(
  publicToken: string,
  fallbackName = 'document'
): Promise<{ blob: Blob; fileName: string }> {
  return apiClient.getBlob(`${BASE}/public/invoices/${publicToken}/pdf`, `${fallbackName}.pdf`);
}

export function downloadPublicQuotationPdf(
  publicToken: string,
  fallbackName = 'quotation'
): Promise<{ blob: Blob; fileName: string }> {
  return apiClient.getBlob(`${BASE}/public/quotations/${publicToken}/pdf`, `${fallbackName}.pdf`);
}
