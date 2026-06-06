/**
 * Shared footer for public document pages (invoices, quotations, receipts, …).
 * Renders:
 *  - a Vera AI support callout + the Vera chat widget (24/7 query handling)
 *  - the full Codevertex Power Suite product directory ("all our services")
 *  - the platform / copyright strip
 *
 * Server component: the Vera widget is emitted as a plain <script> so it executes
 * on the public page (client components don't run inline <script> tags).
 * Hosts are the authoritative production ingress hostnames — do not guess.
 */

const PRODUCTS: { label: string; href: string }[] = [
  { label: 'Books', href: 'https://books.codevertexitsolutions.com' },
  { label: 'Ordering', href: 'https://ordersapp.codevertexitsolutions.com' },
  { label: 'POS', href: 'https://pos.codevertexitsolutions.com' },
  { label: 'Inventory', href: 'https://inventory.codevertexitsolutions.com' },
  { label: 'Logistics', href: 'https://logistics.codevertexitsolutions.com' },
  { label: 'ERP', href: 'https://erp.codevertexitsolutions.com' },
  { label: 'Projects', href: 'https://projects.codevertexitsolutions.com' },
  { label: 'TruLoad', href: 'https://truload.codevertexitsolutions.com' },
  { label: 'ISP Billing', href: 'https://ispbilling.codevertexitsolutions.com' },
  { label: 'Plans', href: 'https://pricing.codevertexitsolutions.com' },
  { label: 'AI & Automation', href: 'https://marketflow.codevertexitsolutions.com' },
];

const VERA_WIDGET_SRC = 'https://marketflow.codevertexitsolutions.com/widget/chat.js';
const VERA_API_URL = 'https://marketflowapi.codevertexitsolutions.com';

interface PublicDocFooterProps {
  /** Issuing tenant slug — drives the Vera widget tenant context. */
  tenantSlug?: string;
  /** Issuing tenant display name — used in the assistant title/copy. */
  tenantName?: string;
  /** Document noun for the callout copy, e.g. "invoice", "quotation". */
  docNoun?: string;
  /** Brand accent colour (hex). */
  brand?: string;
}

export function PublicDocFooter({
  tenantSlug,
  tenantName,
  docNoun = 'document',
  brand = '#6D28D9',
}: PublicDocFooterProps) {
  const assistant = tenantName ? `${tenantName} Assistant` : 'Vera Assistant';

  return (
    <>
      {/* Vera AI support callout */}
      {tenantSlug && (
        <div className="mt-6 bg-white shadow-sm rounded-xl p-5 sm:p-6 print:hidden flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: brand }}
            aria-hidden
          >
            AI
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">Questions about this {docNoun}?</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Chat with <span className="font-medium text-slate-700">Vera</span>, your AI assistant — available 24/7 for
              queries about this {docNoun}, pricing, payments and delivery. Look for the chat bubble in the corner.
            </p>
          </div>
        </div>
      )}

      {/* Platform footer — all Codevertex Power Suite services */}
      <div className="mt-8 border-t border-slate-200 pt-8 pb-12 print:hidden">
        <div className="text-center mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-1">Powered by</p>
          <p className="text-sm font-semibold text-slate-700">Codevertex Power Suite</p>
          <p className="text-xs text-slate-400 mt-1">
            One integrated platform. One SSO identity. Zero friction between your tools.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs text-slate-400 max-w-2xl mx-auto px-4">
          {PRODUCTS.map((p) => (
            <a
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 hover:text-slate-700 transition-colors"
            >
              {p.label}
            </a>
          ))}
        </div>
        <p className="text-center text-xs text-slate-300 mt-4">
          &copy; {new Date().getFullYear()} Codevertex Africa Limited &nbsp;·&nbsp; OAuth 2.0 &nbsp;·&nbsp; AES-256 &nbsp;·&nbsp; Multi-tenant SSO
        </p>
      </div>

      {/* Vera AI chatbot widget */}
      {tenantSlug && (
        // eslint-disable-next-line @next/next/no-sync-scripts
        <script
          src={VERA_WIDGET_SRC}
          data-tenant={tenantSlug}
          data-mode="tenant"
          data-api-url={VERA_API_URL}
          data-widget-title={assistant}
          data-primary-color={brand}
          async
        />
      )}
    </>
  );
}
