import { notFound } from 'next/navigation';
import {
  PUBLIC_TREASURY_API_URL,
  downloadInvoicePDF,
  fetchPublicInvoice,
  invoiceAmountDue,
  type PublicInvoice,
} from '@/lib/api/invoices';
import { PublicDocShell, type PublicDocBadge } from '@/components/public/PublicDocShell';

interface Props {
  params: Promise<{ token: string }>;
}

const fmt = (v: number) => Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  try {
    const inv = await fetchPublicInvoice(token);
    return {
      title: `${inv.invoice_number} | ${inv.tenant_name}`,
      description: `${DOC_LABEL[inv.invoice_type ?? ''] ?? 'Invoice'} from ${inv.tenant_name}. Total: ${inv.currency} ${fmt(parseFloat(inv.total_amount) || 0)}`,
    };
  } catch {
    return { title: 'Invoice' };
  }
}

// The share link serves every invoice-family document; name it by its type.
const DOC_LABEL: Record<string, string> = {
  proforma: 'Proforma invoice',
  credit_note: 'Credit note',
  debit_note: 'Debit note',
  tax: 'Tax invoice',
};

function statusBadge(status: string, paymentStatus: string): PublicDocBadge {
  if (paymentStatus === 'paid') return { label: 'Paid', className: 'bg-green-100 text-green-700' };
  if (paymentStatus === 'partial') return { label: 'Partially paid', className: 'bg-yellow-100 text-yellow-700' };
  if (status === 'overdue') return { label: 'Overdue', className: 'bg-red-100 text-red-700' };
  if (status === 'void' || status === 'cancelled') return { label: 'Void', className: 'bg-slate-100 text-slate-500' };
  if (status === 'sent') return { label: 'Sent', className: 'bg-blue-100 text-blue-700' };
  return { label: 'Draft', className: 'bg-slate-100 text-slate-500' };
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

  const docType = invoice.invoice_type || 'standard';
  const docLabel = DOC_LABEL[docType] ?? 'Invoice';
  // A credit note is money owed to the customer, not a bill: no pay button, no due date.
  const isCreditNote = docType === 'credit_note';
  const isVoid = invoice.status === 'cancelled' || invoice.status === 'void';

  // Durable pay link (reuses the /pay page; a fresh Paystack session per visit).
  const isClosed = invoice.payment_status === 'paid' || isVoid;
  let payUrl: string | undefined;
  if (!isCreditNote && !isClosed && balanceDue > 0) {
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

  const longDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
  let dateLine: string | undefined;
  if (isCreditNote) dateLine = invoice.invoice_date ? `Issued ${longDate(invoice.invoice_date)}` : undefined;
  else if (invoice.due_date) dateLine = `Due ${longDate(invoice.due_date)}`;

  const badge: PublicDocBadge = isCreditNote
    ? isVoid
      ? { label: 'Void', className: 'bg-slate-100 text-slate-500' }
      : { label: 'Issued', className: 'bg-blue-100 text-blue-700' }
    : statusBadge(invoice.status, invoice.payment_status);

  return (
    <PublicDocShell
      tenantSlug={invoice.tenant_slug}
      tenantName={invoice.tenant_name}
      docLabel={docLabel}
      docNoun={docLabel.toLowerCase()}
      docNumber={invoice.invoice_number}
      badges={[badge]}
      amount={`${invoice.currency} ${fmt(totalAmount)}`}
      dateLine={dateLine}
      pdfUrl={`${PUBLIC_TREASURY_API_URL}${downloadInvoicePDF(invoice.tenant_slug, token)}`}
      actions={(brand) =>
        payUrl ? (
          <a
            href={payUrl}
            className="min-h-10 inline-flex items-center px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 whitespace-nowrap"
            style={{ backgroundColor: brand }}
          >
            Pay now
          </a>
        ) : null
      }
    />
  );
}
