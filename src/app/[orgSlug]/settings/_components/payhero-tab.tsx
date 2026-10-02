'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input, Select } from '@/components/ui/input';
import {
  payheroApi,
  type EnablePayHeroRequest,
  type PayHeroMode,
  type PayHeroPaymentLink,
  type PayHeroRouting,
  type PayHeroStatus,
} from '@/lib/api/payhero';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Link2, Loader2, Plus, RefreshCw, Save, ShieldCheck, Trash2, UserPlus, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const payheroKey = (tenant: string) => ['payhero', tenant] as const;

const errMessage = (e: any, fallback: string) =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

const MODES: { value: PayHeroMode; label: string; hint: string }[] = [
  { value: 'platform_team', label: 'Own Team (recommended)', hint: 'Your own PayHero Team and wallet under the platform account. Needed for escrow.' },
  { value: 'platform_root', label: 'Shared platform account', hint: 'Channels on the platform account, no wallet of your own.' },
  { value: 'own_account', label: 'Own PayHero account', hint: 'Your own PayHero API key.' },
];

// Reference types a payment can be routed by (what each source service creates).
const ROUTED_TYPES = ['pos_sale', 'invoice', 'order', 'booking', 'subscription'];

/** A PayHero write that stores the returned status and toasts the outcome. */
function usePayHeroMutation<T>(tenant: string, fn: (v: T) => Promise<PayHeroStatus>, ok: string, fail: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (d: PayHeroStatus) => { qc.setQueryData(payheroKey(tenant), d); toast.success(ok); },
    onError: (e: any) => toast.error(errMessage(e, fail)),
  });
}

export function usePayHeroStatus(tenant: string) {
  return useQuery<PayHeroStatus>({ queryKey: payheroKey(tenant), queryFn: () => payheroApi.status(tenant), enabled: !!tenant });
}

