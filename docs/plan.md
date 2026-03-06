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

### ❌ Customer Payments → **ordering-service** / **cafe-website**
- **Redirects To**: Respective service checkout pages.
- **Why**: Customer-facing payment initiation is handled by the service where the transaction originates.

---

## Roadmap

### Sprint 1: Foundation & SSO
- [ ] Project scaffolding with Next.js 15.
- [ ] SSO integration with `auth-ui`.
- [ ] Core layout with financial dashboard shell.

### Sprint 2: Payment Monitoring
- [ ] Real-time transaction list with status filters.
- [ ] Detailed payment intent view.
- [ ] Reconciliation tools.

### Sprint 3: Payouts & Settlements
- [ ] Rider payout management.
- [ ] Merchant settlement dashboard.
- [ ] Integration with bank/mobile money APIs.
