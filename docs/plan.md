# Treasury UI - Implementation Plan

## Executive Summary

**System Purpose**: The central financial management and treasury operations portal for the BengoBox ecosystem. It provides tools for managing payments, payouts, settlements, and financial reporting across all tenants and services.

**Key Capabilities**:
- **Payment Orchestration**: Monitor and manage payment intents from Ordering, Cafe, and other services.
- **Payout Management**: Handle rider payouts, merchant settlements, and vendor payments.
- **Financial Reporting**: Real-time dashboards for revenue, tax (VAT/EAC), and transaction history.
- **Integration Management**: Configure payment gateways (M-Pesa, Stripe, etc.) and bank integrations.
- **Audit & Compliance**: Detailed audit trails for all financial transactions.

---

## Technology Stack

### Frontend Framework
- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Zustand (Global State) + TanStack Query (Server State)
- **API Client**: Axios with interceptors for auth handling.
- **PWA**: `@ducanh2912/next-pwa` for service worker and manifest management.
- **Authentication**: SSO via `auth-ui` (OIDC/OAuth2)

---

## Service Boundaries

### ✅ Treasury Operations (Owned by Treasury UI)
- Payment monitoring and reconciliation.
- Payout processing and scheduling.
- Financial analytics and tax reporting.
- Payment gateway configuration.

### ✅ Shared pay page (public)
- **Route**: `/(public)/pay` — single page that shows invoice summary and **all active payment gateways** (Paystack, M-Pesa, COD) with official logos. User picks one; the corresponding payment modal opens (Paystack, M-Pesa, COD). Modals support **QR code** (e.g. Paystack authorization_url) and **“I paid at till”** (manual confirmation). Used by ordering, subscription, cafe, and treasury flows. See [shared-docs/payment-workflow.md](../../../shared-docs/payment-workflow.md).

### ❌ Customer payment initiation context
- **Flow**: Each service (ordering, cafe, subscription) creates an **invoice** (payment intent with `payment_method: "pending"`) via treasury-api, then **redirects** the user to treasury-ui `/pay` with query params (intent_id, amount, tenant, initiate_url, etc.). Payment **context** comes from the calling service; treasury-ui only renders the shared pay page and modals.

---

## Tenant Dashboard vs Platform Dashboard

- **Tenant dashboard** (routes under `/[orgSlug]`): For tenant admins and staff. Pages: **Dashboard** (home, metrics), **Transactions** (list with filters), **Settlements** (payout history), **Gateways** (view/select tenant gateways, configure tenant payout — method, account, threshold, cycle), **Accounts**, **Settings**. All data scoped to the current tenant.
- **Platform dashboard** (routes under `/[orgSlug]/platform`): For super_admin / platform admins only. Pages: **Platform gateways** (activate Paystack, M-Pesa, COD; manage credentials/secrets), **Equity** (equity holders, royalty config, payout run, payout history). Permission-gated; users without platform role see 404/unauthorized.
- **Route layout**: `/[orgSlug]` = tenant shell; `/[orgSlug]/platform` and children = platform shell. Nav shows platform section only when user has `super_admin` (from GET /me). See [ux-ui.md](ux-ui.md) and [sprint-mvp-launch.md](sprints/sprint-mvp-launch.md).

## Roadmap

### Sprint 1: Foundation & SSO
- [x] Project scaffolding with Next.js 15.
- [x] SSO integration with `auth-ui`.
- [x] Core layout with financial dashboard shell.

### Sprint 2: Payment Monitoring
- [x] Real-time transaction list with status filters (GET /api/v1/{tenant}/analytics/transactions).
- [x] Dashboard metrics and recent transactions (GET /api/v1/{tenant}/analytics/summary, transactions).
- [ ] Detailed payment intent view.
- [ ] Reconciliation tools.
- [ ] Show transaction cost per transaction where applicable.

### Sprint 3: Payouts & Settlements
- [x] Payout/settlement history (GET /api/v1/{tenant}/payout/history).
- [x] Tenant payout config UI: select Paystack (or gateway), configure payout method (dropdown: Paystack-supported methods), account details, threshold, cycle; show "transaction cost borne by you".
- [ ] Rider payout management.
- [ ] Merchant settlement dashboard.
- [ ] Integration with bank/mobile money APIs.

### Platform & Permissions
- [x] Platform section (gateways, equity) for super_admin only; redirect from auth-ui.
- [x] Platform page: activate Paystack, M-Pesa, COD; manage credentials (secrets).
- [x] Platform equity page: add/edit shareholders and royalties (name, type, %, source_services, payout method, account, threshold/frequency); list payout history.
- [x] Permission-based menu and actions (sidebar, buttons) from GET /me; protect platform routes; 404/unauthorized where defined.

**Tenant/brand (2026-03-06):** Tenant slug from `[orgSlug]` or `NEXT_PUBLIC_TENANT_SLUG`. Tenant info: auth-api `GET /api/v1/tenants/by-slug/{slug}`. Branding: notifications-api `GET /api/v1/{tenantId}/branding`. `BrandingProvider` applies logo and theme colours; Settings page links to Notifications branding.

**RBAC & TanStack Query (2026-03):** Current user from auth GET /me via `useMe` (TanStack Query, 5 min TTL). Sidebar shows platform section only for `super_admin`. AuthProvider redirects unauthenticated to SSO, 401 to SSO, and platform routes without super_admin to `/[orgSlug]/unauthorized`. 404 (`not-found.tsx`) and unauthorized page added. Gateways and platform gateways use `useTenantGateways`, `usePlatformGateways`, `useTestPlatformGateway` (TanStack Query).

**RBAC & data fetching (2026-03-06):** Roles and permissions are loaded from auth-api `GET /me` (or service API proxy) via TanStack Query with 5 min TTL (`hooks/useMe`). Used for nav visibility (sidebar platform section for super_admin) and route protection. All data fetches should use TanStack Query; `QueryClientProvider` is in `[orgSlug]/layout`. Treasury-api: Redis and NATS/outbox documented in backend plan and sprint-1-auth-rbac.

**MVP docs (March 2026):** [ux-ui.md](ux-ui.md), [sprint-mvp-launch.md](sprints/sprint-mvp-launch.md), [INTEGRATIONS.md](INTEGRATIONS.md), [mvp-critical-path.md](mvp-critical-path.md). Payment gateway configuration moved from auth-ui to treasury-ui; auth-ui redirects platform admins here.
