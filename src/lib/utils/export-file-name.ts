/**
 * Reduces one file-name part to letters, digits, '.' and '-' (every other run of characters
 * becomes one '-'). Mirrors treasury-api platform/exportname.Part so files named here and files
 * named by the server look the same.
 */
export function fileNamePart(s: string | null | undefined): string {
  const out = (s ?? '').trim().replace(/[^A-Za-z0-9.]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return out.length > 80 ? out.slice(0, 80).replace(/[-.]+$/, '') : out;
}

/**
 * The download name of a generated file: tenant, outlet (only for an export filtered to one
 * outlet), document and generation date, e.g. "BOI-Enterprises_Westlands_Invoices_2026-09-27.csv"
 * (treasury-api platform/exportname.Build). An outlet named like the tenant is not repeated.
 */
export function exportFileName(tenantName: string | null | undefined, outletName: string | null | undefined, document: string, ext: string, at = new Date()): string {
  const date = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
  const tenant = fileNamePart(tenantName);
  const outlet = fileNamePart(outletName);
  const parts = [tenant, outlet.toLowerCase() === tenant.toLowerCase() ? '' : outlet, fileNamePart(document) || 'Document', date].filter(Boolean);
  return `${parts.join('_')}.${ext.replace(/^\./, '')}`;
}
