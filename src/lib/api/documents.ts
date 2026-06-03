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
