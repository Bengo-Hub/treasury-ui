'use client';

import { Button } from '@/components/ui/base';
import { usePrintDocument } from '@/hooks/use-print-document';
import { Printer } from 'lucide-react';

/**
 * PrintButton — "Download / Print PDF" trigger for a ReportDocument. Uses the
 * shared `usePrintDocument` hook (native window.print, no extra dependency).
 * Tagged `print-hidden` so it never appears on the printed page.
 */
export function PrintButton({ label = 'Download / Print PDF' }: { label?: string }) {
  const print = usePrintDocument();
  return (
    <Button variant="outline" size="sm" onClick={print} className="print-hidden gap-2">
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
