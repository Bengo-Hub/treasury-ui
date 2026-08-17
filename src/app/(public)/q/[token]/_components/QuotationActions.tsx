'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { acceptPublicQuotation, declinePublicQuotation } from '@/lib/api/invoices';

const TREASURY_API = process.env.NEXT_PUBLIC_TREASURY_API_URL ?? 'https://booksapi.codevertexafrica.com';

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
      <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{quoteNumber}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${badge}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={copyLink}
            className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 whitespace-nowrap"
          >
            Copy Link
          </button>
          <a
            href={`${TREASURY_API}/api/v1/public/quotations/${token}/export?format=xlsx`}
            download
            className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 whitespace-nowrap"
          >
            Excel
          </a>
          <a
            href={`${TREASURY_API}/api/v1/public/quotations/${token}/export?format=csv`}
            download
            className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 whitespace-nowrap"
          >
            CSV
          </a>
          <button
            onClick={downloadPdf}
            className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 bg-brand-emphasis text-white rounded-md hover:opacity-90 font-medium whitespace-nowrap"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

interface AcceptDeclineProps {
  token: string;
}

export function AcceptDeclineButtons({ token }: AcceptDeclineProps) {
  const router = useRouter();
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null);

  const handleAccept = async () => {
    setPending('accept');
    try {
      await acceptPublicQuotation(token);
      toast.success('Quotation accepted');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept quotation');
    } finally {
      setPending(null);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Decline this quotation? This cannot be undone.')) return;
    setPending('decline');
    try {
      await declinePublicQuotation(token);
      toast.success('Quotation declined');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to decline quotation');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex gap-3 border-t border-slate-100 pt-6">
      <button
        onClick={handleAccept}
        disabled={pending !== null}
        className="flex-1 bg-brand-emphasis hover:opacity-90 text-white font-semibold py-3 rounded-lg transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending === 'accept' ? 'Accepting…' : 'Accept Quotation'}
      </button>
      <button
        onClick={handleDecline}
        disabled={pending !== null}
        className="px-6 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium py-3 rounded-lg transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending === 'decline' ? 'Declining…' : 'Decline'}
      </button>
    </div>
  );
}
