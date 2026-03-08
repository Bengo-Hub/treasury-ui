# Treasury UI - Sprint MVP Launch

**Target**: March 2026 (aligned with BengoBox MVP)  
**Status**: In Progress  
**Goal**: Ship Codevertex Books (treasury-ui) with SSO, gateway management, and basic transaction visibility for platform and tenant admins.

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

### Should Have (P1)

- [x] Settlements list and detail — wired to GET /api/v1/{tenant}/payout/history
- [ ] Payout management (rider/merchant)
- [ ] Export (CSV/Excel) for transactions
- [ ] Branding from notifications-api (logo, theme)

### Nice to Have (P2)

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
- [Treasury API Plan](../../treasury-api/plan.md)
- [Shared MVP Critical Path](../../../shared-docs/mvp-critical-path.md)
