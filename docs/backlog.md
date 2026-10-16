# Treasury UI Backlog

**Last updated:** 2026-10-16. Built by checking every open item in `docs/plan.md`, `docs/sprints/*.md`, `docs/INTEGRATIONS.md` and `docs/mvp-critical-path.md` against the code. Each item names the doc it came from. Commit hashes are the ones after the 2026-10-14 history rewrite. Backend gaps live in `finance-service/treasury-api/docs/backlog.md`.

## Budgets, planning and BI

Done (plan budgets-planning-projects-bi-2026-09-27, verified 2026-10-16); the workflow is in `finance-service/treasury-api/docs/budgets-and-planning.md`:

- Gating: Budgets on `budgeting`, Planning on `financial_planning`, BI on `bi_reports`, with the `treasury.budgets.*` and `treasury.planning.*` permissions.
- Budgets list, builder (accounts, cost centres, months, spread evenly or like last year, templates, control and alert settings, cost-centre hint), detail (lifecycle actions, variance chart and table, drill-down from an actual to its ledger lines, version history, sub-budgets, open commitments, PDF/XLSX/CSV export), edit and delete of drafts. Commits `9244630`, `9a58a54`, `4ecffe2`, `52f1c80`, `dadfc43`.
- Planning: 13-week cash forecast with tax payments, saved scenarios, rolling forecast, tax calendar. Commits `9244630`, `cc4b15e`, `a8a6152`, `1145d32`.
- BI: Profitability by cost centre or project (outlet filter, export) and Budget Health. The other planned reports (trends, margins, working capital, burn, runway) are in Business Insights rather than a separate shell.
- Project and cost-centre pickers on expense, bill and invoice forms; over-budget dialog with approver override on expenses and bills (inventory-ui handles purchase orders). Commits `9a58a54`, `aa1d371`.

## Vendors

Done 2026-10-16: Edit, Archive and Restore on the vendors list (`45b33db`, needs inventory-api `ec37463`); adding a vendor keeps the M-Pesa and other payment settings; a warning when a vendor matches the business's own name or KRA PIN (`e7524e1`). Create Expenditure now walks through approval and payment (`65b4aab`).

## Documents

Done 2026-10-16:

- Per-line sales ledger on invoices, notes, proformas and sales orders (`188a1ce`, needs treasury-api `de109968`). Source: sprint-2 Phase 4.
- Number format and line columns. Settings > Document Presentation sets the default per document type (number style, decimals, which columns show and their order, with a live sample row), saved in the tenant setting `documents.presentation`. The document form's Layout section can give one document its own layout (`metadata.presentation`). Needs treasury-api `aa130f8b`. Code: `src/lib/documents/presentation.ts`, `src/components/documents/PresentationEditor.tsx`. Source: sprint-2 Phase 1.
- Convert to sales order through ordering-backend: closed. The user decided sales orders stay in treasury. Source: sprint-2 Phase 4.

Open:

- Shared public page shell for `/q/[token]` and `/i/[token]`. Source: sprint-2-financial-docs-platform.md Phase 1 and 2.
- Signature (upload or draw) and a configurable second date on documents. Source: sprint-2 Phase 1.
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
