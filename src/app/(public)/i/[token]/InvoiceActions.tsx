'use client';

export function InvoiceActions({
  pdfUrl,
  invoiceNumber,
  payUrl,
  brand,
}: {
  pdfUrl: string;
  invoiceNumber: string;
  payUrl?: string;
  brand?: string;
}) {
  return (
    <div
      className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 print:hidden"
      style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
    >
      <span className="text-sm font-semibold text-slate-700 truncate">{invoiceNumber}</span>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <a
          href={`${pdfUrl}?download=true`}
          className="min-h-10 inline-flex items-center px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors whitespace-nowrap"
        >
          Download
        </a>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-10 inline-flex items-center px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors whitespace-nowrap"
        >
          Open
        </a>
        {payUrl && (
          <a
            href={payUrl}
            className="min-h-10 inline-flex items-center px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 whitespace-nowrap"
            style={{ backgroundColor: brand || '#059669' }}
          >
            Pay Now
          </a>
        )}
      </div>
    </div>
  );
}
