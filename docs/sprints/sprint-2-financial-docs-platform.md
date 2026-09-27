# Sprint 2: Financial Documents Platform

**Duration:** 2026-05-23 → ongoing
**Goal:** Centralized config-driven financial documents UI for all document types (Quotation, Invoice, Proforma Invoice, Credit Note, Sales Order, Delivery Challan, Payment Receipt) with shared components, integrations, and public share pages.
**Status:** Partially done (verified against code 2026-09-27). All document pages, the shared list and create views, payments, downloads and delivery challans are live. The config-file system, shared public page shell, number format and column modals, signature and advanced-option sections, per-line sales ledger and the ordering S2S call were not built. See `docs/backlog.md`.
**Last Updated:** 2026-09-27

**Builds on:** Sprint 1 (Payment Orchestration) — SSO, gateways, transaction monitoring complete.

---

## Sprint Overview

**Objective:** Replace module-specific duplicate components with a centralized shared template architecture. All 7 document types reuse `SharedDocumentForm`, `SharedDocumentList`, `SharedDocumentPreview` driven by per-type `DocumentConfig` objects. Blob download pattern (TruLoad-adapted) for authenticated PDF downloads.

**Success Criteria:**
- All document types render from shared components with no module-specific form/list code
- Product catalog search works in all line item rows
- CRM contact search works in all From/For party sections
- Public `/q/[token]` and `/i/[token]` pages serve formatted documents with PDF/CSV/XLSX downloads
- Payment Receipt 3-step flow works end-to-end
- `pnpm build` passes with zero TypeScript errors

---

## Completed (from Sprint 1 continuation)

### Quotations Foundation

- [x] `app/[orgSlug]/quotations/page.tsx` — ~180-line tab router
- [x] `_components/FiltersPanel.tsx` — collapsible filter panel + Applied Filters chips
- [x] `_components/CreateQuotationView.tsx` — create/edit form with CRM contact search + org branding
- [x] `_components/QuotationList.tsx` — table, expand line items, full context menu
- [x] `_components/QuotationPreview.tsx` — slide-in preview panel
- [x] `_components/QuotationStats.tsx` — lifetime stats block + per-status summary
- [x] `_components/QuotationGraph.tsx` — monthly line chart (recharts)
- [x] `_components/ColumnManager.tsx` — Show/Hide Columns modal
- [x] `_components/ClientsTab.tsx` — Manage Clients tab
- [x] `_components/TagReportTab.tsx` — Tag-wise Report tab

### API & Hooks

- [x] `lib/api/invoices.ts` — quotation + invoice CRUD, stats, public fetch
- [x] `lib/api/crm.ts` — CRM contact search
- [x] `hooks/use-invoices.ts` — all TanStack Query hooks
- [x] `hooks/use-crm-contacts.ts` — debounced CRM contact search
- [x] `hooks/use-org-branding.ts` — tenant name/logo/address
- [x] `app/api/crm/contacts/route.ts` — Next.js CRM proxy route

### Public Share Pages

- [x] `app/(public)/q/[token]/page.tsx` — server-rendered public quotation page
- [x] `app/(public)/q/[token]/_components/QuotationActions.tsx` — PDF/CSV/XLSX/Copy Link action bar
- [x] `lib/utils/number-to-words.ts` — total amount in words

---

## In Progress / Next

### Phase 1 — Shared Document Component Library

Create `src/components/documents/` structure:

#### Core templates
- [x] `SharedDocumentList.tsx`: config-driven list: columns, row actions, filters, stats, summary, graph, column manager, expand line items (~380 lines)
- [x] `SharedDocumentForm.tsx`: shipped as `SharedDocumentCreateView.tsx` and `SharedInvoiceCreateView.tsx` (verified 2026-09-27)
- [x] `SharedDocumentPreview.tsx`: shipped as `DocPreview.tsx`
- [ ] `SharedPublicPage.tsx`: public page shell (used by /q/[token] and /i/[token]). Not built; each public page has its own layout.
- [x] `RecordPaymentModal.tsx`: 3-step: Select Client → Add Payment Records → Settle Unpaid Invoices
- [ ] `NumberFormatModal.tsx` — Number/Currency Format (4 formats, 6 decimal opts, 2 round-off toggles)
- [ ] `ShowHideColumnsModal.tsx` — CSV + Table toggles per column, drag-to-reorder

