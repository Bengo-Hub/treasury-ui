import type { ReactNode } from 'react';
import { MediaImage } from '@/components/media-image';
import { PublicDocFooter } from '@/components/public/PublicDocFooter';
import { fetchTenantBySlug, normalizeBrandColor } from '@/lib/api/tenant-public';

/**
 * One page shell for every public document link (/q quotations, /i invoices): the issuing
 * tenant's brand colour and logo, a sticky action bar, a summary header and the document itself
 * as its PDF, so the page always shows exactly what the customer downloads (number format,
 * columns, signature and terms come from treasury's document engine, not a second renderer).
 *
 * Server component. Page-specific buttons and panels come in through `actions` and `children`;
 * both receive the brand colour so they match the chrome.
 */

const DEFAULT_BRAND = '#6b21a8';

export const publicDocButton =
  'min-h-10 inline-flex items-center px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors whitespace-nowrap';

export interface PublicDocBadge {
  label: string;
  className: string;
}

export interface PublicDocShellProps {
  tenantSlug: string;
  tenantName: string;
  /** "Invoice", "Quotation": the summary header reads "<label> from <tenant>". */
  docLabel: string;
  /** Lower-case noun for the footer copy and messages: "invoice", "quotation". */
  docNoun: string;
  docNumber: string;
  badges: PublicDocBadge[];
  /** The headline amount, already formatted with its currency. */
  amount: string;
  /** A short line under the amount ("Due 20 May 2026", "Valid until 1 June 2026"). */
  dateLine?: string;
  /** Absolute link to the document PDF (inline); "?download=true" is added for Download. */
  pdfUrl: string;
  /** Extra buttons for the action bar (Pay now, Copy link, exports). */
  actions?: (brand: string) => ReactNode;
  /** Panels under the document (accept or decline, converted notice). */
  children?: (brand: string) => ReactNode;
}

export async function PublicDocShell({
  tenantSlug,
  tenantName,
  docLabel,
  docNoun,
  docNumber,
  badges,
  amount,
  dateLine,
  pdfUrl,
  actions,
  children,
}: PublicDocShellProps) {
  const tenant = await fetchTenantBySlug(tenantSlug);
  const brand = normalizeBrandColor(tenant?.primaryColor) ?? DEFAULT_BRAND;
  const name = tenantName || tenant?.orgName || tenant?.name || '';
  const downloadUrl = `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}download=true`;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="h-1.5 w-full" style={{ backgroundColor: brand }} />

      <div
        className="sticky top-0 z-20 bg-white border-b border-slate-200 print:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-sm font-semibold text-slate-700 truncate">{docNumber}</span>
            {badges.map((b) => (
              <span key={b.label} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${b.className}`}>
                {b.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <a href={downloadUrl} className={publicDocButton}>Download</a>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={publicDocButton}>Open</a>
            {actions?.(brand)}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {tenant?.logoUrl && (
              <MediaImage
                src={tenant.logoUrl}
                alt=""
                displayWidth={48}
                loading="eager"
                className="h-12 w-12 shrink-0 rounded-lg object-contain bg-slate-50"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-400">{docLabel} from</p>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{name}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{docNumber}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{amount}</p>
            {dateLine && <p className="text-xs text-slate-400">{dateLine}</p>}
          </div>
        </div>

        {/* Phones: inline PDF embeds are unreliable on mobile browsers (blank or no preview), so
            they get a card that opens the PDF. Larger screens keep the inline preview. */}
        <div className="sm:hidden bg-white rounded-xl shadow-sm p-5 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            className="w-12 h-12 mx-auto mb-3" style={{ color: brand }} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-slate-600 mb-4">Your {docNoun} is ready to view.</p>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-12 w-full px-6 rounded-lg text-sm font-semibold text-white active:opacity-80"
            style={{ backgroundColor: brand }}
          >
            View {docLabel}
          </a>
        </div>

        <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-hidden">
          <object data={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`} type="application/pdf" className="w-full h-[78vh]">
            <iframe src={pdfUrl} title={docNumber} className="w-full h-[78vh]" />
            <div className="p-8 text-center text-sm text-slate-500">
              Unable to display the PDF inline.{' '}
              <a href={downloadUrl} className="underline" style={{ color: brand }}>Download the {docNoun}</a> instead.
            </div>
          </object>
        </div>

        {children && <div className="mt-4">{children(brand)}</div>}

        <PublicDocFooter tenantSlug={tenantSlug} tenantName={name} docNoun={docNoun} brand={brand} />
      </div>
    </div>
  );
}
