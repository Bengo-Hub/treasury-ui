'use client';

/**
 * PersonalCollectionPicker: the "Personal" switch on the quotation/invoice form, and, when it is on,
 * the personal account the document is payable into.
 *
 * A personal document is the platform owner's own engagement: kept off the company's books (no
 * revenue, AR, eTIMS or business report), collected only by M-Pesa into one of the owner's personal
 * PayHero channels (Settings > PayHero > "Mark as my personal account"). So the account list here
 * holds personal channels only, never a company bank account, and the server routes the payment and
 * prints the "how to pay" block from the same choice.
 *
 * Shown only to the platform owner on the platform tenant (the only place the server accepts it).
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/base';
import { Combobox } from '@/components/ui/combobox';
import { payheroApi, type PayHeroChannel } from '@/lib/api/payhero';

export interface PersonalCollection {
  personal: boolean;
  /** PayHero channel id; 0 = the routed personal channel. */
  channelId: number;
}

/** The personal channels a personal document can be payable into, and whether this tenant may have them. */
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

/** Reads the personal fields stored on a document's metadata. */
export function personalFromMetadata(meta: Record<string, unknown> | undefined): PersonalCollection {
  const personal = meta?.off_books === true;
  const id = Number(meta?.personal_channel_id ?? 0);
  return { personal, channelId: personal && Number.isFinite(id) ? id : 0 };
}

/** Writes the personal fields onto document metadata (removing them for a business document). */
export function applyPersonalToMetadata(meta: Record<string, unknown>, value: PersonalCollection): void {
  if (value.personal) {
    meta.off_books = true;
    if (value.channelId > 0) meta.personal_channel_id = value.channelId;
    else delete meta.personal_channel_id;
    // A personal document never carries a company bank block or settlement account.
    delete meta.bank_details;
    meta.exclude_bank_details = false;
  } else {
    delete meta.off_books;
    delete meta.personal_channel_id;
  }
}

export function PersonalCollectionPicker({
  tenant,
  orgSlug,
  value,
  onChange,
  locked,
  lockedReason,
}: {
  tenant: string;
  orgSlug: string;
  value: PersonalCollection;
  onChange: (v: PersonalCollection) => void;
  /** The switch cannot change (an issued or saved invoice keeps how it was booked). */
  locked?: boolean;
  lockedReason?: string;
}) {
  const { channels, routedId, isLoading } = usePersonalAccounts(tenant, true);
  const options = useMemo(
    () => channels.map((c) => ({
      value: String(c.payhero_channel_id),
      label: personalChannelLabel(c),
      hint: `Payable to ${c.payee_name || 'you'}${c.payhero_channel_id === routedId ? ' · default' : ''}`,
    })),
    [channels, routedId],
  );
  const selected = value.channelId > 0 ? String(value.channelId) : routedId ? String(routedId) : '';
  const chosen = channels.find((c) => String(c.payhero_channel_id) === selected);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={locked}
        onClick={() => onChange({ personal: !value.personal, channelId: value.personal ? 0 : value.channelId })}
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
              : 'Your own engagement: no company revenue, AR or eTIMS. Paid by M-Pesa into your personal account.'}
          </span>
        </span>
      </button>

      {value.personal && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <label className="text-xs font-bold text-foreground">Personal account</label>
            <Combobox
              options={options}
              value={selected}
              onChange={(v) => onChange({ personal: true, channelId: Number(v) || 0 })}
              placeholder={isLoading ? 'Loading personal accounts…' : 'Select a personal account'}
              searchPlaceholder="Search personal accounts…"
              emptyText="No personal accounts yet"
            />
            {chosen ? (
              <p className="text-xs text-muted-foreground">
                {personalChannelLabel(chosen)} · payable to {chosen.payee_name || 'you'}. Printed as the payment details on this document.
              </p>
            ) : (
              !isLoading && (
                <p className="text-xs text-amber-600">
                  No personal account is set up, so the document prints no account and cannot be paid by M-Pesa.{' '}
                  <Link href={`/${orgSlug}/settings?tab=payments`} className="underline">Mark a PayHero channel as personal</Link>.
                </p>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
