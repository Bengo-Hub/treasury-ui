# Sprint 1: Payment Orchestration Foundation

**Duration**: March 8 - March 22, 2026 (15 working days)  
**Goal**: Establish core payment gateway management and transaction monitoring interfaces  
**Status**: Done (2026-03-22, re-verified against code 2026-09-27). Features are in code. Open: gateway unit and E2E tests, Storybook, skeletons, breadcrumbs, device and performance checks. See `docs/backlog.md`.  
**Last updated**: 2026-09-27

---

## Sprint Overview

**Objective**: Build the foundation for treasury-ui payment orchestration platform, focusing on:
1. SSO integration with auth-ui
2. Payment gateway configuration interface (moved from auth-ui)
3. Basic transaction monitoring dashboard
4. Core layout and navigation

**Success Criteria**:
- ✅ Users can log in via SSO
- ✅ Platform admin can configure payment gateways (M-Pesa, Stripe, Paystack)
- ✅ Dashboard displays transaction summary (volume, success rate, value)
- ✅ Gateway management UI follows Codevertex design patterns
- ✅ Responsive design works on mobile/tablet/desktop

---

## Key Tasks

### T1: Project Setup & SSO Integration

**Owner**: DevOps / Frontend Lead  
**Effort**: 2 days  
**Acceptance Criteria**:
- [x] Next.js 15 project initialized with TypeScript
- [x] Zustand + TanStack Query configured
- [x] Auth interceptor calls auth-ui `/auth/callback` for SSO
- [x] Successful login redirects to `/[orgSlug]/dashboard`
- [x] 401 errors redirect to SSO login page
- [x] Tests pass: login flow E2E test

**Technical Details**:
- Use `@/lib/api-client` pattern with Axios interceptors
- Implement refresh token rotation (similar to auth-ui)
- Store user context in Zustand global state
- Use `useMe()` hook from TanStack Query (5 min TTL)

---

### T2: Core Layout & Navigation

**Owner**: Frontend  
**Effort**: 2 days  
**Acceptance Criteria**:
- [x] Main layout component with sidebar + header
- [x] Sidebar navigation with: Dashboard, Transactions, Payouts, Reports, Gateways, Settings
- [x] Role-based visibility (Gateways only for super_admin)
- [ ] Breadcrumb navigation on pages (only a few pages have one)
- [x] Dark mode toggle in header
- [x] Responsive sidebar (collapsible on mobile)

**Components to Create**:
- `components/layout/TreasuryLayout.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/Header.tsx`
- `components/layout/Breadcrumbs.tsx`

---

### T3: Payment Gateway Management Page

**Owner**: Frontend (Migrate from auth-ui)  
**Effort**: 4 days  
**Acceptance Criteria**:
- [x] Gateway management page. Shipped as `/[orgSlug]/platform` (platform gateways) plus tenant gateway selection in Settings.
- [x] List all configured gateways. Paystack, M-Pesa and COD are supported; Stripe and bank transfer are not.
- [x] Add Gateway button → opens modal form
- [x] Edit gateway configuration dialog
- [x] Delete gateway with confirmation
- [x] Test gateway connection button (3-second feedback)
- [x] Status indicators (Active/Inactive, Test Status)
- [x] Permission-gated "Add" and "Delete" buttons (integrations:write)

**Components to Create**:
- `src/app/[orgSlug]/treasury/payment-gateways/page.tsx`
- `components/treasury/gateway-card.tsx`
- `components/treasury/create-gateway-dialog.tsx`
- `components/treasury/edit-gateway-dialog.tsx`

**Migration Work**:
- Move `usePlatformGateways` hook from auth-ui
- Move `GatewayConfig`, `CreateGatewayPayload` interfaces
- Adapt gateway page from auth-ui gateways/page.tsx

