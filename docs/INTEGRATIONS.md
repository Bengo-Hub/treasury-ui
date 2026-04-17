# Treasury UI - Service Integrations

**Last Updated**: April 2026  
**Purpose**: Document integration points for Codevertex Books (treasury-ui) with auth-service, treasury-api, and other BengoBox services.

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

- **Base URL**: `NEXT_PUBLIC_TREASURY_API_URL` or production (booksapi.codevertexitsolutions.com).
- **Gateways**: Platform gateways (super_admin) and tenant gateways; CRUD via treasury-api endpoints.
- **Transactions**: List/filter payment transactions; reconcile status.
- **Settlements**: Payout and settlement batches; status and reports.
- **Payment workflow**: Invoice-first — services create intents with `payment_method: "pending"`, then redirect users to the **shared pay page** (`/pay`). Pay page shows invoice summary and gateway options; modals (Paystack, M-Pesa, COD) support QR and “I paid at till”. See [shared-docs/payment-workflow.md](../../../shared-docs/payment-workflow.md).

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
- [x] Platform equity page: real Paystack balance (usePlatformBalance → GET /platform/balance), editable URLs, real payout schedule
- [x] Fee configuration wired to real fee rules API (usePlatformFeeRules)
- [x] Invoices, Quotations, Expenses, Bills, Vendors, Journals, Reports, Tax, Budgets, Accounts, Reconciliation, Referrals pages
- [ ] Payout management (rider/merchant payouts)
- [ ] Export (CSV/Excel) for transactions
- [ ] Reconciliation and reporting views (enhanced)
