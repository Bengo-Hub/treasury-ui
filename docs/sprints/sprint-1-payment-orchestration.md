# Sprint 1: Payment Orchestration Foundation

**Duration**: March 8 - March 22, 2026 (15 working days)  
**Goal**: Establish core payment gateway management and transaction monitoring interfaces  
**Status**: KICKOFF

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
- ✅ Gateway management UI follows BengoBox design patterns
- ✅ Responsive design works on mobile/tablet/desktop

---

## Key Tasks

### T1: Project Setup & SSO Integration

**Owner**: DevOps / Frontend Lead  
**Effort**: 2 days  
**Acceptance Criteria**:
- [ ] Next.js 15 project initialized with TypeScript
- [ ] Zustand + TanStack Query configured
- [ ] Auth interceptor calls auth-ui `/auth/callback` for SSO
- [ ] Successful login redirects to `/[orgSlug]/dashboard`
- [ ] 401 errors redirect to SSO login page
- [ ] Tests pass: login flow E2E test

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
- [ ] Main layout component with sidebar + header
- [ ] Sidebar navigation with: Dashboard, Transactions, Payouts, Reports, Gateways, Settings
- [ ] Role-based visibility (Gateways only for super_admin)
- [ ] Breadcrumb navigation on pages
- [ ] Dark mode toggle in header
- [ ] Responsive sidebar (collapsible on mobile)

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
- [ ] `/[orgSlug]/treasury/payment-gateways` page created
- [ ] List all configured gateways (M-Pesa, Stripe, Paystack, Bank Transfer)
- [ ] Add Gateway button → opens modal form
- [ ] Edit gateway configuration dialog
- [ ] Delete gateway with confirmation
- [ ] Test gateway connection button (3-second feedback)
- [ ] Status indicators (Active/Inactive, Test Status)
- [ ] Permission-gated "Add" and "Delete" buttons (integrations:write)

**Components to Create**:
- `src/app/[orgSlug]/treasury/payment-gateways/page.tsx`
- `components/treasury/gateway-card.tsx`
- `components/treasury/create-gateway-dialog.tsx`
- `components/treasury/edit-gateway-dialog.tsx`

**Migration Work**:
- Move `usePlatformGateways` hook from auth-ui
- Move `GatewayConfig`, `CreateGatewayPayload` interfaces
- Adapt gateway page from auth-ui gateways/page.tsx

**API Endpoints** (assume auth-api provides):
- `GET /api/v1/admin/integrations?service=payment_gateway`
- `POST /api/v1/admin/integrations`
- `PUT /api/v1/admin/integrations/{id}`
- `DELETE /api/v1/admin/integrations/{id}`
- `POST /api/v1/admin/integrations/{id}/test`

---

### T4: Transaction Dashboard (MVP)

**Owner**: Frontend  
**Effort**: 3 days  
**Acceptance Criteria**:
- [ ] Dashboard displays 4 KPI cards:
  - Total Revenue (KES)
  - Transaction Count
  - Success Rate (%)
  - Average Transaction Value
- [ ] Recent Transactions table (last 10):
  - Date, Description, Amount, Gateway, Status, Action
  - Status color-coded (green=completed, red=failed, blue=pending)
- [ ] Transaction filters (date range, gateway, status)
- [ ] Table pagination (25/50/100 rows)
- [ ] Loading skeleton states
- [ ] Empty state when no transactions

**Components to Create**:
- `src/app/[orgSlug]/treasury/dashboard/page.tsx`
- `components/treasury/metric-card.tsx`
- `components/treasury/transaction-table.tsx`

---

### T5: Permission & RBAC

**Owner**: Frontend  
**Effort**: 1 day  
**Acceptance Criteria**:
- [ ] User roles loaded from `useMe()` (auth-api)
- [ ] Sidebar sections gated by role
- [ ] Gateway management visible only to `super_admin`
- [ ] Buttons use `PermissionActionButton` (from shared component)
- [ ] Unauthorized routes show `/[orgSlug]/unauthorized` page
- [ ] Tests: role-based visibility working

---

### T6: Styling & Responsiveness

**Owner**: Frontend  
**Effort**: 2 days  
**Acceptance Criteria**:
- [ ] All pages follow treasury-ui/docs/ux-ui.md spec
- [ ] Mobile (< 640px): Single column, collapsible sidebar
- [ ] Tablet (640-1024px): Two-column layout
- [ ] Desktop (> 1024px): Full layout with sidebar
- [ ] Dark mode fully functional
- [ ] All components tested on iPhone 12, iPad, Desktop

---

### T7: Testing & Documentation

**Owner**: Frontend/QA  
**Effort**: 1 day  
**Acceptance Criteria**:
- [ ] Unit tests for gateway CRUD operations
- [ ] E2E test: Login → Dashboard → Add Gateway → Verify in List
- [ ] E2E test: Edit gateway configuration
- [ ] E2E test: Delete gateway with confirmation
- [ ] Storybook stories for key components
- [ ] Documentation: `/docs/architecture.md` updated with gateway flow

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

- [ ] Environment variables set: `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TENANT_SLUG`
- [ ] CORS configured between treasury-ui and auth-api / registry-api
- [ ] Database migrations for treasury-api complete
- [ ] Payment gateway credentials configured in staging
- [ ] Docker image built and pushed to registry
- [ ] K8s deployment manifest created
- [ ] Smoke tests passing on staging
- [ ] Performance metrics acceptable (LCP < 2.5s, FID < 100ms)

---

## Notes

- Gateway page is migrated from auth-ui where it was incorrectly placed
- Treasury-ui owns all payment infrastructure configuration
- Auth-ui will be cleaned up to remove gateway/notification pages (in future sprint)
- Transaction monitoring in dashboard will be expanded in Sprint 2 with real treasury-api data

