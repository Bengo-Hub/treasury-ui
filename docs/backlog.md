# Treasury UI Backlog

**Last updated:** 2026-09-27. Built by checking every open item in `docs/plan.md`, `docs/sprints/*.md`, `docs/INTEGRATIONS.md` and `docs/mvp-critical-path.md` against the code. Each item names the doc it came from. Items marked **In progress (plan budgets-planning-projects-bi-2026-09-27)** are being built now under `.claude/plans/budgets-planning-projects-bi-2026-09-27.md`; do not start them separately. Backend gaps live in `finance-service/treasury-api/docs/backlog.md`.

## Budgets, planning and BI

All In progress (plan budgets-planning-projects-bi-2026-09-27):

- Sidebar and page gating (decided 2026-09-27): Budgets gate on the feature `budgeting`, Planning on `financial_planning` and BI reports on `bi_reports`, plus the matching `treasury.budgets.*` and `treasury.planning.*` permissions. Source: the plan's Progress section.

- Budgets page has no edit or delete, and treasury-api has no update or delete route. Source: sprint-mvp-launch.md (was wrongly ticked as full CRUD).
- Budget form never sends `account_id`, `cost_center_id` or `project_id`, so every UI-created budget shows 0 actuals; the account picker imports in `budgets/page.tsx` are dead code. Source: sprint-mvp-launch.md.
- Missing badge variants for `submitted` and `rejected` budgets. Source: budgets plan Phase 0.
- Budget builder grid (accounts by months), spread tools, control and alert settings, versions and approval timeline. Source: budgets plan Phase 6.
- Budget detail with variance chart, drill-down to ledger lines and export. Source: budgets plan Phase 6.
- Planning section: 13-week cash forecast, rolling forecast, scenarios. Source: budgets plan Phase 6.
- BI section with nine reports on a shared `ReportShell`. Source: budgets plan Phase 6.
- Project and cost center pickers on expense, bill and invoice forms. Source: budgets plan Phase 2.
- Over-budget warn and stop banners on expense, bill and PO flows. Source: budgets plan Phase 6.

## Documents

- Shared public page shell for `/q/[token]` and `/i/[token]`. Source: sprint-2-financial-docs-platform.md Phase 1 and 2.
- Number and currency format modal; show and hide columns modal with reordering. Source: sprint-2 Phase 1.
- Dates, signature and advanced options sections in the document form. Source: sprint-2 Phase 1.
- Config-file system for document types (was replaced by props; only needed if the props approach becomes unwieldy). Source: sprint-2 Phase 1.
- Per-line "Select Sales Ledger" on the invoice form. Source: sprint-2 Phase 4.
- Convert to sales order through ordering-backend (needs the treasury-api call first). Source: sprint-2 Phase 4.

## Payments

- Detailed payment intent view. Source: plan.md Sprint 2.

## Quality

- Unit tests for gateway CRUD and E2E tests for add, edit and delete gateway. Source: sprint-1-payment-orchestration.md T7.
- Storybook stories for key components. Source: sprint-1 T7.
- Loading skeletons and breadcrumbs across pages. Source: sprint-1 T2 and T4.
- Device testing (phone, tablet, desktop) and a performance check (LCP, FID). Source: sprint-1 T6 and deployment checklist.
- `docs/architecture.md` with the gateway flow (file does not exist). Source: sprint-1 T7.
