'use client';

import { Badge, Button } from '@/components/ui/base';
import { Input, Select } from '@/components/ui/input';
import { SettingsSection } from '@/components/ui/settings-section';
import { payheroApi, type PayHeroChannel, type PayHeroRouting, type PayHeroStatus } from '@/lib/api/payhero';
import { useOutletFilterStore } from '@/store/outlet-filter';
import { useQuery } from '@tanstack/react-query';
import { Landmark, Loader2, Plus, RefreshCw, Route, Save, Smartphone, Store } from 'lucide-react';
import { useState } from 'react';
import { usePayHeroMutation } from './use-payhero';

const SOURCE_LABEL: Record<string, string> = {
  product: 'Your product',
  history: 'Received recently',
  platform: 'Platform billing',
  routed: 'Routed before',
};

const channelName = (c: PayHeroChannel) => [c.description || c.channel_type, c.short_code].filter(Boolean).join(' ');

/** The tenant's synced channels (on/off switches) and, below, the routing of payments to them. */
export function ChannelsSection({ tenantSlug, st }: { tenantSlug: string; st: PayHeroStatus }) {
  const sync = usePayHeroMutation(tenantSlug, (_: void) => payheroApi.syncChannels(tenantSlug), 'Channels synced', 'Could not sync channels');
  const toggle = usePayHeroMutation(tenantSlug, (v: { id: number; enabled: boolean }) => payheroApi.setChannelEnabled(tenantSlug, v.id, v.enabled), 'Channel updated', 'Could not update the channel');
  const claim = usePayHeroMutation(tenantSlug, (id: number) => payheroApi.claimChannel(tenantSlug, id), 'Channel added', 'Could not add the channel');
  const [claimID, setClaimID] = useState('');

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Landmark className="h-4 w-4" />}
        title="Payment channels"
        description="Paybills, tills and bank accounts added on the PayHero dashboard. Synced every 15 minutes."
        action={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync now
          </Button>
        }
      >
        {st.channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No channels yet. Add a paybill, till or bank account on the PayHero dashboard, then sync.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {st.channels.map((c) => {
              const Icon = c.channel_type === 'bank' ? Landmark : Smartphone;
              return (
                <li key={c.payhero_channel_id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.description || c.channel_type}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="capitalize">{c.channel_type}</span> {c.short_code}{c.account_number && c.account_number !== c.short_code ? ` / ${c.account_number}` : ''}
                    </p>
                    {!c.is_active && <Badge variant="secondary" className="mt-1">Inactive on PayHero</Badge>}
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <span className="sr-only">Use {channelName(c)}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.enabled}
                      disabled={!c.is_active || toggle.isPending}
                      onClick={() => toggle.mutate({ id: c.payhero_channel_id, enabled: !c.enabled })}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${c.enabled ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${c.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {st.mode === 'platform_root' && (
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
            <label className="flex-1 space-y-1">
              <span className="text-xs font-medium">Add a channel from the platform account</span>
              <Input inputMode="numeric" placeholder="PayHero channel id" value={claimID} onChange={(e) => setClaimID(e.target.value.replace(/\D/g, ''))} />
            </label>
            <Button variant="outline" className="gap-1.5" onClick={() => { claim.mutate(Number(claimID)); setClaimID(''); }} disabled={!claimID || claim.isPending}>
              <Plus className="h-4 w-4" /> Add channel
            </Button>
          </div>
        )}
      </SettingsSection>

      <RoutingSection tenantSlug={tenantSlug} st={st} />
    </div>
  );
}

function RoutingSection({ tenantSlug, st }: { tenantSlug: string; st: PayHeroStatus }) {
  const options = useQuery({ queryKey: ['payhero-routing-options', tenantSlug], queryFn: () => payheroApi.routingOptions(tenantSlug), enabled: !!tenantSlug });
  const save = usePayHeroMutation(tenantSlug, (r: PayHeroRouting) => payheroApi.setRouting(tenantSlug, r), 'Routing saved', 'Could not save routing');
  // Outlets come from the header outlet filter, which loads the tenant's outlets for admins.
  const outlets = useOutletFilterStore((s) => s.outlets);
  const [draft, setRoute] = useState<PayHeroRouting | null>(null);
  const route = draft ?? st.routing ?? { default_channel_id: 0 };
  const usable = st.channels.filter((c) => c.is_active && c.enabled);
  const types = options.data?.options ?? [];

  const channelSelect = (id: string, value: number | undefined, onChange: (v: number) => void, allowDefault: boolean) => (
    <Select id={id} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="w-full sm:w-72">
      <option value={0}>{allowDefault ? 'Default channel' : 'Choose a channel'}</option>
      {usable.map((c) => <option key={c.payhero_channel_id} value={c.payhero_channel_id}>{channelName(c)}</option>)}
    </Select>
  );
  const setByType = (t: string, v: number) => {
    const next = { ...(route.by_reference_type ?? {}) };
    if (v) next[t] = v; else delete next[t];
    setRoute({ ...route, by_reference_type: next });
  };
  const setByOutlet = (o: string, v: number) => {
    const next = { ...(route.by_outlet ?? {}) };
    if (v) next[o] = v; else delete next[o];
    setRoute({ ...route, by_outlet: next });
  };

  if (usable.length === 0) {
    return (
      <SettingsSection icon={<Route className="h-4 w-4" />} title="Routing" description="Where each payment settles.">
        <p className="text-sm text-muted-foreground">Turn on at least one channel above to route payments to it.</p>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      icon={<Route className="h-4 w-4" />}
      title="Routing"
      description="A payment settles into its outlet's channel, else its type's, else the default."
      action={
        <>
          {draft && <Button size="sm" variant="ghost" onClick={() => setRoute(null)}>Discard</Button>}
          <Button size="sm" className="gap-1.5" onClick={() => save.mutate(route, { onSuccess: () => setRoute(null) })} disabled={save.isPending || !route.default_channel_id || !draft}>
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save routing
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-2 rounded-xl bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="route-default" className="text-sm font-semibold">Default channel</label>
          {channelSelect('route-default', route.default_channel_id, (v) => setRoute({ ...route, default_channel_id: v }), false)}
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By payment type</h4>
          {options.isLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
          ) : types.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment types yet. They appear here once you subscribe to a product that takes payments or receive one.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {types.map((t) => (
                <li key={t.reference_type} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`route-${t.reference_type}`} className="text-sm font-medium">{t.label}</label>
                    <Badge variant="outline">{SOURCE_LABEL[t.source] ?? t.source}</Badge>
                  </div>
                  {channelSelect(`route-${t.reference_type}`, route.by_reference_type?.[t.reference_type], (v) => setByType(t.reference_type, v), true)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {outlets.length > 1 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Store className="h-3.5 w-3.5" /> By outlet (overrides the type)</h4>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {outlets.map((o) => (
                <li key={o.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <label htmlFor={`route-outlet-${o.id}`} className="truncate text-sm font-medium">{o.name}</label>
                  {channelSelect(`route-outlet-${o.id}`, route.by_outlet?.[o.id], (v) => setByOutlet(o.id, v), true)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
