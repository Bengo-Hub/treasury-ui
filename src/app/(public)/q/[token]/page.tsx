import { notFound } from 'next/navigation';
import { fetchPublicQuotation, type PublicQuotation, type QuotationLine } from '@/lib/api/invoices';
import { numberToWords } from '@/lib/utils/number-to-words';
import { QuotationActionBar, AcceptDeclineButtons } from './_components/QuotationActions';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  try {
    const q = await fetchPublicQuotation(token);
    return {
      title: `${q.quote_number} — ${q.tenant_name}`,
      description: `Quotation from ${q.tenant_name}. Total: ${q.currency} ${parseFloat(q.total_amount).toLocaleString()}`,
    };
  } catch {
    return { title: 'Quotation' };
  }
}

export default async function PublicQuotationPage({ params }: Props) {
  const { token } = await params;

  let quote: PublicQuotation;
  try {
    quote = await fetchPublicQuotation(token);
  } catch {
    notFound();
  }

  const totalAmount = parseFloat(quote.total_amount) || 0;
  const subtotal = parseFloat(quote.subtotal) || 0;
  const taxAmount = parseFloat(quote.tax_amount) || 0;
  const discountAmount = parseFloat(quote.discount_amount) || 0;
  const amountInWords = numberToWords(totalAmount, quote.currency || 'Shillings');

  const fmt = (v: string | number) =>
    Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const canAccept = quote.status === 'sent' || quote.status === 'draft';

  return (
    <div className="min-h-screen bg-slate-50">
      <QuotationActionBar token={token} quoteNumber={quote.quote_number} status={quote.status} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white shadow-sm rounded-xl p-8 print:shadow-none print:rounded-none">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Quotation</h1>
              <p className="text-slate-500 mt-1">{quote.quote_number}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-800">{quote.tenant_name}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Quotation Date</p>
              <p className="text-slate-700 font-medium">
                {new Date(quote.quote_date).toLocaleDateString('en-KE', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Valid Until</p>
              <p className="text-slate-700 font-medium">
                {new Date(quote.valid_until).toLocaleDateString('en-KE', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* From / For */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-medium">Quotation From</p>
              <p className="font-semibold text-slate-800">{quote.tenant_name}</p>
              <p className="text-sm text-slate-500 mt-0.5">Powered by Codevertex Books</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-medium">Quotation For</p>
              {quote.customer_name
                ? <p className="font-semibold text-slate-800">{quote.customer_name}</p>
                : <p className="text-slate-400 italic text-sm">Not specified</p>}
            </div>
          </div>

          {/* Line items table */}
          <div className="mb-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2 rounded-tl-md">#</th>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">Rate</th>
                  <th className="text-right px-3 py-2">Tax</th>
                  <th className="text-right px-3 py-2 rounded-tr-md">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(quote.lines ?? []).map((line: QuotationLine, i: number) => (
                  <tr key={line.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-3 text-slate-700 font-medium">{line.description}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{fmt(line.quantity)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{fmt(line.unit_price)}</td>
                    <td className="px-3 py-3 text-right text-slate-500">
                      {parseFloat(line.tax_rate) > 0 ? `${fmt(line.tax_rate)}%` : '—'}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-800 font-medium">{fmt(line.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{quote.currency} {fmt(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount</span>
                  <span className="text-green-600">- {quote.currency} {fmt(discountAmount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>{quote.currency} {fmt(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2 mt-1">
                <span>Total</span>
                <span>{quote.currency} {fmt(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 mb-8 text-sm text-slate-600 italic">
            {amountInWords}
          </div>

          {/* Notes / Terms */}
          {(quote.notes || quote.terms) && (
            <div className="space-y-4 mb-8">
              {quote.notes && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-1 font-medium">Notes</p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-1 font-medium">Terms &amp; Conditions</p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{quote.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Accept / Decline */}
          {canAccept && <AcceptDeclineButtons />}
        </div>

        {/* Vera AI assistant callout */}
        {quote.tenant_slug && (
          <div className="mt-6 bg-white shadow-sm rounded-xl p-6 print:hidden">
            <p className="text-sm font-medium text-slate-700 mb-1">
              Questions about this quotation?
            </p>
            <p className="text-sm text-slate-500">
              Chat with {quote.tenant_name}&apos;s AI assistant — available 24/7 to answer queries
              about products, pricing, and delivery.
            </p>
          </div>
        )}

        {/* Platform footer */}
        <div className="mt-8 border-t border-slate-200 pt-8 pb-12 print:hidden">
          <div className="text-center mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-1">Powered by</p>
            <p className="text-sm font-semibold text-slate-700">Codevertex Power Suite</p>
            <p className="text-xs text-slate-400 mt-1">
              Six integrated products. One SSO identity. Zero friction between your tools.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
            {[
              { label: 'Books', href: 'https://books.codevertexitsolutions.com' },
              { label: 'POS', href: 'https://pos.codevertexitsolutions.com' },
              { label: 'ERP', href: 'https://erp.codevertexitsolutions.com' },
              { label: 'TruLoad', href: 'https://truload.codevertexitsolutions.com' },
              { label: 'ISP Billing', href: 'https://isp.codevertexitsolutions.com' },
              { label: 'AI & Automation', href: 'https://marketflow.codevertexitsolutions.com' },
            ].map((p, i, arr) => (
              <span key={p.href} className="flex items-center gap-4">
                <a href={p.href} target="_blank" rel="noopener noreferrer" className="hover:text-brand-emphasis transition-colors">
                  {p.label}
                </a>
                {i < arr.length - 1 && <span>·</span>}
              </span>
            ))}
          </div>
          <p className="text-center text-xs text-slate-300 mt-3">
            &copy; {new Date().getFullYear()} Codevertex IT Solutions &nbsp;·&nbsp; OAuth 2.0 &nbsp;·&nbsp; AES-256 &nbsp;·&nbsp; Multi-tenant SSO
          </p>
        </div>
      </div>

      {/* Vera AI chatbot widget */}
      {quote.tenant_slug && (
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script
          src="https://marketflow.codevertexitsolutions.com/widget/chat.js"
          data-tenant={quote.tenant_slug}
          data-mode="tenant"
          data-api-url="https://marketflowapi.codevertexitsolutions.com"
          data-widget-title={`${quote.tenant_name} Assistant`}
          data-primary-color="#6D28D9"
          async
        />
      )}
    </div>
  );
}
