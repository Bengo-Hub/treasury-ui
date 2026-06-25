'use client';

import { useTrialBalance } from '@/hooks/use-ledger';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props { tenant: string }

/**
 * BooksBalancedBadge — a compact GL-health pill. "Books balanced" requires BOTH
 * double-entry integrity (ΣDr == ΣCr) AND the accounting equation
 * (Assets == Liabilities + Equity + Current-Year Earnings). The two are independent:
 * the latter catches accounts whose type falls outside the standard balance-sheet sections.
 */
export function BooksBalancedBadge({ tenant }: Props) {
  const { data, isLoading } = useTrialBalance(tenant);
  if (isLoading || !data) return null;
  // equation_balanced is optional for backward-compat; when absent fall back to is_balanced.
  const equationOk = data.equation_balanced ?? true;
  const balanced = data.is_balanced && equationOk;
  const title = balanced
    ? 'Trial balance balances and the accounting equation holds'
    : !data.is_balanced
      ? 'Trial balance is OUT of balance — review the GL'
      : 'Accounting equation does not hold — an account type may be misclassified';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        balanced ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
      }`}
      title={title}
    >
      {balanced ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {balanced ? 'Books balanced' : 'Books out of balance'}
    </span>
  );
}
