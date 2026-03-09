# Treasury UI - Sprint MVP Launch

**Target**: March 2026 (aligned with BengoBox MVP)  
**Status**: In Progress  
**Goal**: Ship Codevertex Books (treasury-ui) with SSO, gateway management, transaction visibility, and payout/equity flows for platform and tenant admins.

---

## Tenant Dashboard vs Platform Dashboard (routes and pages)

| Area | Route prefix | Pages | Who |
|------|--------------|-------|-----|
| **Tenant dashboard** | `/[orgSlug]` | Dashboard (home, metrics), Transactions, Settlements, Gateways (tenant gateway selection + payout config), Accounts, Settings | Tenant admins/staff |
| **Platform dashboard** | `/[orgSlug]/platform` | Platform gateways (activate Paystack, M-Pesa, COD; credentials), Equity (holders, royalty config, payout run, history) | super_admin only |

- Nav shows platform section only for users with `super_admin` (from auth GET /me). Platform routes protected; unauthorized users get 404/unauthorized.
- See [plan.md](../plan.md) and [ux-ui.md](../ux-ui.md).

---

## MVP Scope

### Must Have (P0)

- [x] SSO login via auth-ui (OIDC/PKCE)
- [x] Multi-tenant layout ([orgSlug], tenant from auth GET /me or env)
- [x] Platform section (gateways, fees) for super_admin only
- [x] Tenant gateways page (view/configure gateways per tenant)
- [x] Redirect from auth-ui: `/dashboard/platform/gateways` → treasury-ui (ownership moved from auth-ui)
- [x] Transactions list with date/status filters (treasury-api) — wired to GET /api/v1/{tenant}/analytics/transactions
- [x] Basic dashboard metrics (volume, success rate) — wired to GET /api/v1/{tenant}/analytics/summary and recent transactions
- [x] Settlements list and detail — wired to GET /api/v1/{tenant}/payout/history

### Should Have (P1)

- [x] Tenant payout config UI: Paystack (or gateway) payout — method dropdown (Paystack-supported), account details, threshold, cycle; show "transaction cost borne by you"
- [x] Platform gateways page: activate Paystack, M-Pesa, COD; manage credentials (secrets)
- [x] Platform equity page: add/edit equity holders and royalties; list equity payout history; payout run
- [x] Permission-based menu and action buttons (from GET /me); protect platform routes
- [x] Shared public pay page (`/pay`): invoice summary, gateway picker (Paystack, M-Pesa, COD) with official logos; payment modals with QR option and “I paid at till” (see [payment-workflow.md](../../../../shared-docs/payment-workflow.md))
- [ ] Payout management (rider/merchant)
- [ ] Export (CSV/Excel) for transactions
- [ ] Branding from notifications-api (logo, theme)

### Nice to Have (P2)

- [ ] Show transaction cost per transaction in list/detail
- [ ] Recharts dashboards (revenue by gateway, over time)
- [ ] Reconciliation tools
- [ ] Audit log viewer

---

## Definition of Done

- All P0 items implemented and tested
- Responsive layout (mobile, tablet, desktop) per [ux-ui.md](../ux-ui.md)
- Plan and [INTEGRATIONS.md](../INTEGRATIONS.md) updated with current state
- No hardcoded secrets; env-based API URLs

---

## References

- [Treasury UI Plan](../plan.md)
- [Treasury UI UX/UI](../ux-ui.md)
- [Treasury UI MVP Critical Path](../mvp-critical-path.md)
- [Treasury API Plan](../../../finance-service/treasury-api/plan.md)
- [Shared MVP Critical Path](../../../shared-docs/mvp-critical-path.md)
