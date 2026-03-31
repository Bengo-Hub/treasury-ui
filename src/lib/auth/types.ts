export type UserRole = "staff" | "admin" | "superuser";

export type Permission =
  // Payment permissions
  | "treasury.payments.add"
  | "treasury.payments.view"
  | "treasury.payments.view_own"
  | "treasury.payments.change"
  | "treasury.payments.change_own"
  | "treasury.payments.delete"
  | "treasury.payments.delete_own"
  | "treasury.payments.manage"
  | "treasury.payments.manage_own"
  // Invoice permissions
  | "treasury.invoices.add"
  | "treasury.invoices.view"
  | "treasury.invoices.view_own"
  | "treasury.invoices.change"
  | "treasury.invoices.change_own"
  | "treasury.invoices.delete"
  | "treasury.invoices.delete_own"
  | "treasury.invoices.manage"
  | "treasury.invoices.manage_own"
  // Ledger permissions
  | "treasury.ledger.add"
  | "treasury.ledger.view"
  | "treasury.ledger.view_own"
  | "treasury.ledger.change"
  | "treasury.ledger.change_own"
  | "treasury.ledger.delete"
  | "treasury.ledger.delete_own"
  | "treasury.ledger.manage"
  | "treasury.ledger.manage_own"
  // Banking permissions
  | "treasury.banking.add"
  | "treasury.banking.view"
  | "treasury.banking.view_own"
  | "treasury.banking.change"
  | "treasury.banking.change_own"
  | "treasury.banking.delete"
  | "treasury.banking.delete_own"
  | "treasury.banking.manage"
  | "treasury.banking.manage_own"
  // Expense permissions
  | "treasury.expenses.add"
  | "treasury.expenses.view"
  | "treasury.expenses.view_own"
  | "treasury.expenses.change"
  | "treasury.expenses.change_own"
  | "treasury.expenses.delete"
  | "treasury.expenses.delete_own"
  | "treasury.expenses.manage"
  | "treasury.expenses.manage_own"
  // Transaction permissions
  | "treasury.transactions.add"
  | "treasury.transactions.view"
  | "treasury.transactions.view_own"
  | "treasury.transactions.change"
  | "treasury.transactions.change_own"
  | "treasury.transactions.delete"
  | "treasury.transactions.delete_own"
  | "treasury.transactions.manage"
  | "treasury.transactions.manage_own"
  // Gateway permissions
  | "treasury.gateways.add"
  | "treasury.gateways.view"
  | "treasury.gateways.view_own"
  | "treasury.gateways.change"
  | "treasury.gateways.change_own"
  | "treasury.gateways.delete"
  | "treasury.gateways.delete_own"
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
