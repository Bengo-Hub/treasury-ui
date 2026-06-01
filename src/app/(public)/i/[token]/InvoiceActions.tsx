'use client';

export function InvoiceActions({ pdfUrl, invoiceNumber }: { pdfUrl: string; invoiceNumber: string }) {
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between print:hidden">
      <span className="text-sm font-semibold text-slate-700">{invoiceNumber}</span>
      <div className="flex items-center gap-2">
        <a
          href={`${pdfUrl}?download=true`}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Download PDF
        </a>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors"
        >
          Print
        </button>
      </div>
    </div>
  );
}