/** A tenant's PayHero setup: mode, Team, KYC, channels, routing, payment links and wallet. */
export function PayHeroTab({ tenantSlug }: { tenantSlug: string }) {
  const qc = useQueryClient();
  const { data: st, isLoading } = usePayHeroStatus(tenantSlug);
  const onSaved = (data: PayHeroStatus) => qc.setQueryData(payheroKey(tenantSlug), data);

  const enable = usePayHeroMutation(tenantSlug, (b: EnablePayHeroRequest) => payheroApi.enable(tenantSlug, b), 'PayHero saved', 'Could not save PayHero');
  const createTeam = usePayHeroMutation(tenantSlug, (b: { name: string; email?: string }) => payheroApi.createTeam(tenantSlug, b), 'Team created', 'Could not create the Team');
  const invite = usePayHeroMutation(tenantSlug, (email: string) => payheroApi.invite(tenantSlug, email), 'Invitation sent', 'Could not send the invitation');
  const sync = usePayHeroMutation(tenantSlug, (_: void) => payheroApi.syncChannels(tenantSlug), 'Channels synced', 'Could not sync channels');
  const toggle = usePayHeroMutation(tenantSlug, (v: { id: number; enabled: boolean }) => payheroApi.setChannelEnabled(tenantSlug, v.id, v.enabled), 'Channel updated', 'Could not update the channel');
  const claim = usePayHeroMutation(tenantSlug, (id: number) => payheroApi.claimChannel(tenantSlug, id), 'Channel added', 'Could not add the channel');
  const routing = usePayHeroMutation(tenantSlug, (r: PayHeroRouting) => payheroApi.setRouting(tenantSlug, r), 'Routing saved', 'Could not save routing');
  const links = usePayHeroMutation(tenantSlug, (l: PayHeroPaymentLink[]) => payheroApi.setPaymentLinks(tenantSlug, l), 'Payment links saved', 'Could not save payment links');
  const [confirmDisable, setConfirmDisable] = useState(false);
  const disable = useMutation({
    mutationFn: () => payheroApi.disable(tenantSlug),
    onSuccess: () => { qc.invalidateQueries({ queryKey: payheroKey(tenantSlug) }); setConfirmDisable(false); toast.success('PayHero disabled'); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not disable PayHero')),
  });

  const [form, setForm] = useState<EnablePayHeroRequest>({ mode: 'platform_team', country: 'KE' });
  useEffect(() => {
    if (st) setForm((f) => ({ ...f, mode: st.mode ?? 'platform_team', country: st.country ?? 'KE', offline_paybill: st.offline_paybill }));
  }, [st]);

  if (isLoading) {
    return <Card><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;
  }
  const hasAccount = (st?.vendor_id ?? 0) > 0;
  const teamMode = st?.mode === 'platform_team';

  return (
    <div className="space-y-6">
      {/* Setup */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-sm uppercase tracking-tight">PayHero</h3>
            <Badge variant={st?.enabled ? 'success' : 'secondary'}>{st?.enabled ? 'Enabled' : 'Not enabled'}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Account</span>
              <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as PayHeroMode })}>
                {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
              <span className="text-xs text-muted-foreground">{MODES.find((m) => m.value === form.mode)?.hint}</span>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Country (ISO code)</span>
              <Input value={form.country ?? ''} maxLength={2} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} />
            </label>
            {form.mode === 'own_account' && (
              <>
                <Input placeholder="API username" value={form.api_username ?? ''} onChange={(e) => setForm({ ...form, api_username: e.target.value })} />
                <Input placeholder="API password" type="password" value={form.api_password ?? ''} onChange={(e) => setForm({ ...form, api_password: e.target.value })} />
              </>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.offline_paybill} onChange={(e) => setForm({ ...form, offline_paybill: e.target.checked })} />
              Offer offline paybill on the pay page
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => enable.mutate(form)} disabled={enable.isPending}>
              {enable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
            </Button>
            {st?.enabled && <Button variant="outline" onClick={() => setConfirmDisable(true)}>Disable</Button>}
          </div>
        </CardContent>
      </Card>

      {st?.enabled && teamMode && (
        <TeamCard st={st} onCreate={(b) => createTeam.mutate(b)} creating={createTeam.isPending}
          onInvite={(email) => invite.mutate(email)} inviting={invite.isPending} />
      )}
      {st?.enabled && teamMode && hasAccount && <KYCCard tenantSlug={tenantSlug} st={st} onSaved={onSaved} />}

      {st?.enabled && (hasAccount || st.mode !== 'platform_team') && (
        <ChannelsCard st={st} syncing={sync.isPending} onSync={() => sync.mutate()}
          onToggle={(id, enabled) => toggle.mutate({ id, enabled })}
          onClaim={st.mode === 'platform_root' ? (id) => claim.mutate(id) : undefined}
          onRouting={(r) => routing.mutate(r)} savingRouting={routing.isPending} />
      )}
      {st?.enabled && <PaymentLinksCard links={st.payment_links} saving={links.isPending} onSave={(l) => links.mutate(l)} />}
      {st?.enabled && hasAccount && <BalanceCard tenantSlug={tenantSlug} />}

      <ConfirmDialog open={confirmDisable} onOpenChange={setConfirmDisable} title="Disable PayHero?"
        description="PayHero stops being offered for new payments. Your Team, channels and routing are kept."
        destructive isPending={disable.isPending} onConfirm={() => disable.mutate()} />
    </div>
  );
}

