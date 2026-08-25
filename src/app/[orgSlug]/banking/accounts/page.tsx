'use client';

import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { BankAccountsPanel } from '@/components/payments/bank-accounts-panel';

/**
 * Accounts — the tenant's real, ledger-linked money-holding accounts (bank/mobile-money/cash/
 * gateway), each with a live GL-derived balance and a drillable statement. Distinct from the
 * "/accounts" page (chart of accounts — GL categories like "6100 General Operating Expense"), and
 * from the Reconciliation page's own account picker (statement import / auto-match — a paid
 * feature; this list is the free, core bookkeeping view every tenant gets). The actual list/create
 * UI lives in BankAccountsPanel — also embedded on the tenant Settings and platform Gateways &
 * Secrets pages, so account creation is centralized in one component regardless of entry point.
 */
export default function AccountsPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  const tenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="text-muted-foreground mt-1">
          Your real bank, mobile money, and cash accounts — each with a live balance and a
          drillable, exportable statement.
        </p>
      </div>

      <BankAccountsPanel tenant={tenant} orgSlug={orgSlug} />
    </div>
  );
}
