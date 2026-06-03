import { notFound } from 'next/navigation';
import { fetchPublicInvoice, type PublicInvoice, type InvoiceLine } from '@/lib/api/invoices';
import { numberToWords } from '@/lib/utils/number-to-words';
import { InvoiceActions } from './InvoiceActions';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  try {
    const inv = await fetchPublicInvoice(token);
    return {
      title: `${inv.invoice_number} — ${inv.tenant_name}`,
      description: `Invoice from ${inv.tenant_name}. Total: ${inv.currency} ${parseFloat(inv.total_amount).toLocaleString()}`,
    };
  } catch {
    return { title: 'Invoice' };
  }
}

function statusBadge(status: string, paymentStatus: string) {
  if (paymentStatus === 'paid') return { label: 'Paid', cls: 'bg-green-100 text-green-700' };
  if (paymentStatus === 'partial') return { label: 'Partially Paid', cls: 'bg-yellow-100 text-yellow-700' };
  if (status === 'overdue') return { label: 'Overdue', cls: 'bg-red-100 text-red-700' };
  if (status === 'void' || status === 'cancelled') return { label: 'Void', cls: 'bg-slate-100 text-slate-500' };
  if (status === 'sent') return { label: 'Sent', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'Draft', cls: 'bg-slate-100 text-slate-500' };
}

export default async function PublicInvoicePage({ params }: Props) {
  const { token } = await params;

  let invoice: PublicInvoice;
  try {
    invoice = await fetchPublicInvoice(token);
  } catch {
    notFound();
  }

  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const subtotal = parseFloat(invoice.subtotal) || 0;
  const taxAmount = parseFloat(invoice.tax_amount) || 0;
  const discountAmount = parseFloat(invoice.discount_amount ?? '0') || 0;
  const amountInWords = numberToWords(totalAmount, invoice.currency || 'Shillings');

  const fmt = (v: string | number) =>
    Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const badge = statusBadge(invoice.status, invoice.payment_status);
  const TREASURY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://booksapi.codevertexitsolutions.com';
  const pdfUrl = `${TREASURY_API_URL}/api/v1/public/invoices/${token}/pdf`;

  return (
    <div className="min-h-screen bg-slate-50">
      <InvoiceActions pdfUrl={pdfUrl} invoiceNumber={invoice.invoice_number} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white shadow-sm rounded-xl p-8 print:shadow-none print:rounded-none">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Invoice</h1>
              <p className="text-slate-500 mt-1">{invoice.invoice_number}</p>
              <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-800">{invoice.tenant_name}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Invoice Date</p>
              <p className="text-slate-700 font-medium">
                {new Date(invoice.invoice_date).toLocaleDateString('en-KE', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Due Date</p>
              <p className="text-slate-700 font-medium">
                {new Date(invoice.due_date).toLocaleDateString('en-KE', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* From / Bill To */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-medium">From</p>
              <p className="font-semibold text-slate-800">{invoice.tenant_name}</p>
              <p className="text-sm text-slate-500 mt-0.5">Powered by Codevertex Books</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-medium">Bill To</p>
              {invoice.customer_name
                ? <p className="font-semibold text-slate-800">{invoice.customer_name}</p>
                : <p className="text-slate-400 italic text-sm">Not specified</p>}
            </div>
          </div>

          {/* Line items */}
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
                {(invoice.lines ?? []).map((line: InvoiceLine, i: number) => (
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
                <span>{invoice.currency} {fmt(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount</span>
                  <span className="text-green-600">- {invoice.currency} {fmt(discountAmount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>{invoice.currency} {fmt(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2 mt-1">
                <span>Total Due</span>
                <span>{invoice.currency} {fmt(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 mb-8 text-sm text-slate-600 italic">
            {amountInWords}
          </div>

          {/* Notes / Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="space-y-4 mb-8">
              {invoice.notes && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-1 font-medium">Notes</p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-1 font-medium">Terms &amp; Conditions</p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

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
              { label: 'ISP Billing', href: 'https://ispbilling.codevertexitsolutions.com' },
              { label: 'AI & Automation', href: 'https://marketflow.codevertexitsolutions.com' },
            ].map((p, i, arr) => (
              <span key={p.href} className="flex items-center gap-4">
                <a href={p.href} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">
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
    </div>
  );
}
