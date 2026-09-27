'use client';

import { useMemo } from 'react';
import { resolveDefaultAccount } from '@bengo-hub/shared-ui-lib/payments';
import type { ComboboxOption } from '@/components/ui/combobox';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { bankAccountHint } from '@/lib/api/bank-accounts';

/**
 * Options for a "paid from account" picker: the tenant's active real cash / bank / mobile-money
 * accounts (bank_accounts, each posting to its own ledger leaf), plus the default (a cash-type
 * account when present). Shared by every modal that records money leaving an account.
 */
export function usePaidFromAccounts(tenant: string) {
  const { data } = useBankAccounts(tenant);
  const options = useMemo<ComboboxOption[]>(
    () =>
      (data?.bank_accounts ?? [])
        .filter((a) => a.is_active !== false)
        .map((a) => ({ value: a.id, label: a.account_name, hint: bankAccountHint(a) })),
    [data],
  );
  const defaultAccountId = useMemo(() => resolveDefaultAccount(data?.bank_accounts)?.id ?? '', [data]);
  return { options, defaultAccountId };
}