#### Sections
- [x] `sections/LineItemsSection.tsx`: line items table + product catalog combobox per row
- [x] `sections/TotalsSection.tsx`: Amount, TAX, Add Discounts (Total/Item-wise, Divide Equally/Weighted), Add Additional Charges (With/Without Tax), Summarise Total Qty
- [ ] `sections/PartiesSection.tsx`: configurable From/For labels + CRM contact combobox. Not a separate section; parties are picked inside the create views with `CreateClientModal`.
- [ ] `sections/DatesSection.tsx` — primary + optional secondary date pickers with configurable labels
- [x] `sections/TransportSection.tsx`: Transporter, Distance, Mode, Doc No/Date, Vehicle Type/Number
- [x] `sections/ShippingSection.tsx`: shipped as `ShippingTransportSection.tsx`
- [ ] `sections/SignatureSection.tsx` — Upload + Use Signature Pad + label
- [x] `sections/TermsSection.tsx`: shipped as `TermsNotesSection.tsx`
- [x] `sections/NotesSection.tsx`: part of `TermsNotesSection.tsx`
- [ ] `sections/AdvancedOptionsSection.tsx` — display toggles (Show SKU, Show Serial Numbers, etc.)

#### Config system

> Verified 2026-09-27: no `config/` folder exists. Document types are handled by props on the shared list and create views instead of config files.

- [ ] `config/document-config.types.ts` — `DocumentConfig` interface
- [ ] `config/quotation.config.ts`
- [ ] `config/invoice.config.ts`
- [ ] `config/proforma.config.ts`
- [ ] `config/credit-note.config.ts`
- [ ] `config/sales-order.config.ts`

### Phase 2 — Refactor Existing Modules

- [x] Refactor `app/[orgSlug]/quotations/` to use `SharedDocumentList` + `SharedDocumentForm` with `quotation.config.ts`; verify no UX regression
- [x] Refactor `app/[orgSlug]/invoices/` to use shared components with `invoice.config.ts`
- [ ] Refactor `app/(public)/q/[token]/page.tsx` to use `SharedPublicPage` shell

### Phase 3 — New Module Pages

- [x] `app/[orgSlug]/proforma-invoices/page.tsx`: thin wrapper (~60 lines) + `proforma.config.ts`
- [x] `app/[orgSlug]/credit-notes/page.tsx`: thin wrapper + `credit-note.config.ts`
- [x] `app/[orgSlug]/sales-orders/page.tsx`: thin wrapper + `sales-order.config.ts`
- [x] `app/[orgSlug]/delivery-challans/page.tsx`: logistics-api tasks list + create action
- [x] `app/[orgSlug]/payment-receipts/page.tsx`: `RecordPaymentModal` 3-step flow
- [x] `app/(public)/i/[token]/page.tsx`: public invoice page (own layout, no shared shell)
- [x] Add all 6 new routes to `src/components/sidebar.tsx` under "Sales & Invoices"

### Phase 4 — Integrations

#### Product Catalog (Inventory API)
- [x] `src/lib/api/inventory.ts`: `searchProducts(tenant, query)` → inventory-api GET
- [x] `src/hooks/use-inventory.ts`: `useProductSearch(tenant, query)` debounced hook
- [x] Wire into `LineItemsSection.tsx` combobox; auto-fills rate + tax rate on select

#### Sales Ledger (Invoice form only)
- [x] `src/hooks/use-accounts.ts`: `useChartOfAccounts(tenant)`
- [ ] Wire per-line "Select Sales Ledger" in invoice form via `LineItemsSection.tsx`

#### Bank Accounts (Payment Receipts)
- [x] Wire `RecordPaymentModal.tsx` "Deposited To" → `GET /{tenant}/banking/accounts`

#### Authenticated PDF Blob Download (TruLoad pattern)
- [x] `src/lib/api/invoices.ts`: `downloadQuotationPDF(tenant, id): Promise<Blob>`, `downloadInvoicePDF(tenant, id): Promise<Blob>`
- [x] `src/hooks/use-invoices.ts`: `useDownloadQuotationPDF(tenant)`, `useDownloadInvoicePDF(tenant)` mutations using `URL.createObjectURL` → `<a>.click()` → `revokeObjectURL`
- [x] Wire "Download" row action in `SharedDocumentList` with blob download

#### Delivery Challan S2S
- [x] `createDeliveryChallan` lives in `src/lib/api/invoices.ts`, calling treasury-api, which calls logistics-api
- [x] Wire "Generate Delivery Challan" quotation row action

#### Sales Order S2S
- [ ] `src/lib/api/ordering.ts`: `createSalesOrder(tenant, quotationId)`. Not built; the UI converts to a local treasury sales order document, and treasury-api does not call ordering-backend.
- [x] Wire "Convert to Sales Order" quotation row action (local conversion)

