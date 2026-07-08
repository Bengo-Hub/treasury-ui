# Treasury UI - Service Integrations

**Last Updated**: 2026-05-09  
**Purpose**: Document integration points for Codevertex Books (treasury-ui) with auth-service, treasury-api, and other Codevertex services.

---

## Integration Overview

Treasury UI is the central financial portal. It integrates with:

| Service | Integration | Purpose |
|---------|-------------|---------|
| **Auth (SSO)** | OIDC/OAuth2 | Login, GET /me for roles/permissions (e.g. super_admin for platform gateways) |
| **Treasury API** | REST | Gateways CRUD, transactions, settlements, payment intents |
| **Notifications API** | REST (optional) | Branding, tenant theme (GET /api/v1/{tenantId}/branding) |

---

## Auth Service (SSO)

- **Login**: Redirect to auth-ui (accounts.codevertexitsolutions.com) with client_id, redirect_uri, PKCE.
- **Callback**: `/[orgSlug]/auth/callback` exchanges code for tokens; store in Zustand; redirect to dashboard.
- **Profile**: Call **SSO (auth-api)** `GET /api/v1/auth/me` with Bearer token — not treasury-api. Implemented in `lib/auth/api.ts` (`fetchProfile(accessToken)`) and `hooks/useMe.ts` (TanStack Query). Use for sidebar (platform section for super_admin).
- **Logout**: Clear local state; redirect to auth logout or landing.

---

## Treasury API

- **Base URL**: `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_TREASURY_API_URL` (default: `https://booksapi.codevertexitsolutions.com`).
- **Auth**: Bearer token from auth-service JWT. S2S calls from other services use `X-API-Key: {INTERNAL_SERVICE_KEY}`.
- **Gateways**: Platform gateways (super_admin) and tenant gateways; CRUD via treasury-api endpoints (`/api/v1/platform/gateways`, `/{tenant}/gateways`).
- **Transactions**: List/filter payment transactions via `GET /api/v1/{tenant}/analytics/transactions`; summary via `GET /api/v1/{tenant}/analytics/summary`.
- **Settlements**: Payout history via `GET /api/v1/{tenant}/payout/history`.
- **Payment workflow**: Invoice-first — services create intents with `payment_method: “pending”`, then redirect users to the **shared pay page** (`/pay`). Pay page shows invoice summary and gateway options; modals (Paystack, M-Pesa, COD) support QR and “I paid at till”. See [shared-docs/payment-workflow.md](../../../shared-docs/payment-workflow.md).
- **S2S payment intent endpoint** (used by pos-api, ordering-backend, etc.): `POST /api/v1/s2s/{tenant}/payments/intents` with `X-API-Key` header. Response includes `intent_id` and gateway-specific fields (`checkout_request_id` for M-Pesa, `authorization_url` for Paystack).
- **eTIMS**: treasury-ui hosts the Tax page (`/{tenant}/tax`) showing `TaxCode`, `TaxPeriod`, `EtimsDevice` tabs. treasury-api owns all KRA eTIMS transmission — pos-api and other services do NOT call KRA directly.

### Key API Endpoints Called by Treasury UI

| Hook | Endpoint | Description |
|------|----------|-------------|
| `useAnalyticsSummary` | `GET /api/v1/{tenant}/analytics/summary` | Dashboard KPIs |
| `useTransactions` | `GET /api/v1/{tenant}/analytics/transactions` | Transaction list with filters |
| `exportTransactionsCSV` | `GET /api/v1/{tenant}/analytics/transactions/export` | CSV export |
| `usePayoutHistory` | `GET /api/v1/{tenant}/payout/history` | Settlement/payout list |
| `usePlatformGateways` | `GET /api/v1/platform/gateways` | Platform gateway list |
| `useTestPlatformGateway` | `POST /api/v1/platform/gateways/{id}/test` | Test gateway |
| `useTenantGateways` | `GET /api/v1/{tenant}/gateways` | Tenant gateway list |
| `usePlatformBalance` | `GET /api/v1/platform/balance` | Live Paystack platform balance |
| `usePlatformFeeRules` | `GET /api/v1/platform/fee-rules` | Platform fee rules |
| `useEquity` | `GET /api/v1/platform/equity-holders` | Equity holder list |
| `useInvoices` | `GET /api/v1/{tenant}/invoices` | Invoice list/CRUD |
| `useTax` | `GET /api/v1/{tenant}/tax/codes` | Tax codes |

---

## Payment Gateway Ownership

Payment gateway configuration is **owned by treasury-api and treasury-ui**. Auth-ui no longer hosts gateway CRUD; it redirects platform admins to treasury-ui (Codevertex Books) for gateway management.

---

## Implementation Checklist

- [x] SSO integration (useMe, auth callback, 401 → SSO)
- [x] Tenant context from [orgSlug] or NEXT_PUBLIC_TENANT_SLUG
- [x] Gateways and platform gateways UI (useTenantGateways, usePlatformGateways)
- [x] Transactions list wired to treasury-api (useTransactions, filters: status, payment_method, from, to)
- [x] Dashboard metrics wired to treasury-api (useAnalyticsSummary, useTransactions for recent)
- [x] Settlements list wired to treasury-api (usePayoutHistory → GET /api/v1/{tenant}/payout/history)
- [x] Platform equity page: real Paystack balance (usePlatformBalance → GET /api/v1/platform/balance), editable URLs, real payout schedule
- [x] Fee configuration wired to real fee rules API (usePlatformFeeRules)
- [x] Invoices, Quotations, Expenses, Bills, Vendors, Journals, Reports, Tax (codes/periods/eTIMS devices), Budgets, Accounts, Reconciliation, Referrals pages
- [x] CSV export for transactions (exportTransactionsCSV → GET /api/v1/{tenant}/analytics/transactions/export)
- [ ] Payout management (rider/merchant payouts)
- [ ] eTIMS transmission status UI (Sprint 8 dependency on treasury-api)
- [ ] Transaction cost column per transaction row
- [ ] Reconciliation and reporting views (enhanced Recharts dashboards)
- [ ] Branding from notifications-api (optional)
