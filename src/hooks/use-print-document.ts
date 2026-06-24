'use client';

import { useCallback } from 'react';

/**
 * usePrintDocument — triggers the browser print dialog scoped to the active
 * ReportDocument. It flips `data-printing` on <html> so the `@media print`
 * rules in globals.css hide everything except the `.report-document`, then
 * clears the flag once printing is dismissed. No new dependency: uses the
 * native `window.print()` to produce a PDF (Save as PDF) or paper copy.
 */
export function usePrintDocument() {
  return useCallback(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-printing', 'true');
    const cleanup = () => {
      root.removeAttribute('data-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // Fallback in case afterprint never fires (some browsers).
    window.setTimeout(cleanup, 1500);
    window.print();
  }, []);
}
