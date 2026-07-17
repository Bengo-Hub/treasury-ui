'use client';

/**
 * EtimsResponseModal — one reusable dialog for showing a KRA response/record in full
 * (transmission record, generated PRN, filed return), with Print and Download actions.
 * Print reuses the platform's client-side document approach (branded printable HTML →
 * window.print in a dedicated window, same pattern as the reports' print pipeline);
 * Download saves the structured payload as JSON evidence.
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, Printer } from 'lucide-react';

export interface EtimsResponseRow {
  label: string;
  value?: string | number | null;
  mono?: boolean;
  /** Highlight failures (rendered destructive). */
  danger?: boolean;
}

function printDocument(title: string, rows: EtimsResponseRow[]) {
  const printable = rows
    .filter((r) => r.value !== undefined && r.value !== null && r.value !== '')
    .map(
      (r) =>
        `<tr><td class="label">${r.label}</td><td class="${r.mono ? 'mono' : ''}">${String(r.value)}</td></tr>`,
    )
    .join('');
  const win = window.open('', '_blank', 'width=720,height=900');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; color: #111; margin: 32px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .sub { color: #666; font-size: 11px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    td.label { color: #666; width: 200px; }
    td.mono { font-family: ui-monospace, monospace; word-break: break-all; }
    .foot { margin-top: 24px; color: #999; font-size: 10px; }
  </style></head><body>
    <h1>${title}</h1>
    <div class="sub">KRA eTIMS record — generated ${new Date().toLocaleString()}</div>
    <table>${printable}</table>
    <div class="foot">Produced by Treasury · retain as filing/audit evidence.</div>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function downloadJSON(title: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EtimsResponseModal({
  open,
  onClose,
  title,
  rows,
  payload,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: EtimsResponseRow[];
  /** The raw structured record — downloaded as JSON evidence. */
  payload: unknown;
}) {
  const visible = rows.filter((r) => r.value !== undefined && r.value !== null && r.value !== '');
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent title={title} onClose={onClose}>
        <div className="space-y-4">
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border/60">
                {visible.map((r) => (
                  <tr key={r.label}>
                    <td className="w-40 shrink-0 px-3 py-2 text-muted-foreground">{r.label}</td>
                    <td className={`px-3 py-2 ${r.mono ? 'font-mono break-all' : 'font-medium'} ${r.danger ? 'text-destructive' : ''}`}>
                      {String(r.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => downloadJSON(title, payload)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" /> Download JSON
            </button>
            <button
              type="button"
              onClick={() => printDocument(title, rows)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