**API Endpoints** (treasury-api — gateway config moved from auth-api in Sprint 1):
- `GET /api/v1/platform/gateways` — list platform gateways (superuser)
- `POST /api/v1/platform/gateways` — create platform gateway
- `PATCH /api/v1/platform/gateways/{id}` — update gateway
- `DELETE /api/v1/platform/gateways/{id}` — deactivate gateway
- `POST /api/v1/platform/gateways/{id}/test` — test gateway connection
- `GET /api/v1/{tenant}/gateways` — list tenant-available gateways

---

### T4: Transaction Dashboard (MVP)

**Owner**: Frontend  
**Effort**: 3 days  
**Acceptance Criteria**:
- [x] Dashboard displays 4 KPI cards:
  - Total Revenue (KES)
  - Transaction Count
  - Success Rate (%)
  - Average Transaction Value
- [x] Recent Transactions table (last 10):
  - Date, Description, Amount, Gateway, Status, Action
  - Status color-coded (green=completed, red=failed, blue=pending)
- [x] Transaction filters (date range, gateway, status)
- [x] Table pagination (25/50/100 rows)
- [ ] Loading skeleton states (no skeleton component; pages show spinners)
- [x] Empty state when no transactions

**Components to Create**:
- `src/app/[orgSlug]/treasury/dashboard/page.tsx`
- `components/treasury/metric-card.tsx`
- `components/treasury/transaction-table.tsx`

---

### T5: Permission & RBAC

**Owner**: Frontend  
**Effort**: 1 day  
**Acceptance Criteria**:
- [x] User roles loaded from `useMe()` (auth-api)
- [x] Sidebar sections gated by role
- [x] Gateway management visible only to `super_admin`
- [x] Buttons use `PermissionActionButton` (from shared component)
- [x] Unauthorized routes show `/[orgSlug]/unauthorized` page
- [x] Tests: role-based visibility working

---

### T6: Styling & Responsiveness

**Owner**: Frontend  
**Effort**: 2 days  
**Acceptance Criteria**:
- [x] All pages follow treasury-ui/docs/ux-ui.md spec
- [x] Mobile (< 640px): Single column, collapsible sidebar
- [x] Tablet (640-1024px): Two-column layout
- [x] Desktop (> 1024px): Full layout with sidebar
- [x] Dark mode fully functional
- [ ] All components tested on iPhone 12, iPad, Desktop

---

### T7: Testing & Documentation

**Owner**: Frontend/QA  
**Effort**: 1 day  
**Acceptance Criteria**:
- [ ] Unit tests for gateway CRUD operations
- [ ] E2E test: Login → Dashboard → Add Gateway → Verify in List (only auth, RBAC and docs-capture Playwright specs exist)
- [ ] E2E test: Edit gateway configuration
- [ ] E2E test: Delete gateway with confirmation
- [ ] Storybook stories for key components
- [ ] Documentation: `/docs/architecture.md` updated with gateway flow (the file does not exist)

---

## Dependencies & Blockers

| Item | Status | Blocker? |
|------|--------|----------|
| auth-api SSO endpoints | ✅ Ready | No |
| Integration config endpoints | ✅ Ready (from auth-api) | No |
| PermissionActionButton component | ✅ Ready (from auth-ui shared) | No |
| Treasury-api endpoints | ⏳ In progress | No (can mock) |
| Design system (Shadcn UI) | ✅ Ready | No |

---

## Deployment Checklist

- [x] Environment variables set: `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TENANT_SLUG`
- [x] CORS configured between treasury-ui and auth-api / registry-api
- [x] Database migrations for treasury-api complete
- [x] Payment gateway credentials configured in staging
- [x] Docker image built and pushed to registry
- [x] K8s deployment manifest created
- [x] Smoke tests passing on staging
- [ ] Performance metrics acceptable (LCP < 2.5s, FID < 100ms), never measured

---

## Notes

- Gateway page is migrated from auth-ui where it was incorrectly placed
- Treasury-ui owns all payment infrastructure configuration
- Auth-ui will be cleaned up to remove gateway/notification pages (in future sprint)
- Transaction monitoring in dashboard will be expanded in Sprint 2 with real treasury-api data

