// Shared constants/helpers for the Bulk Upload stepper sub-views.

/**
 * Fixed brand palette — the original feat-financial-docs dark blue/black look.
 * Deliberately NOT the tenant `primary` theme (which can render pink); these are
 * hardcoded hex literals (slate-900 #0f172a / slate-800 #1e293b) so the brand
 * identity is stable across tenants. Dark fills always pair with white text, so
 * they stay legible in both light and dark mode. Literal strings (not
 * interpolated) so Tailwind's JIT can detect the arbitrary-value classes.
 */
export const BRAND_SOLID_BTN =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:opacity-50";

/** Outline/secondary button — theme-aware surface with a subtle border. */
export const BRAND_OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent";

/** Dark gradient used behind the demo-video thumbnail. */
export const BRAND_GRADIENT = "bg-gradient-to-br from-[#1e293b] to-[#0f172a]";

/** Active step-indicator chip background. */
export const BRAND_STEP_ACTIVE = "bg-[#0f172a] text-white";

/** Canonical CSV columns a bulk-upload file is expected to provide. */
export const TEMPLATE_COLUMNS = [
  "customer_name",
  "customer_email",
  "issue_date",
  "due_date",
  "item_description",
  "quantity",
  "unit_price",
  "tax_rate",
  "currency",
  "notes",
];

/** Guidance shown under "Things to keep in mind while bulk uploading". */
export const BULK_UPLOAD_TIPS = [
  "The file must be a .csv with a header row matching the template columns.",
  "Dates must use the YYYY-MM-DD format.",
  "Amounts (unit_price, tax_rate) must be plain numbers — no currency symbols.",
  "Each row becomes one draft document; rows with errors are reported and skipped.",
];

/** Trigger a client-side download of the blank CSV template for the given doc type. */
export function downloadTemplateCsv(invoiceType: string) {
  const csv = TEMPLATE_COLUMNS.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoiceType}_bulk_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** "customer_name" -> "Customer Name" */
export function prettifyColumn(col: string) {
  return col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
