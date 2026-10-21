import { notFound } from 'next/navigation';
import {
  PUBLIC_TREASURY_API_URL,
  downloadQuotationPDF,
  exportQuotation,
  fetchPublicQuotation,
  type PublicQuotation,
} from '@/lib/api/invoices';
import { PublicDocShell, publicDocButton, type PublicDocBadge } from '@/components/public/PublicDocShell';
import { CopyLinkButton } from '@/components/public/CopyLinkButton';
import { AcceptDeclineButtons } from './_components/QuotationActions';

interface Props {
  params: Promise<{ token: string }>;
}

const fmt = (v: number) => Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const longDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  try {
    const q = await fetchPublicQuotation(token);
    return {
      title: `${q.quote_number} | ${q.tenant_name}`,
      description: `Quotation from ${q.tenant_name}. Total: ${q.currency} ${fmt(parseFloat(q.total_amount) || 0)}`,
    };
  } catch {
    return { title: 'Quotation' };
  }
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-slate-100 text-slate-500',
  converted: 'bg-purple-100 text-purple-700',
};

function badges(status: string, converted: boolean): PublicDocBadge[] {
  if (converted) {
    return [
      { label: 'Accepted', className: STATUS_BADGE.accepted },
      { label: 'Converted to invoice', className: STATUS_BADGE.converted },
    ];
  }
  const s = status || 'draft';
  return [{ label: s.charAt(0).toUpperCase() + s.slice(1), className: STATUS_BADGE[s] ?? STATUS_BADGE.draft }];
}

export default async function PublicQuotationPage({ params }: Props) {
  const { token } = await params;

  let quote: PublicQuotation;
  try {
    quote = await fetchPublicQuotation(token);
  } catch {
    notFound();
  }

  const status = (quote.status || '').toLowerCase();
  const canAccept = status === 'sent' || status === 'draft';
  const isConverted = status === 'converted' && !!quote.converted_invoice_token;

  return (
    <PublicDocShell
      tenantSlug={quote.tenant_slug}
      tenantName={quote.tenant_name}
      docLabel="Quotation"
      docNoun="quotation"
      docNumber={quote.quote_number}
      badges={badges(status, isConverted)}
      amount={`${quote.currency} ${fmt(parseFloat(quote.total_amount) || 0)}`}
      dateLine={quote.valid_until ? `Valid until ${longDate(quote.valid_until)}` : undefined}
      pdfUrl={`${PUBLIC_TREASURY_API_URL}${downloadQuotationPDF(token)}`}
      actions={(brand) => (
        <>
          <CopyLinkButton className={publicDocButton} />
          <a href={`${PUBLIC_TREASURY_API_URL}${exportQuotation(token, 'xlsx')}`} download className={publicDocButton}>Excel</a>
          <a href={`${PUBLIC_TREASURY_API_URL}${exportQuotation(token, 'csv')}`} download className={publicDocButton}>CSV</a>
          {isConverted && (
            <a
              href={`/i/${quote.converted_invoice_token}`}
              className="min-h-10 inline-flex items-center px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white hover:opacity-90 active:opacity-80 whitespace-nowrap"
              style={{ backgroundColor: brand }}
            >
              View invoice
            </a>
          )}
        </>
      )}
    >
      {(brand) =>
        isConverted ? (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm font-medium text-green-700">
              This quotation was accepted and converted to invoice {quote.converted_invoice_number}.
            </p>
            <a
              href={`/i/${quote.converted_invoice_token}`}
              className="text-center text-white font-semibold py-3 px-6 rounded-lg text-sm whitespace-nowrap hover:opacity-90"
              style={{ backgroundColor: brand }}
            >
              View invoice
            </a>
          </div>
        ) : canAccept ? (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
            <AcceptDeclineButtons token={token} brand={brand} />
          </div>
        ) : null
      }
    </PublicDocShell>
  );
}
