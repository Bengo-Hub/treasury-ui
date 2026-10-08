'use client';

/**
 * PersonalCollectionPicker: the "Personal" switch on the quotation/invoice form, and, when it is on,
 * which personal PayHero channel will collect the payment.
 *
 * A personal document is the platform owner's own engagement: kept off the company's books (no
 * revenue, AR, eTIMS or business report) and paid by M-Pesa into a personal PayHero channel. The
 * account it is payable into is picked in the bank picker below, which then lists only personal
 * accounts; the server collects through, and prints, the personal channel linked to that account
 * (Settings > PayHero: mark a channel personal and link it to the account), else the routed
 * personal channel. This control just shows which one that is.
 *
 * Shown only to the platform owner on the platform tenant (the only place the server accepts it).
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { payheroApi, type PayHeroChannel } from '@/lib/api/payhero';

export interface PersonalCollection {
  personal: boolean;
}

/** The personal channels on the platform's PayHero setup, and whether this tenant may have them. */
export function usePersonalAccounts(tenant: string, enabled: boolean) {
  const q = useQuery({
    queryKey: ['payhero', tenant],
    queryFn: () => payheroApi.status(tenant),
    enabled: !!tenant && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const channels = useMemo(
    () => (q.data?.channels ?? []).filter((c) => c.personal && c.enabled && c.is_active),
    [q.data],
  );
  return { available: !!q.data?.is_platform, channels, routedId: q.data?.routing?.personal_channel_id ?? 0, isLoading: q.isLoading };
}

export function personalChannelLabel(c: PayHeroChannel): string {
  const kind = c.channel_type === 'till' ? 'Till' : c.channel_type === 'bank' ? c.description || 'Bank' : 'Paybill';
  const acct = c.account_number ? ` (Acct ${c.account_number})` : '';
  return `${kind} ${c.short_code}${acct}`;
}

/** Reads the personal flag stored on a document's metadata. */
export function personalFromMetadata(meta: Record<string, unknown> | undefined): PersonalCollection {
  return { personal: meta?.off_books === true };
}

/** Writes the personal flag onto document metadata (removing it for a business document). The
 *  channel follows the chosen personal account, so no channel id is stored. */
export function applyPersonalToMetadata(meta: Record<string, unknown>, value: PersonalCollection): void {
  if (value.personal) {
    meta.off_books = true;
  } else {
    delete meta.off_books;
  }
  delete meta.personal_channel_id;
}

export function PersonalCollectionPicker({
  tenant,
  orgSlug,
  value,
  onChange,
  accountId,
  locked,
  lockedReason,
}: {
  tenant: string;
  orgSlug: string;
  value: PersonalCollection;
  onChange: (v: PersonalCollection) => void;
  /** The personal account chosen in the bank picker, if any. */
  accountId?: string;
  /** The switch cannot change (a saved invoice keeps how it was booked). */
  locked?: boolean;
  lockedReason?: string;
}) {
  const { channels, routedId, isLoading } = usePersonalAccounts(tenant, true);
  // The same rule the server applies: the chosen account's linked personal channel, else the routed one.
  const linked = accountId ? channels.find((c) => c.bank_account_id === accountId) : undefined;
  const routed = channels.find((c) => c.payhero_channel_id === routedId);
  const collecting = linked ?? routed;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={locked}
        onClick={() => onChange({ personal: !value.personal })}
        className="flex items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className={`relative w-11 h-6 rounded-full transition-colors ${value.personal ? 'bg-primary' : 'bg-accent'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value.personal ? 'translate-x-5' : ''}`} />
        </span>
        <span>
          <span className="flex items-center gap-1.5 text-sm font-semibold"><UserRound className="h-3.5 w-3.5" /> Personal (off the company books)</span>
          <span className="block text-xs text-muted-foreground">
            {locked && lockedReason
              ? lockedReason
              : 'Your own engagement: no company revenue, AR or eTIMS. Payable into your personal account.'}
          </span>
        </span>
      </button>

      {value.personal && !isLoading && (
        collecting ? (
          <p className="text-xs text-muted-foreground">
            M-Pesa payments go to {personalChannelLabel(collecting)}, payable to {collecting.payee_name || 'you'}
            {linked ? ', the channel linked to the account below.' : '. Link a personal channel to the account below to use it instead.'}
          </p>
        ) : (
          <p className="text-xs text-amber-600">
            No personal PayHero channel is set up, so this document cannot be paid by M-Pesa.{' '}
            <Link href={`/${orgSlug}/settings?tab=payments`} className="underline">Mark a channel as personal and link it to your account</Link>.
          </p>
        )
      )}
    </div>
  );
}
