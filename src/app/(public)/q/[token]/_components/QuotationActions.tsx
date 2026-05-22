'use client';

const TREASURY_API = process.env.NEXT_PUBLIC_TREASURY_API_URL ?? 'https://treasuryapi.codevertexitsolutions.com';

interface Props {
  token: string;
  quoteNumber: string;
  status: string;
}

export function QuotationActionBar({ token, quoteNumber, status }: Props) {
  const shareUrl = `${window.location.origin}/q/${token}`;
  const pdfUrl = `${TREASURY_API}/api/v1/public/quotations/${token}/pdf?download=true`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => alert('Link copied to clipboard!'));
  };

  const downloadPdf = () => {
    window.open(pdfUrl, '_blank');
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  const badge = statusColor[status?.toLowerCase()] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{quoteNumber}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${badge}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="text-sm px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600"
          >
            Copy Link
          </button>
          <a
            href={`${TREASURY_API}/api/v1/public/quotations/${token}/export?format=xlsx`}
            download
            className="text-sm px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600"
          >
            Excel
          </a>
          <a
            href={`${TREASURY_API}/api/v1/public/quotations/${token}/export?format=csv`}
            download
            className="text-sm px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600"
          >
            CSV
          </a>
          <button
            onClick={downloadPdf}
            className="text-sm px-3 py-1.5 bg-brand-emphasis text-white rounded-md hover:opacity-90 font-medium"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export function AcceptDeclineButtons() {
  return (
    <div className="flex gap-3 border-t border-slate-100 pt-6">
      <button className="flex-1 bg-brand-emphasis hover:opacity-90 text-white font-semibold py-3 rounded-lg transition text-sm">
        Accept Quotation
      </button>
      <button className="px-6 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium py-3 rounded-lg transition text-sm">
        Decline
      </button>
    </div>
  );
}
