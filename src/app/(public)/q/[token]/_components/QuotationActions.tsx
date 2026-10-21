'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { acceptPublicQuotation, declinePublicQuotation } from '@/lib/api/invoices';

interface AcceptDeclineProps {
  token: string;
  /** The issuing tenant's brand colour (from PublicDocShell). */
  brand: string;
}

export function AcceptDeclineButtons({ token, brand }: AcceptDeclineProps) {
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
    <div className="flex gap-3">
      <button
        onClick={handleAccept}
        disabled={pending !== null}
        className="flex-1 min-h-12 hover:opacity-90 active:opacity-80 text-white font-semibold py-3 rounded-lg transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: brand }}
      >
        {pending === 'accept' ? 'Accepting...' : 'Accept quotation'}
      </button>
      <button
        onClick={handleDecline}
        disabled={pending !== null}
        className="min-h-12 px-6 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-600 font-medium py-3 rounded-lg transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending === 'decline' ? 'Declining...' : 'Decline'}
      </button>
    </div>
  );
}
