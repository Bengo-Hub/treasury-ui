// Shared constants/helpers for the Bulk Upload stepper sub-views.

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
