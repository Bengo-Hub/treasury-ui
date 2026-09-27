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

/**
 * Analytics report documents (PDF/CSV) — tabular, tenant-branded reports rendered by the
 * treasury reports engine. Streamed inline (no ?download) so they preview-first in the shared
 * PdfPreview modal, mirroring the invoice endpoints. `format` defaults to pdf.
 */
export function downloadRevenueReport(
  tenant: string,
  format: 'pdf' | 'csv' = 'pdf',
  from?: string,
  to?: string
): Promise<{ blob: Blob; fileName: string }> {
  return apiClient.getBlob(`${BASE}/${tenant}/analytics/revenue-report`, `revenue-report.${format}`, { format, from, to });
}

/** Formats every server-side document export supports (central report engine). */
export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

/**
 * Generic document export: GETs `/{tenant}/{path}?format=` plus the page's filters and returns the
 * file. Every accounting export (journals, trial balance, periods, expenses, statements, bank
 * statements, ...) goes through this one call; see treasury-api docs/general-ledger.md "5e".
 */
export function downloadExport(
  tenant: string,
  path: string,
  format: ExportFormat,
  fileBase: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<{ blob: Blob; fileName: string }> {
  const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ''));
  return apiClient.getBlob(`${BASE}/${tenant}/${path.replace(/^\//, '')}`, `${fileBase}.${format}`, { ...clean, format });
}

export function downloadMoneyFlowReport(
  tenant: string,
  format: 'pdf' | 'csv' = 'pdf',
  from?: string,
  to?: string
): Promise<{ blob: Blob; fileName: string }> {
  return apiClient.getBlob(`${BASE}/${tenant}/analytics/money-flow-report`, `money-flow-report.${format}`, { format, from, to });
}

export function downloadPlatformRevenueReport(
  format: 'pdf' | 'csv' = 'pdf',
  from?: string,
  to?: string,
  tenantIds?: string
): Promise<{ blob: Blob; fileName: string }> {
  return apiClient.getBlob(`${BASE}/platform/analytics/platform-revenue-report`, `platform-revenue-report.${format}`, {
    format,
    from,
    to,
    tenant_ids: tenantIds,
  });
}