function TeamCard({ st, onCreate, creating, onInvite, inviting }: {
  st: PayHeroStatus; onCreate: (b: { name: string; email?: string }) => void; creating: boolean;
  onInvite: (email: string) => void; inviting: boolean;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [invitee, setInvitee] = useState('');
  const has = (st.vendor_id ?? 0) > 0;
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm uppercase tracking-tight">Team</h3>
          {has && <Badge variant={(st.team.kyc_tier ?? 0) >= 3 ? 'success' : 'warning'}>KYC tier {st.team.kyc_tier ?? 0}</Badge>}
        </div>
        {!has ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <Input placeholder="Team name (your business)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Contact email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={() => onCreate({ name, email: email || undefined })} disabled={!name.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Create Team
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm">{st.team.name} <span className="text-muted-foreground">(account {st.vendor_id})</span></p>
            <p className="text-xs text-muted-foreground">
              Add your paybills, tills and bank accounts on the PayHero dashboard; invite whoever manages them.
            </p>
            <div className="flex gap-2">
              <Input placeholder="admin@example.com" value={invitee} onChange={(e) => setInvitee(e.target.value)} />
              <Button variant="outline" onClick={() => { onInvite(invitee); setInvitee(''); }} disabled={!invitee.includes('@') || inviting}>
                <UserPlus className="h-4 w-4 mr-1" /> Invite
              </Button>
            </div>
            {!!st.team.invited_emails?.length && (
              <p className="text-xs text-muted-foreground">Invited: {st.team.invited_emails.join(', ')}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KYCCard({ tenantSlug, st, onSaved }: { tenantSlug: string; st: PayHeroStatus; onSaved: (s: PayHeroStatus) => void }) {
  const [check, setCheck] = useState('national_id_ke');
  const [fields, setFields] = useState('');
  const [confirmPrice, setConfirmPrice] = useState(false);
  const pricing = useQuery({ queryKey: ['payhero-kyc-pricing', tenantSlug], queryFn: () => payheroApi.kycPricing(tenantSlug) });
  const verify = useMutation({
    mutationFn: () => {
      const parsed: Record<string, string> = {};
      fields.split('\n').forEach((line) => {
        const [k, ...rest] = line.split('=');
        if (k?.trim() && rest.length) parsed[k.trim()] = rest.join('=').trim();
      });
      return payheroApi.verify(tenantSlug, check, parsed, true);
    },
    onSuccess: (v) => { toast.success(`${v.check}: ${v.status}${v.subject_name ? ` (${v.subject_name})` : ''}`); setFields(''); setConfirmPrice(false); refresh.mutate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Verification failed')),
  });
  const submit = useMutation({
    mutationFn: () => payheroApi.submitKYC(tenantSlug, { entity_type: 'company' }),
    onSuccess: (d) => { onSaved(d); toast.success('KYC submitted'); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not submit KYC')),
  });
  const refresh = useMutation({ mutationFn: () => payheroApi.refreshKYC(tenantSlug), onSuccess: onSaved });
  const priceOf = (pricing.data as any)?.[check] ?? (pricing.data as any)?.pricing?.[check];

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Verification and KYC</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Tier 3 (national ID plus company KRA PIN) is needed to collect from the public into your wallet (escrow). Each check is billed by PayHero.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Check, e.g. national_id_ke, kra_pin, phone" value={check} onChange={(e) => setCheck(e.target.value.trim())} />
          <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" rows={3}
            placeholder={'field=value per line\nid_number=12345678'} value={fields} onChange={(e) => setFields(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setConfirmPrice(true)} disabled={!fields.trim() || verify.isPending}>
          {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4 mr-1" />} Run check
        </Button>
        {st.verifications.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {st.verifications.map((v) => (
                <tr key={v.check} className="border-t">
                  <td className="py-1">{v.check}</td>
                  <td>{v.subject_name}</td>
                  <td><Badge variant={v.status === 'verified' ? 'success' : 'warning'}>{v.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex gap-2">
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || !st.verifications.some((v) => v.status === 'verified')}>Submit KYC</Button>
          <Button variant="ghost" onClick={() => refresh.mutate()} disabled={refresh.isPending}><RefreshCw className="h-4 w-4 mr-1" /> Refresh tier</Button>
        </div>
        <ConfirmDialog open={confirmPrice} onOpenChange={setConfirmPrice} title="Run a billed check?"
          description={`PayHero charges for each ${check} check${priceOf ? `: ${typeof priceOf === 'object' ? JSON.stringify(priceOf) : priceOf}` : ''}.`}
          confirmLabel="Run and pay" isPending={verify.isPending} onConfirm={() => verify.mutate()} />
      </CardContent>
    </Card>
  );
}

function ChannelsCard({ st, syncing, onSync, onToggle, onClaim, onRouting, savingRouting }: {
  st: PayHeroStatus; syncing: boolean; onSync: () => void; onToggle: (id: number, enabled: boolean) => void;
  onClaim?: (id: number) => void; onRouting: (r: PayHeroRouting) => void; savingRouting: boolean;
}) {
  const [claimID, setClaimID] = useState('');
  const [route, setRoute] = useState<PayHeroRouting>(st.routing ?? { default_channel_id: 0 });
  useEffect(() => setRoute(st.routing ?? { default_channel_id: 0 }), [st.routing]);
  const usable = st.channels.filter((c) => c.is_active && c.enabled);
  const channelSelect = (value: number | undefined, onChange: (v: number) => void, allowNone: boolean) => (
    <Select value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))}>
      {allowNone && <option value={0}>Use the default</option>}
      {!allowNone && <option value={0}>Choose a channel</option>}
      {usable.map((c) => <option key={c.payhero_channel_id} value={c.payhero_channel_id}>{c.channel_type} {c.short_code} {c.description}</option>)}
    </Select>
  );

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm uppercase tracking-tight">Payment channels</h3>
          <Button variant="outline" size="sm" onClick={onSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Sync from PayHero
          </Button>
        </div>
        {st.channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No channels yet. Add a paybill, till or bank account on the PayHero dashboard, then sync.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th>Type</th><th>Number</th><th>Description</th><th>PayHero</th><th>Use</th></tr></thead>
            <tbody>
              {st.channels.map((c) => (
                <tr key={c.payhero_channel_id} className="border-t">
                  <td className="py-1">{c.channel_type}</td>
                  <td>{c.short_code}{c.account_number ? ` / ${c.account_number}` : ''}</td>
                  <td>{c.description}</td>
                  <td><Badge variant={c.is_active ? 'success' : 'secondary'}>{c.is_active ? 'active' : 'inactive'}</Badge></td>
                  <td><input type="checkbox" checked={c.enabled} onChange={(e) => onToggle(c.payhero_channel_id, e.target.checked)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {onClaim && (
          <div className="flex gap-2">
            <Input placeholder="Channel id on the platform account" value={claimID} onChange={(e) => setClaimID(e.target.value.replace(/\D/g, ''))} />
            <Button variant="outline" onClick={() => { onClaim(Number(claimID)); setClaimID(''); }} disabled={!claimID}>Add channel</Button>
          </div>
        )}
        {usable.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h4 className="text-sm font-semibold">Routing</h4>
            <p className="text-xs text-muted-foreground">Payments settle into the channel for their outlet, else their type, else the default.</p>
            <label className="text-sm space-y-1 block">
              <span className="text-muted-foreground">Default channel</span>
              {channelSelect(route.default_channel_id, (v) => setRoute({ ...route, default_channel_id: v }), false)}
            </label>
            {ROUTED_TYPES.map((t) => (
              <label key={t} className="text-sm grid grid-cols-3 items-center gap-2">
                <span className="text-muted-foreground">{t.replace('_', ' ')}</span>
                <span className="col-span-2">
                  {channelSelect(route.by_reference_type?.[t], (v) => {
                    const next = { ...(route.by_reference_type ?? {}) };
                    if (v) next[t] = v; else delete next[t];
                    setRoute({ ...route, by_reference_type: next });
                  }, true)}
                </span>
              </label>
            ))}
            <Button onClick={() => onRouting(route)} disabled={savingRouting || !route.default_channel_id}>
              <Save className="h-4 w-4 mr-1" /> Save routing
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentLinksCard({ links, saving, onSave }: { links: PayHeroPaymentLink[]; saving: boolean; onSave: (l: PayHeroPaymentLink[]) => void }) {
  const [rows, setRows] = useState<PayHeroPaymentLink[]>(links);
  useEffect(() => setRows(links), [links]);
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Payment links</h3>
        </div>
        <p className="text-xs text-muted-foreground">Payment Links and Hosted Checkout pages made on the PayHero dashboard, kept here to share.</p>
        {rows.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <Input placeholder="Label" value={l.label} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))} />
            <Input placeholder="https://..." value={l.url} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, url: e.target.value } : r)))} />
            <Button variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRows([...rows, { label: '', url: '' }])}><Plus className="h-4 w-4 mr-1" /> Add link</Button>
          <Button onClick={() => onSave(rows.filter((r) => r.url.trim()))} disabled={saving}><Save className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceCard({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['payhero-balance', tenantSlug], queryFn: () => payheroApi.balance(tenantSlug) });
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-3">
        <Wallet className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">PayHero wallet</p>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : error ? (
            <p className="text-sm text-destructive">{errMessage(error, 'Balance unavailable')}</p>
          ) : (
            <p className="text-lg font-bold">{data?.currency} {Number(data?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
