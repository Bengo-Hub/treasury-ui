# Treasury UI Backlog

**Last updated:** 2026-10-16. Built by checking every open item in `docs/plan.md`, `docs/sprints/*.md`, `docs/INTEGRATIONS.md` and `docs/mvp-critical-path.md` against the code. Each item names the doc it came from. Commit hashes are the ones after the 2026-10-14 history rewrite. Backend gaps live in `finance-service/treasury-api/docs/backlog.md`.

## Budgets, planning and BI

Done (plan budgets-planning-projects-bi-2026-09-27, verified 2026-10-16); the workflow is in `finance-service/treasury-api/docs/budgets-and-planning.md`:

- Gating: Budgets on `budgeting`, Planning on `financial_planning`, BI on `bi_reports`, with the `treasury.budgets.*` and `treasury.planning.*` permissions.
- Budgets list, builder (accounts, cost centres, months, spread evenly or like last year, templates, control and alert settings, cost-centre hint), detail (lifecycle actions, variance chart and table, drill-down from an actual to its ledger lines, version history, sub-budgets, open commitments, PDF/XLSX/CSV export), edit and delete of drafts. Commits `9244630`, `9a58a54`, `4ecffe2`, `52f1c80`, `dadfc43`.
- Planning: 13-week cash forecast with tax payments, saved scenarios, rolling forecast, tax calendar. Commits `9244630`, `cc4b15e`, `a8a6152`, `1145d32`.
- BI: Profitability by cost centre or project (outlet filter, export) and Budget Health. The other planned reports (trends, margins, working capital, burn, runway) are in Business Insights rather than a separate shell.
- Project and cost-centre pickers on expense, bill and invoice forms; over-budget dialog with approver override on expenses and bills (inventory-ui handles purchase orders). Commits `9a58a54`, `aa1d371`.

## Tax and eTIMS

Done 2026-10-17:

- The eTIMS Items tab lists only the selected outlet's catalogue. It sends `outlet_strict=1` to inventory-api and keys the query on the outlet, so switching outlet refetches. The strict rule (inventory-api `5483ce1`): stock items need a balance in the outlet's own warehouse (a shared central store does not count), a recipe shows when one of its ingredients is stocked there, and services or vouchers follow their category's use case (untagged categories are universal, so a service in an untagged category still shows everywhere).
- Item composition moved here from the KRA branch tools tab. A registered finished product (eTIMS type 2) gets an Add composition action with a component picker limited to items KRA holds stock for; the saved components show under the item name (treasury-api runbook 3.37).
- KRA notices on the dashboard (`KraNoticesBanner`) use the shared `NoticeCarousel` (shared-ui-lib v0.1.111): newest first, rotating every 15 seconds when there is more than one (paused on hover), dismissible per person on the device, cached in the browser for a week and fetched from KRA again only after that, expired notices hidden. KRA sends no end date, so a notice shows for 30 days from its registration unless the payload carries one (`lib/kra-notices.ts`).

## Vendors

Done 2026-10-16: Edit, Archive and Restore on the vendors list (`45b33db`, needs inventory-api `ec37463`); adding a vendor keeps the M-Pesa and other payment settings; a warning when a vendor matches the business's own name or KRA PIN (`e7524e1`). Create Expenditure now walks through approval and payment (`65b4aab`).

## Documents

Done 2026-10-16:

- Per-line sales ledger on invoices, notes, proformas and sales orders (`188a1ce`, needs treasury-api `de109968`). Source: sprint-2 Phase 4.
- Number format and line columns. Settings > Document Presentation sets the default per document type (number style, decimals, which columns show and their order, with a live sample row), saved in the tenant setting `documents.presentation`. The document form's Layout section can give one document its own layout (`metadata.presentation`). Needs treasury-api `aa130f8b`. Code: `src/lib/documents/presentation.ts`, `src/components/documents/PresentationEditor.tsx`. Source: sprint-2 Phase 1.
- Signature and extra date. Settings > Document Presentation has a Signature card (upload or draw, optional signatory name, which documents it prints on); the server keeps it as a PNG in object storage and prints it above the Prepared By line. The document form has an optional Extra Date with its own label (`metadata.extra_date`). Needs treasury-api `f210dd5d`. Code: `src/components/documents/SignatureCard.tsx`.
- Convert to sales order through ordering-backend: closed. The user decided sales orders stay in treasury. Source: sprint-2 Phase 4.

Done 2026-10-21:

- One public page shell for `/q/[token]` and `/i/[token]` (`f48e932`, `35af468`). `src/components/public/PublicDocShell.tsx` (server component) gives every share link the issuing tenant's brand colour and logo (resized at the edge), a sticky action bar (Download, Open, plus the page's own buttons), a summary header and the document as its PDF, so the page shows exactly what the customer downloads. The quotation page no longer re-renders the document in HTML; Accept and Decline take the tenant colour. The invoice page names the document by `invoice_type` and shows Pay now only on bills (never on credit notes, receipts or delivery documents). The public tenant lookup lives in `src/lib/api/tenant-public.ts` (no session store, safe for server components; `tenant.ts` re-exports it). Needs treasury-api `19425851`. Source: sprint-2 Phase 1 and 2.

Open:

- Config-file system for document types (was replaced by props; only needed if the props approach becomes unwieldy). Source: sprint-2 Phase 1.
- The form's Layout preview shows the tenant default only to users with `treasury.config.view`; others see a note instead (the PDF still uses the default).

## Payments

- Detailed payment intent view. Source: plan.md Sprint 2.

## Quality

- Unit tests for gateway CRUD and E2E tests for add, edit and delete gateway. Source: sprint-1-payment-orchestration.md T7.
- Storybook stories for key components. Source: sprint-1 T7.
- Loading skeletons and breadcrumbs across pages. Source: sprint-1 T2 and T4.
- Device testing (phone, tablet, desktop) and a performance check (LCP, FID). Source: sprint-1 T6 and deployment checklist.
- `docs/architecture.md` with the gateway flow (file does not exist). Source: sprint-1 T7.
