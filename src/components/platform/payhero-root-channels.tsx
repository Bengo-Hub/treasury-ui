'use client';

import { Badge, Button } from '@/components/ui/base';
import { Select } from '@/components/ui/input';
import { SettingsSection } from '@/components/ui/settings-section';
import { payheroApi, type PayHeroTeamRow } from '@/lib/api/payhero';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Loader2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const errMessage = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;

/**
 * Channels on the shared Codevertex root account and who they belong to. A tenant on the shared
 * account (platform account mode) has its paybill or till added here on the PayHero dashboard; the
 * platform owner assigns it, the tenant's payments then settle straight into it, and the platform
 * no longer lists or routes it. Unassigned channels are the platform's own.
 */
export function PayHeroRootChannels({ tenants, tenantName }: { tenants: PayHeroTeamRow[]; tenantName: (id: string) => string }) {
  const qc = useQueryClient();
  const channels = useQuery({ queryKey: ['payhero-root-channels'], queryFn: () => payheroApi.rootChannels(), retry: false });
  const shared = tenants.filter((t) => t.mode === 'platform_root');
  const [pick, setPick] = useState<Record<number, string>>({});
  const changed = (msg: string) => {
    qc.invalidateQueries({ queryKey: ['payhero-root-channels'] });
    qc.invalidateQueries({ queryKey: ['payhero-teams'] });
    toast.success(msg);
  };
  const assign = useMutation({
    mutationFn: (v: { channel: number; tenant: string }) => payheroApi.assignChannel(v.channel, v.tenant),
    onSuccess: () => changed('Channel assigned'),
    onError: (e: any) => toast.error(errMessage(e, 'Could not assign the channel')),
  });
  const unassign = useMutation({
    mutationFn: (channel: number) => payheroApi.unassignChannel(channel),
    onSuccess: () => changed('Channel returned to the platform'),
    onError: (e: any) => toast.error(errMessage(e, 'Could not unassign the channel')),
  });
  const list = channels.data?.channels ?? [];

  return (
    <SettingsSection
      icon={<Link2 className="h-4 w-4" />}
      title="Root account channels"
      description="Paybills and tills on the Codevertex PayHero account. Assign a tenant's own channel to it (tenant in platform account mode); unassigned ones are the platform's."
    >
      {channels.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : channels.isError ? (
        <p className="text-sm text-muted-foreground">Root account channels unavailable: set the organization and root account above first.</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No channels on the root account yet. Add paybills or tills on the PayHero dashboard.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {list.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.description || c.channel_type}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="capitalize">{c.channel_type}</span> {c.short_code}
                  {c.account_number && c.account_number !== c.short_code ? ` / ${c.account_number}` : ''} · #{c.id}
                  {!c.is_active && ' · inactive on PayHero'}
                </p>
              </div>
              {c.owner_tenant_id ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{tenantName(c.owner_tenant_id)}</Badge>
                  <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" disabled={unassign.isPending} onClick={() => unassign.mutate(c.id)}>
                    <Unlink className="h-3.5 w-3.5" /> Unassign
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Badge variant="outline" className="w-fit">Platform</Badge>
                  {shared.length > 0 && (
                    <>
                      <Select aria-label={`Assign channel ${c.id}`} value={pick[c.id] ?? ''} onChange={(e) => setPick({ ...pick, [c.id]: e.target.value })} className="h-8 w-full text-xs sm:w-56">
                        <option value="">Assign to a tenant...</option>
                        {shared.map((t) => <option key={t.tenant_id} value={t.tenant_id}>{tenantName(t.tenant_id)}</option>)}
                      </Select>
                      <Button size="sm" className="h-8 gap-1" disabled={!pick[c.id] || assign.isPending} onClick={() => assign.mutate({ channel: c.id, tenant: pick[c.id] })}>
                        {assign.isPending && assign.variables?.channel === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />} Assign
                      </Button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
