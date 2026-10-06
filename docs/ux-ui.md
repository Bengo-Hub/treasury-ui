# Treasury UI - UX/UI Specification

## Design System Overview

Treasury UI follows the **Codevertex Design System** with financial-focused patterns for clarity, trust, and efficiency in payment and financial operations.

---

## Color Palette

### Financial Intent Colors (Semantic)
- **Green (#10B981)**: Successful transactions, positive cash flow, settlements completed
- **Red (#EF4444)**: Failed transactions, overdue payments, refunds, risk indicators
- **Blue (#3B82F6)**: Information, processing, pending transactions, neutral states
- **Amber (#F59E0B)**: Warnings, flagged transactions, review needed
- **Slate (#6B7280)**: Neutral backgrounds, disabled states

### Grayscale
- **Slate-50**: Light backgrounds
- **Slate-100**: Cards, containers
- **Slate-900**: Primary text
- **Slate-400**: Secondary text, labels
- **Slate-600**: Tertiary text, captions

---

## Component Library

### Data Tables
**Purpose**: Display financial transactions, payments, settlements

**Features**:
- Sortable columns (date, amount, status)
- Row filtering (date range, status, amount range)
- Pagination (25, 50, 100 rows per page)
- Bulk actions menu (export, retry, refund)
- Status badges (Completed, Pending, Failed, Refunded)
- Amount formatting with currency symbol (KES, USD)
- Last updated timestamp

**Example**:
```tsx
<FinancialTable
  data={transactions}
  columns={[
    { key: 'date', label: 'Date', sortable: true },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'status', label: 'Status', render: StatusBadge },
    { key: 'actions', label: '', render: ActionButtons }
  ]}
  onSort={handleSort}
  onFilter={handleFilter}
/>
```

### Status Badges
**Purpose**: Quick visual status indication

**Variants**:
- `completed` (Green): Transaction successful
- `pending` (Blue): Awaiting processing
- `processing` (Amber): In progress
- `failed` (Red): Transaction failed
- `refunded` (Slate): Money returned
- `on_hold` (Amber): Account/transaction on hold

**Example**:
```tsx
<StatusBadge status="completed">Completed</StatusBadge>
<StatusBadge status="pending">Pending</StatusBadge>
```

### Amount Display
**Purpose**: Consistent financial amount formatting

**Rules**:
- Always include currency symbol (KES, USD, GBP)
- Use grouping separators (1,234,567.89 KES)
- Positive = black text, Negative = red text
- Decimal places based on currency (2 for most, 0 for JPY)

**Example**:
```tsx
<Amount value={15000} currency="KES" />  // 15,000.00 KES
<Amount value={-5000} currency="KES" />  // -5,000.00 KES (red)
```

### Modal Forms
**Purpose**: Gateway configuration, payout scheduling, settlement adjustments

**Pattern**:
- Header with title and close button
- Form fields with inline validation
- Action buttons (Save, Cancel) at bottom
- Loading state during submission
- Success/error toast after submission

**Example**:
```tsx
<Modal title="Configure Payment Gateway" onClose={handleClose}>
  <form onSubmit={handleSubmit} className="space-y-4">
    <FormField label="Gateway Type" type="select" options={gatewayOptions} />
    <FormField label="API Key" type="password" />
    <FormField label="Webhook URL" type="text" />
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={handleClose}>Cancel</Button>
      <Button type="submit">Save Gateway</Button>
    </div>
  </form>
</Modal>
```

**Edit and quick-add happen in modals, not separate pages** (2026-10-06). Editing a draft expense
(`components/expenses/EditExpenseModal.tsx`) and adding a vendor
(`components/vendors/VendorFormDialog.tsx`) open in place from the list, the detail page or the
form that needs the record, using `Dialog`/`DialogContent` from `components/ui/dialog.tsx`. The old
`/expenses/{id}/edit` and `/vendors/new` routes only redirect (`?edit=1`, `?add=1`) so bookmarks still
work. Reuse these components; do not build a second form for the same record.

**Modal width follows content**: a confirm or one-field modal is `max-w-sm`/`max-w-md`, a short
form `max-w-lg`/`max-w-xl`, a multi-section form `max-w-2xl`/`max-w-3xl` (the expense edit modal is
`max-w-3xl` with three-column field grids). Re-check the width whenever fields are added.

### Page width
The org shell (`app/[orgSlug]/org-shell.tsx`) adds no padding of its own, so every page owns
`p-4 sm:p-6 lg:p-8` (list pages use `p-6`) and spans the full content width. Do not cap a page with
`max-w-3xl`/`max-w-5xl mx-auto`: on a normal screen that leaves wide empty bands on both sides of
the content. Detail pages lay out instead: a main card with a responsive field grid
(`grid sm:grid-cols-2 xl:grid-cols-3`) and a side column of related cards (`lg:grid-cols-3`, see the
expense detail page). Only public customer document links (`/i/{token}`, `/q/{token}`) keep a
centred paper-width column.

### Cards
**Purpose**: Dashboard metrics, gateway status, transaction details

**Variants**:
- **Metric Card**: Large number + label + trend indicator
- **Status Card**: Gateway/account status with action buttons
- **Detail Card**: Expandable transaction details

**Example**:
```tsx
<MetricCard
  label="Total Revenue"
  value="KES 2,450,000"
  trend={{ direction: 'up', percent: 12 }}
  currency="KES"
/>

<StatusCard
  title="M-Pesa Gateway"
  status="active"
  metrics={{ volume: 'KES 1.2M', failures: '0.5%' }}
  actions={[{ label: 'Configure', onClick: handleConfigure }]}
/>
```

### Charts & Analytics
**Purpose**: Financial dashboards and reporting

**Types**:
- **Line Chart**: Transaction volume over time
- **Bar Chart**: Revenue by gateway/channel
- **Pie Chart**: Revenue distribution
- **Gauge**: Transaction success rate

**Libraries**: Recharts (React-friendly, financial focus)

---

## Layout Patterns

### Dashboard Layout
```
┌─────────────────────────────────────┐
│         Top Navigation              │
├──────────────┬──────────────────────┤
│              │                      │
│   Sidebar    │   Main Content       │
│   (Nav)      │   (Metrics + Tables) │
│              │                      │
└──────────────┴──────────────────────┘
```

### Sidebar Navigation
- Logo / Tenant brand
- **Tenant sections**: Dashboard, Transactions, Settlements (Payouts), Gateways, Accounts, Settings — visible to all authenticated tenant users.
- **Platform section** (visible only for `super_admin`): Platform gateways, Equity — links under `/[orgSlug]/platform/*`.
- Role-based visibility: platform items and platform routes are permission-gated; others see 404/unauthorized.
- Active section highlight
- Collapsible on mobile

### Main Content Area
- Breadcrumb navigation (e.g., Dashboard > Transactions > Details)
- Page title and description
- Metric row (KPIs)
- Data table or detailed view
- Action buttons (Add, Export, Retry, etc.)

---

## Interaction Patterns

### Data Fetching
- **Loading State**: Skeleton cards + spinner
- **Empty State**: Illustration + explanatory message + CTA button
- **Error State**: Red error message + retry button + fallback content
- **Success State**: Green toast notification (2-3 seconds)

### Confirmation Dialogs
**Purpose**: Destructive actions (refunds, gateway deletion)

**Pattern**:
```tsx
<ConfirmDialog
  title="Refund this transaction?"
  message="This action cannot be undone."
  confirmText="Refund"
  confirmVariant="destructive"
  onConfirm={handleRefund}
  onCancel={handleCancel}
/>
```

### Bulk Actions
**Purpose**: Apply action to multiple rows

**Pattern**:
- Checkbox column for row selection
- "X selected" indicator in header
- Sidebar or dropdown with available bulk actions
- Confirmation before execution

---

## Accessibility Standards

- WCAG 2.1 Level AA compliance
- Keyboard navigation throughout
- Screen reader friendly labels and ARIA attributes
- Color not only visual indicator (status badges have icons + text)
- Form validation messages linked to inputs
- Focus visible on all interactive elements

---

## Responsive Design

### Breakpoints
- **Mobile** (< 640px): Single column, collapsible tables
- **Tablet** (640px - 1024px): Two-column layout
- **Desktop** (> 1024px): Full three-column with sidebar

### Table Responsive Behavior
- < 768px: Show only key columns (date, amount, status, actions)
- > 768px: Show all columns
- Use horizontal scroll for wide tables on mobile

---

## Dark Mode Support

- All colors have dark mode equivalents
- Use `dark:` Tailwind classes
- Backgrounds: `bg-white dark:bg-slate-900`
- Text: `text-slate-900 dark:text-white`
- Borders: `border-slate-200 dark:border-slate-700`

---

## Component Usage Examples

### Success Flow
```tsx
// User adds new payment gateway
<CreateGatewayDialog open={showCreate} onClose={handleClose} />

// On submit → API call → loading state → success toast
toast({
  title: 'Gateway added',
  description: 'M-Pesa gateway is now active',
  type: 'success'
})
```

### Error Handling
```tsx
// Failed transaction retry
<FailedTransactionCard transaction={tx}>
  <Button onClick={handleRetry} variant="outline">Retry Payment</Button>
</FailedTransactionCard>

// After retry → loading → error/success
if (error) {
  toast({
    title: 'Retry failed',
    description: error.message,
    type: 'error'
  })
}
```

