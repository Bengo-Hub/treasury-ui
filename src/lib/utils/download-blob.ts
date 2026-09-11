/**
 * Triggers a browser save-as for an already-fetched Blob (e.g. a CSV export) — the standard
 * createObjectURL + temporary anchor-click pattern already duplicated ad hoc in a few export
 * buttons across this app. Use this for any NEW blob download instead of re-copying the snippet.
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
