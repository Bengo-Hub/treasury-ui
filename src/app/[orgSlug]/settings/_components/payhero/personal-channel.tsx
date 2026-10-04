'use client';

import { Badge, Button } from '@/components/ui/base';
import { Input } from '@/components/ui/input';
import { payheroApi, type PayHeroChannel } from '@/lib/api/payhero';
import { Loader2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { usePayHeroMutation } from './use-payhero';

/**
 * The personal flag of one channel (platform tenant only). A personal channel is the owner's own
 * account: it takes only personal collections (support agreements set to Personal), never
 * business money, and is never mapped to a company account.
 */
export function PersonalChannelControl({ tenantSlug, channel }: { tenantSlug: string; channel: PayHeroChannel }) {
  const [editing, setEditing] = useState(false);
  const [payee, setPayee] = useState(channel.payee_name ?? '');
  const save = usePayHeroMutation(
    tenantSlug,
    (v: { personal: boolean; payee: string }) => payheroApi.setChannelPersonal(tenantSlug, channel.payhero_channel_id, v.personal, v.payee),
    'Channel updated',
    'Could not update the channel',
  );

  if (channel.personal && !editing) {
    return (
      <div className="flex w-full flex-wrap items-center gap-2 border-t border-border pt-2 text-xs">
        <Badge variant="secondary" className="gap-1"><UserRound className="h-3 w-3" /> Personal</Badge>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">Payable to {channel.payee_name}. Off the company books.</span>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>Edit</Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          disabled={save.isPending}
          onClick={() => save.mutate({ personal: false, payee: '' })}
        >
          Make business
        </Button>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="flex w-full justify-end">
        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-muted-foreground" onClick={() => setEditing(true)}>
          <UserRound className="h-3 w-3" /> Mark as my personal account
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-2 rounded-lg bg-muted/50 p-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ personal: true, payee: payee.trim() }, { onSuccess: () => setEditing(false) });
      }}
    >
      <label className="min-w-0 flex-1 space-y-1">
        <span className="text-xs font-medium">Payee name on personal invoices</span>
        <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Your full name" className="h-8 text-xs" autoFocus />
      </label>
      <div className="flex gap-1 sm:self-end">
        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}>Cancel</Button>
        <Button type="submit" size="sm" className="h-8 gap-1" disabled={!payee.trim() || save.isPending}>
          {save.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Save
        </Button>
      </div>
    </form>
  );
}
