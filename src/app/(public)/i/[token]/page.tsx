import { notFound } from 'next/navigation';
import { fetchPublicInvoice, invoiceAmountDue, type PublicInvoice } from '@/lib/api/invoices';
import { InvoiceActions } from './InvoiceActions';
import { PublicDocFooter } from '@/components/public/PublicDocFooter';

interface Props {
  params: Promise<{ token: string }>;
}

const TREASURY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://booksapi.codevertexafrica.com';
const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://sso.codevertexafrica.com';

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

// Resolve the issuing tenant's brand primary color (server-side) from the auth-api public
// by-slug endpoint, so the page chrome reflects the tenant — works for both platform
// subscription invoices (slug=codevertex) and a tenant's own customer invoices.
async function fetchBrandColor(slug: string): Promise<string | null> {
  if (!slug) return null;
  try {
    const res = await fetch(`${AUTH_API_URL}/api/v1/tenants/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const primary = data?.brand_colors?.primary;
    return typeof primary === 'string' && /^#?[0-9a-fA-F]{6}$/.test(primary.replace('#', ''))
      ? (primary.startsWith('#') ? primary : `#${primary}`)
      : null;
  } catch {
    return null;
  }
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
  // Charge the outstanding balance, not the full total: the server's amount_due nets payments AND
  // credit notes, so neither what was already paid nor a credited remainder is charged again.
  const balanceDue = invoiceAmountDue(invoice);
  const fmt = (v: number) => Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const badge = statusBadge(invoice.status, invoice.payment_status);

  const brand = (await fetchBrandColor(invoice.tenant_slug)) || '#6b21a8';
  const pdfUrl = `${TREASURY_API_URL}/api/v1/public/invoices/${token}/pdf`;

  // Durable pay link (reuses the existing /pay page; fresh Paystack session per visit).
  const isPaid = invoice.payment_status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'void';
  let payUrl: string | undefined;
  if (!isPaid && balanceDue > 0) {
    const q = new URLSearchParams({
      tenant: invoice.tenant_slug,
      amount: String(balanceDue),
      currency: invoice.currency || 'KES',
      reference_id: token,
      reference_type: 'invoice',
      invoice_number: invoice.invoice_number,
      description: `Invoice ${invoice.invoice_number}`,
    });
    payUrl = `/pay?${q.toString()}`;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Brand accent bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: brand }} />

      <InvoiceActions pdfUrl={pdfUrl} invoiceNumber={invoice.invoice_number} payUrl={payUrl} brand={brand} />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Summary header */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-400">Invoice from</p>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{invoice.tenant_name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {invoice.currency} {fmt(totalAmount)}
            </p>
            {invoice.due_date && (
              <p className="text-xs text-slate-400">
                Due {new Date(invoice.due_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Mobile: inline PDF embeds are unreliable on phone browsers (blank/no-preview on most
            mobile Safari/Chrome), so phones get a tappable summary card instead of a fragile
            embed. Desktop/tablet keep the inline preview, which works reliably there. */}
        <div className="sm:hidden bg-white rounded-xl shadow-sm p-5 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            className="w-12 h-12 mx-auto mb-3" style={{ color: brand }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-slate-600 mb-4">Your invoice document is ready to view.</p>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-12 w-full px-6 rounded-lg text-sm font-semibold text-white active:opacity-80"
            style={{ backgroundColor: brand }}
          >
            View Invoice
          </a>
        </div>

        {/* Embedded PDF preview (desktop/tablet) — single source of truth for the document content */}
        <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-hidden">
          <object data={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`} type="application/pdf" className="w-full h-[78vh]">
            <iframe src={pdfUrl} title={invoice.invoice_number} className="w-full h-[78vh]" />
            <div className="p-8 text-center text-sm text-slate-500">
              Unable to display the PDF inline.{' '}
              <a href={pdfUrl} className="underline" style={{ color: brand }}>Download the invoice</a> instead.
            </div>
          </object>
        </div>

        {/* Vera AI support + all Codevertex services */}
        <PublicDocFooter
          tenantSlug={invoice.tenant_slug}
          tenantName={invoice.tenant_name}
          docNoun="invoice"
          brand={brand}
        />
      </div>
    </div>
  );
}
