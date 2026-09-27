'use client';

import { useCallback, useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, Sheet } from 'lucide-react';
import { toast } from 'sonner';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { downloadExport, type ExportFormat } from '@/lib/api/documents';
import { downloadBlob } from '@/lib/utils/download-blob';
import { cn } from '@/lib/utils';

interface ExportMenuProps {
  tenant: string;
  /** Export path under the tenant, e.g. "ledger/trial-balance/export". */
  path: string;
  /** Base file name, e.g. "trial-balance". */
  fileBase: string;
  /** Title shown on the PDF preview. */
  title: string;
  /** The page's current filters, sent with every format so the file matches the screen. */
  params?: Record<string, string | number | boolean | undefined>;
  className?: string;
  disabled?: boolean;
}

/**
 * ExportMenu is the one export control for server-rendered documents: PDF opens in the shared
 * PdfPreview (print, download, open in tab), CSV and Excel download directly. Every accounting page
 * uses it with its export path and current filters; the server renders all formats through the
 * central report engine, so no page builds its own CSV.
 */
export function ExportMenu({ tenant, path, fileBase, title, params, className, disabled }: ExportMenuProps) {
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m: string) => toast.error(m) });
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const run = useCallback(
    async (format: ExportFormat) => {
      if (!tenant) return;
      if (format === 'pdf') {
        openPreview(() => downloadExport(tenant, path, 'pdf', fileBase, params).then((r) => r.blob), {
          fileName: `${fileBase}.pdf`,
          title,
        });
        return;
      }
      setBusy(format);
      try {
        const { blob, fileName } = await downloadExport(tenant, path, format, fileBase, params);
        downloadBlob(blob, fileName);
      } catch (e: any) {
        toast.error(e?.message || `Failed to export ${format.toUpperCase()}`);
      } finally {
        setBusy(null);
      }
    },
    [tenant, path, fileBase, title, params, openPreview],
  );

  const btn =
    'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-accent/50 disabled:opacity-50';
  return (
    <>
      <div className={cn('inline-flex items-center overflow-hidden rounded-lg border border-border bg-card divide-x divide-border', className)} role="group" aria-label="Export">
        <button type="button" className={btn} disabled={disabled || !tenant} onClick={() => run('pdf')} title="Preview, print or download PDF">
          <FileText className="h-3.5 w-3.5" /> PDF
        </button>
        <button type="button" className={btn} disabled={disabled || !tenant || busy !== null} onClick={() => run('csv')} title="Download CSV">
          {busy === 'csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sheet className="h-3.5 w-3.5" />} CSV
        </button>
        <button type="button" className={btn} disabled={disabled || !tenant || busy !== null} onClick={() => run('xlsx')} title="Download Excel">
          {busy === 'xlsx' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Excel
        </button>
      </div>
      <PdfPreview {...previewProps} />
    </>
  );
}
