# Sprint 2: Financial Documents Platform

**Duration:** 2026-05-23 → ongoing
**Goal:** Centralized config-driven financial documents UI for all document types (Quotation, Invoice, Proforma Invoice, Credit Note, Sales Order, Delivery Challan, Payment Receipt) with shared components, integrations, and public share pages.
**Status:** In Progress
**Last Updated:** 2026-05-23

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
- [ ] `SharedDocumentList.tsx` — config-driven list: columns, row actions, filters, stats, summary, graph, column manager, expand line items (~380 lines)
- [ ] `SharedDocumentForm.tsx` — config-driven create/edit: two-step wizard, all sections (~450 lines)
- [ ] `SharedDocumentPreview.tsx` — config-driven preview panel (~220 lines)
- [ ] `SharedPublicPage.tsx` — public page shell (used by /q/[token] and /i/[token])
- [ ] `RecordPaymentModal.tsx` — 3-step: Select Client → Add Payment Records → Settle Unpaid Invoices
- [ ] `NumberFormatModal.tsx` — Number/Currency Format (4 formats, 6 decimal opts, 2 round-off toggles)
- [ ] `ShowHideColumnsModal.tsx` — CSV + Table toggles per column, drag-to-reorder

#### Sections
- [ ] `sections/LineItemsSection.tsx` — line items table + product catalog combobox per row
- [ ] `sections/TotalsSection.tsx` — Amount, TAX, Add Discounts (Total/Item-wise, Divide Equally/Weighted), Add Additional Charges (With/Without Tax), Summarise Total Qty
- [ ] `sections/PartiesSection.tsx` — configurable From/For labels + CRM contact combobox
- [ ] `sections/DatesSection.tsx` — primary + optional secondary date pickers with configurable labels
- [ ] `sections/TransportSection.tsx` — Transporter, Distance, Mode, Doc No/Date, Vehicle Type/Number
- [ ] `sections/ShippingSection.tsx` — Shipped From/To behind "Add Shipping Details" toggle
- [ ] `sections/SignatureSection.tsx` — Upload + Use Signature Pad + label
- [ ] `sections/TermsSection.tsx` — editable list with × per item, + Add New Term/Group
- [ ] `sections/NotesSection.tsx` — rich text toolbar (Bold, Italic, Strikethrough, HR, Link, List)
- [ ] `sections/AdvancedOptionsSection.tsx` — display toggles (Show SKU, Show Serial Numbers, etc.)

#### Config system
- [ ] `config/document-config.types.ts` — `DocumentConfig` interface
- [ ] `config/quotation.config.ts`
- [ ] `config/invoice.config.ts`
- [ ] `config/proforma.config.ts`
- [ ] `config/credit-note.config.ts`
- [ ] `config/sales-order.config.ts`

### Phase 2 — Refactor Existing Modules

- [ ] Refactor `app/[orgSlug]/quotations/` to use `SharedDocumentList` + `SharedDocumentForm` with `quotation.config.ts` — verify no UX regression
- [ ] Refactor `app/[orgSlug]/invoices/` to use shared components with `invoice.config.ts`
- [ ] Refactor `app/(public)/q/[token]/page.tsx` to use `SharedPublicPage` shell

### Phase 3 — New Module Pages

- [ ] `app/[orgSlug]/proforma-invoices/page.tsx` — thin wrapper (~60 lines) + `proforma.config.ts`
- [ ] `app/[orgSlug]/credit-notes/page.tsx` — thin wrapper + `credit-note.config.ts`
- [ ] `app/[orgSlug]/sales-orders/page.tsx` — thin wrapper + `sales-order.config.ts`
- [ ] `app/[orgSlug]/delivery-challans/page.tsx` — logistics-api tasks list + create action
- [ ] `app/[orgSlug]/payment-receipts/page.tsx` — `RecordPaymentModal` 3-step flow
- [ ] `app/(public)/i/[token]/page.tsx` — public invoice page using `SharedPublicPage`
- [ ] Add all 6 new routes to `src/components/sidebar.tsx` under "Sales & Invoices"

### Phase 4 — Integrations

#### Product Catalog (Inventory API)
- [ ] `src/lib/api/inventory.ts` — `searchProducts(tenant, query)` → inventory-api GET
- [ ] `src/hooks/use-inventory.ts` — `useProductSearch(tenant, query)` debounced hook
- [ ] Wire into `LineItemsSection.tsx` combobox — auto-fills rate + tax rate on select

#### Sales Ledger (Invoice form only)
- [ ] `src/hooks/use-accounts.ts` — `useChartOfAccounts(tenant)`
- [ ] Wire per-line "Select Sales Ledger" in invoice form via `LineItemsSection.tsx`

#### Bank Accounts (Payment Receipts)
- [ ] Wire `RecordPaymentModal.tsx` "Deposited To" → `GET /{tenant}/banking/accounts`

#### Authenticated PDF Blob Download (TruLoad pattern)
- [ ] `src/lib/api/invoices.ts` — `downloadQuotationPDF(tenant, id): Promise<Blob>`, `downloadInvoicePDF(tenant, id): Promise<Blob>`
- [ ] `src/hooks/use-invoices.ts` — `useDownloadQuotationPDF(tenant)`, `useDownloadInvoicePDF(tenant)` mutations using `URL.createObjectURL` → `<a>.click()` → `revokeObjectURL`
- [ ] Wire "Download" row action in `SharedDocumentList` with blob download

#### Delivery Challan S2S
- [ ] `src/lib/api/logistics.ts` — `createDeliveryChallan(tenant, quotationId)`
- [ ] Wire "Generate Delivery Challan" quotation row action

#### Sales Order S2S
- [ ] `src/lib/api/ordering.ts` — `createSalesOrder(tenant, quotationId)`
- [ ] Wire "Convert to Sales Order" quotation row action

#### Send Email
- [ ] "Send Email" row action → modal (To, CC, Subject, Message) → `POST /{tenant}/quotations/{id}/send`

### Phase 5 — Build & Deploy

- [ ] `pnpm build` → zero TypeScript errors
- [ ] Push to remote → CI passes
- [ ] `kubectl rollout status deployment/treasury-ui -n treasury`

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
