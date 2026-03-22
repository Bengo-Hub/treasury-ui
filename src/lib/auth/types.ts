export type UserRole = "staff" | "admin" | "superuser";

export type Permission =
  // Payment permissions
  | "treasury.payments.create"
  | "treasury.payments.process"
  | "treasury.payments.refund"
  | "treasury.payments.approve"
  | "treasury.payments.view"
  | "treasury.payments.add"
  | "treasury.payments.read"
  | "treasury.payments.read_own"
  | "treasury.payments.change"
  | "treasury.payments.change_own"
  | "treasury.payments.delete"
  | "treasury.payments.manage"
  | "treasury.payments.manage_own"
  // Invoice permissions
  | "treasury.invoices.create"
  | "treasury.invoices.edit"
  | "treasury.invoices.approve"
  | "treasury.invoices.send"
  | "treasury.invoices.view"
  // Ledger permissions
  | "treasury.ledger.create"
  | "treasury.ledger.approve"
  | "treasury.ledger.post"
  | "treasury.ledger.reverse"
  | "treasury.ledger.view"
  // Banking permissions
  | "treasury.banking.reconcile"
  | "treasury.banking.import"
  | "treasury.banking.view"
  // Expense permissions
  | "treasury.expenses.create"
  | "treasury.expenses.approve"
  | "treasury.expenses.view"
  // Transaction permissions
  | "treasury.transactions.add"
  | "treasury.transactions.read"
  | "treasury.transactions.read_own"
  | "treasury.transactions.change"
  | "treasury.transactions.change_own"
  | "treasury.transactions.delete"
  | "treasury.transactions.manage"
  | "treasury.transactions.manage_own"
  // Gateway permissions
  | "treasury.gateways.add"
  | "treasury.gateways.read"
  | "treasury.gateways.read_own"
  | "treasury.gateways.change"
  | "treasury.gateways.change_own"
  | "treasury.gateways.delete"
  | "treasury.gateways.manage"
  | "treasury.gateways.manage_own"
  // Configuration permissions
  | "treasury.config.view"
  | "treasury.config.manage"
  // User management
  | "treasury.users.manage";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  permissions: Permission[];
  organizationId: string;
  tenantId: string;
  tenantSlug: string;
  isPlatformOwner?: boolean;
  isSuperUser?: boolean;
}
