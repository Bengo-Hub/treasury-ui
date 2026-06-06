import { notFound } from 'next/navigation';
import { fetchPublicInvoice, type PublicInvoice } from '@/lib/api/invoices';
import { InvoiceActions } from './InvoiceActions';

interface Props {
  params: Promise<{ token: string }>;
}

const TREASURY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://booksapi.codevertexitsolutions.com';
const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://sso.codevertexitsolutions.com';

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
  const fmt = (v: number) => Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const badge = statusBadge(invoice.status, invoice.payment_status);

  const brand = (await fetchBrandColor(invoice.tenant_slug)) || '#6b21a8';
  const pdfUrl = `${TREASURY_API_URL}/api/v1/public/invoices/${token}/pdf`;

  // Durable pay link (reuses the existing /pay page; fresh Paystack session per visit).
  const isPaid = invoice.payment_status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'void';
  let payUrl: string | undefined;
  if (!isPaid && totalAmount > 0) {
    const q = new URLSearchParams({
      tenant: invoice.tenant_slug,
      amount: String(totalAmount),
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

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Summary header */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Invoice from</p>
            <h1 className="text-xl font-bold text-slate-800">{invoice.tenant_name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {invoice.currency} {fmt(totalAmount)}
            </p>
            {invoice.due_date && (
              <p className="text-xs text-slate-400">
                Due {new Date(invoice.due_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Embedded PDF preview — single source of truth for the document content */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <object data={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`} type="application/pdf" className="w-full h-[78vh]">
            <iframe src={pdfUrl} title={invoice.invoice_number} className="w-full h-[78vh]" />
            <div className="p-8 text-center text-sm text-slate-500">
              Unable to display the PDF inline.{' '}
              <a href={pdfUrl} className="underline" style={{ color: brand }}>Download the invoice</a> instead.
            </div>
          </object>
        </div>

        {/* Platform footer */}
        <div className="mt-8 border-t border-slate-200 pt-6 pb-10 text-center print:hidden">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-1">Powered by</p>
          <p className="text-sm font-semibold text-slate-700">Codevertex Power Suite</p>
          <p className="text-xs text-slate-300 mt-2">
            &copy; {new Date().getFullYear()} Codevertex IT Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