#### Send Email
- [x] "Send Email" row action → modal (To, CC, Subject, Message) → `POST /{tenant}/quotations/{id}/send`

### Phase 5 — Build & Deploy

- [x] `pnpm build` → zero TypeScript errors
- [x] Push to remote → CI passes
- [x] `kubectl rollout status deployment/treasury-ui -n treasury`

---

## Deferred (Sprint 3+)

- Approval workflow (Workflow Name, Current Assignee, Current Stage, Current Status columns)
- AI OCR scanning
- Tag management inline
- Bulk Upload CSV wizard
- Design & Share step 2
- Audit Trail + Acceptance History + Linked Documents
- Recurring automation
- Number Format preference persistence
- Client Advance payment type
- TDS Withheld in payment settlement
- Reverse Charge Applicable column

---

## File Map

### Shared Components (new)
| File | Purpose |
|------|---------|
| `src/components/documents/SharedDocumentList.tsx` | Config-driven list |
| `src/components/documents/SharedDocumentForm.tsx` | Config-driven form |
| `src/components/documents/SharedDocumentPreview.tsx` | Config-driven preview |
| `src/components/documents/SharedPublicPage.tsx` | Public page shell |
| `src/components/documents/RecordPaymentModal.tsx` | 3-step payment recording |
| `src/components/documents/NumberFormatModal.tsx` | Number/Currency Format modal |
| `src/components/documents/ShowHideColumnsModal.tsx` | Column manager |
| `src/components/documents/sections/LineItemsSection.tsx` | Line items + product search |
| `src/components/documents/sections/TotalsSection.tsx` | Discounts + charges |
| `src/components/documents/sections/PartiesSection.tsx` | From/For + CRM |
| `src/components/documents/sections/TransportSection.tsx` | Transport details |
| `src/components/documents/sections/ShippingSection.tsx` | Shipped From/To |
| `src/components/documents/sections/SignatureSection.tsx` | Signature upload/pad |
| `src/components/documents/sections/TermsSection.tsx` | Editable terms |
| `src/components/documents/sections/NotesSection.tsx` | Rich text notes |
| `src/components/documents/sections/AdvancedOptionsSection.tsx` | Display toggles |
| `src/components/documents/config/document-config.types.ts` | DocumentConfig interface |
| `src/components/documents/config/quotation.config.ts` | Quotation config |
| `src/components/documents/config/invoice.config.ts` | Invoice config |
| `src/components/documents/config/proforma.config.ts` | Proforma config |
| `src/components/documents/config/credit-note.config.ts` | Credit Note config |
| `src/components/documents/config/sales-order.config.ts` | Sales Order config |
| `src/lib/api/inventory.ts` | Product search API |
| `src/lib/api/logistics.ts` | Delivery challan API |
| `src/lib/api/ordering.ts` | Sales order API |
| `src/hooks/use-inventory.ts` | Product search hook |

### New Module Pages
| File | Purpose |
|------|---------|
| `src/app/[orgSlug]/proforma-invoices/page.tsx` | Proforma Invoice |
| `src/app/[orgSlug]/credit-notes/page.tsx` | Credit Note |
| `src/app/[orgSlug]/sales-orders/page.tsx` | Sales Order |
| `src/app/[orgSlug]/delivery-challans/page.tsx` | Delivery Challan |
| `src/app/[orgSlug]/payment-receipts/page.tsx` | Payment Receipt |
| `src/app/(public)/i/[token]/page.tsx` | Public Invoice page |

---

## Key Design Decisions

- **Config-driven shared components:** Single `SharedDocumentForm` + `SharedDocumentList` for all doc types. `DocumentConfig` object controls: labels, visible sections (showTransport, showSalesLedger, showRecurring), row actions, table columns, statuses.
- **TruLoad blob download pattern:** Authenticated downloads use `URL.createObjectURL(blob)` → `<a>.click()` → `revokeObjectURL`. Public pages use direct `<a href>` to treasury-api public endpoints.
- **CRM owns customer data:** `PartiesSection.tsx` handles CRM search uniformly across all doc types. Selecting a contact populates `customer_id`, `customer_name`, `customer_email`.
- **Invoice sub-types share `/invoices` API:** Proforma, Credit Note use `invoiceTypeFilter` in config to pass `?type=proforma` / `?type=credit_note` to existing invoice list endpoint.
- **Public pages are server components:** `/q/[token]` and `/i/[token]` fetch via `TREASURY_API_URL` (server-side). Interactive buttons in `'use client'` child components only.
