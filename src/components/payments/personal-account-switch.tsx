'use client';

import { UserRound } from 'lucide-react';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';

/** Whether the viewer may mark accounts personal: the platform owner on their own (platform)
 *  tenant. The server enforces the same rule. */
export function useCanMarkPersonal(): boolean {
  const { isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  return isPlatformOwner && !tenantQueryParam;
}

/**
 * The "Personal account" switch on the account forms. A personal account is the owner's own: it
 * takes only personal invoices (and the personal PayHero channel linked to it), is never a
 * business default, has no company ledger account and is left out of business account pickers.
 */
export function PersonalAccountSwitch({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left disabled:opacity-60"
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-accent'}`}>
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </span>
      <span>
        <span className="flex items-center gap-1.5 text-sm font-semibold"><UserRound className="h-3.5 w-3.5" /> Personal account</span>
        <span className="block text-xs text-muted-foreground">
          Your own account, off the company books. Only personal invoices use it, and it never takes business payments.
        </span>
      </span>
    </button>
  );
}
