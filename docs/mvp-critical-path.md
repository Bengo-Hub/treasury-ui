# Treasury UI - MVP Critical Path

**Last Updated**: March 2026  
**Purpose**: Treasury-specific MVP scope and critical path; aligns with [shared-docs/mvp-critical-path.md](../../../shared-docs/mvp-critical-path.md).

---

## Treasury in BengoBox MVP

| Item | Status |
|------|--------|
| **Production domain** | `books.codevertexitsolutions.com` |
| **Auth-ui redirect** | `/dashboard/platform/gateways` → treasury-ui (gateway config owned here) |
| **SSO** | OIDC/PKCE via auth-ui; GET /me for roles (e.g. super_admin for platform section) |
| **Gateway CRUD** | Implemented in treasury-api; UI in treasury-ui (platform + tenant gateways) |

---

## Treasury MVP Scope (from sprint-mvp-launch)

### P0 — Must ship
- [x] SSO login and multi-tenant layout ([orgSlug])
- [x] Platform gateways (super_admin) and tenant gateways pages
- [x] Transactions list with filters (treasury-api)
- [x] Basic dashboard metrics (volume, success rate)

### P1 — Should have
- [x] Settlements list and detail (payout history from treasury-api)
- [x] Shared public pay page (`/pay`) with gateway picker and payment modals (Paystack, M-Pesa, COD); QR and “I paid at till” support (see [payment-workflow.md](../../../shared-docs/payment-workflow.md))
- [ ] Payout management
- [ ] Export (CSV/Excel)
- [ ] Branding from notifications-api (optional)

---

## References

- [Treasury UI Plan](plan.md)
- [Treasury UI UX/UI](ux-ui.md)
- [Sprint MVP Launch](sprints/sprint-mvp-launch.md)
- [INTEGRATIONS](INTEGRATIONS.md)
- [Shared MVP Critical Path](../../../shared-docs/mvp-critical-path.md)
