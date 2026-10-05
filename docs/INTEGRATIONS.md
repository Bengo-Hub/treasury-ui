# Treasury UI - Service Integrations

**Last Updated**: 2026-08-22
**Purpose**: Document integration points for Codevertex Books (treasury-ui) with auth-service, treasury-api, and other Codevertex services.

**2026-08-22:** Fixed a treasury-api gateway-resolution bug where a tenant/platform on a **Till**
gateway (`mpesa_till`) showed "mpesa" as available (`PublicListActiveGateways` treats
`mpesa_paybill`/`mpesa_till` as interchangeable) but every `initiate` call failed with `no gateway
available for method: mpesa` (the resolver only ever looked up `GatewayMpesaPaybill`) — see
`gateways.MpesaGatewayTypeCandidates()`. Also: the `/pay` page's M-Pesa gateway card and
`MpesaPaymentModal` now render the official M-Pesa mark (`public/mpesa-logo.svg`, same file as
pos-ui's copy) and no longer repeat "M-Pesa" in the label ("STK Push" instead) since the icon
already carries the brand; the STK form now shows the exact phone number the prompt will be sent
to (live, as it's typed) instead of a generic "on your phone".

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

- **Login**: Redirect to auth-ui (accounts.codevertexafrica.com) with client_id, redirect_uri, PKCE.
- **Callback**: `/[orgSlug]/auth/callback` exchanges code for tokens; store in Zustand; redirect to dashboard.
- **Profile**: Call **SSO (auth-api)** `GET /api/v1/auth/me` with Bearer token — not treasury-api. Implemented in `lib/auth/api.ts` (`fetchProfile(accessToken)`) and `hooks/useMe.ts` (TanStack Query). Use for sidebar (platform section for super_admin).
- **Logout**: Clear local state; redirect to auth logout or landing.

---

## Treasury API

- **Base URL**: `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_TREASURY_API_URL` (default: `https://booksapi.codevertexafrica.com`).
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
| `useVerifyTenantPayoutConfig` | `POST /api/v1/platform/payout-configs/{tenantID}/verify` | Verify a tenant's payout destination (Platform > Analytics, Revenue by Tenant) |
| `payheroApi` (`lib/api/payhero.ts`) | `/api/v1/{tenant}/gateways/payhero/...` | PayHero setup: mode, Team, invite, KYC, channels, routing (default, per reference type, per outlet, personal collections), personal channels (`setChannelPersonal`, platform tenant only, shown when `is_platform`), payment links, wallet balance |
| `payheroApi.platformSettings` / `teams` | `/api/v1/platform/gateways/payhero/settings`, `/teams` | Platform PayHero organization and every tenant's setup |
| `escrowApi` (`lib/api/escrow.ts`) | `/api/v1/{tenant}/escrow/...`, `/api/v1/pay/{tenant}/escrow/{code}` | Escrow pots, release, cancel and refund, commission rule, terms; public pot page |
| `webhooksApi` (`lib/api/webhooks.ts`) | `/api/v1/{tenant}/developer/webhooks/...` | Tenant outbound webhook endpoints, deliveries, replay, ping, secret rotation |
| `approvalsApi.payoutPolicies` (`lib/api/approvals.ts`) | `/api/v1/{tenant}/treasury/payout-policies` | Payout approval policy per flow (threshold, always, auto) |

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
- [x] Invoices, Quotations, Expenses, Bills, Vendors, Journals, Reports, Tax (codes/periods/eTIMS devices), Accounts, Reconciliation, Referrals pages
- [ ] Budgets page. Corrected 2026-09-27: create, list, approve and recompute only, with no edit or delete, and actuals show 0 because no `account_id` is sent. In progress (plan budgets-planning-projects-bi-2026-09-27).
- [x] CSV export for transactions (exportTransactionsCSV → GET /api/v1/{tenant}/analytics/transactions/export)
- [x] Payout management (rider/merchant payouts) (verified 2026-09-27)
- [x] eTIMS transmission status UI (Tax page eTIMS sync tab)
- [x] Transaction cost column per transaction row
- [x] Reconciliation and reporting views (Recharts on platform analytics and Business Insights)
- [x] Branding (from the tenant record, not notifications-api)
- [x] PayHero (2026-10): Settings > Payments > PayHero tab; platform PayHero panel. (The first version listed each PayHero rail as its own pay page method; since 2026-10-05 they are tabs in `PayHeroPaymentModal`, below.)
- [x] Personal collections (2026-10-05): Settings > Payments > PayHero channels can be marked personal with a payee name (platform owner); routing has a Personal collections row and business selects never offer personal channels; Invoices scope **Personal (off the company books)** lists off-books invoices; escrow pot page downloads the statement PDF (`escrowApi.statementDocument`)
- [x] PayHero shared account (2026-10-05): platform PayHero panel Root account channels (assign/unassign via `payheroApi.assignChannel`), fee bearer setting, pay page `PayHeroFeeNotice` (quote `payheroApi.feeQuote`), PayHero tab locked without `mpesa_integration` (shared `UpgradePrompt`, also used by the eTIMS lock); tenant channel claim removed
- [x] PayHero as its own gateway (2026-10-05, later): the pay page lists `paystack`, `payhero`, `mpesa` (Daraja only), `wallet`, `cod`. The PayHero card opens `PayHeroPaymentModal` (rails from the gateways response's `payhero_methods` down the left, tabs on phones; the chosen rail's form on the right). The forms are the existing `MpesaPaymentModal` (`provider="payhero"`), `MobileMoneyPaymentModal` and `PayHeroCheckoutModal`, rendered as panes through `PaymentPaneContext`; card and bank wait for a button inside the shell. Every PayHero rail initiates with `gateway: "payhero"`, the M-Pesa card with `gateway: "daraja"`. Old `?gateways=` allowlists that name rails (`mpesa`, `airtel_money`, `payhero_offline`) open PayHero on those rails (`parseAllowlist` / `applyAllowlist` in `app/(public)/pay/page.tsx`). The public route has its own `QueryClientProvider` (`app/(public)/providers.tsx`); without it the fee notice crashed the page ("This page couldn't load").
- [x] Provider logos (2026-10-05): M-Pesa, Paystack, PayHero, Airtel Money and MTN MoMo marks come only from `@bengo-hub/shared-ui-lib` (`brand-logos`, v0.1.96); `components/payments/logos` keeps just the COD and wallet glyphs. The gateway catalog shows the brand marks.
- [x] Fee Configuration (2026-10-05): the platform fee rule list reads `data` (it read `fee_rules` and was always empty), filters by gateway, and shows PayHero's published schedule with Sync now (`PayHeroTariff`, moved from System Gateways); the synced bands stay out of the hand-entered rule table.
- [x] Escrow pots (`/{org}/escrow`, public `/pay/pot?tenant=&code=`) and the payout approval policies card on Approvals > Rules
- [x] Transactions: gateway filter, amount mismatch shown under the status, manual confirm only with `treasury.payments.manage`
- [x] A payout refused with code `no_tenant_payout_account` shows where to connect the tenant's own payout account (added to the error message by the API client)
