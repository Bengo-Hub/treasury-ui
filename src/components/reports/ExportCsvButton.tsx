'use client';

import { Button } from '@/components/ui/base';
import { exportReportCsv, type ReportCsvData } from '@/lib/reports/export-csv';
import { Download } from 'lucide-react';

/**
 * ExportCsvButton — "Export CSV" trigger for a ReportDocument. Serialises the
 * SAME `columns`/`sections` the report's ReportTable renders (via the shared
 * {@link exportReportCsv} util — one exporter, reused by every report). Tagged
 * `print-hidden` so it never appears on the printed page, mirroring PrintButton.
 */
export function ExportCsvButton({ csv, label = 'Export CSV' }: { csv: ReportCsvData; label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => exportReportCsv(csv)} className="print-hidden gap-2">
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
