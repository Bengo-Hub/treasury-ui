'use client';

import { Badge, Button } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { SettingsSection } from '@/components/ui/settings-section';
import { payheroApi, type EnablePayHeroRequest, type PayHeroMode, type PayHeroStatus } from '@/lib/api/payhero';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Loader2, Plus, Save, Settings2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { MODES, errMessage, payheroKey, usePayHeroMutation } from './use-payhero';

/** How the tenant uses PayHero (account mode, country, offline paybill) and its Team. */
export function SetupSection({ tenantSlug, st }: { tenantSlug: string; st?: PayHeroStatus }) {
  const qc = useQueryClient();
  // Stored setup until edited (draft), then the draft.
  const [draft, setForm] = useState<EnablePayHeroRequest | null>(null);
  const form: EnablePayHeroRequest = draft ?? { mode: st?.mode ?? 'platform_team', country: st?.country || st?.tenant_profile?.country || 'KE', offline_paybill: st?.offline_paybill };
  const enable = usePayHeroMutation(tenantSlug, (b: EnablePayHeroRequest) => payheroApi.enable(tenantSlug, b).then((s) => { setForm(null); return s; }), 'PayHero saved', 'Could not save PayHero');
  const [confirmDisable, setConfirmDisable] = useState(false);
  const disable = useMutation({
    mutationFn: () => payheroApi.disable(tenantSlug),
    onSuccess: () => { qc.invalidateQueries({ queryKey: payheroKey(tenantSlug) }); setConfirmDisable(false); toast.success('PayHero disabled'); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not disable PayHero')),
  });

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={<Settings2 className="h-4 w-4" />}
        title="Account"
        description="How your payments run on PayHero."
        action={st?.enabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="secondary">Not enabled</Badge>}
      >
        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="sr-only">Account mode</legend>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {MODES.map((m) => {
                const active = form.mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setForm({ ...form, mode: m.value as PayHeroMode })}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40 hover:bg-accent/40',
                    )}
                  >
                    <span className="flex w-full items-center gap-2 text-sm font-semibold">
                      {m.label}
                      {'badge' in m && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{m.badge}</span>}
                      {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </span>
                    <span className="text-xs text-muted-foreground">{m.hint}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium">Country</span>
              <Input value={form.country ?? ''} maxLength={2} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} placeholder="KE" />
              <span className="block text-[11px] text-muted-foreground">Two-letter code; picks the mobile money networks.</span>
            </label>
            {form.mode === 'own_account' && (
              <>
                <label className="space-y-1">
                  <span className="text-xs font-medium">API username</span>
                  <Input value={form.api_username ?? ''} onChange={(e) => setForm({ ...form, api_username: e.target.value })} autoComplete="off" />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-medium">API password</span>
                  <Input type="password" value={form.api_password ?? ''} onChange={(e) => setForm({ ...form, api_password: e.target.value })} autoComplete="new-password" placeholder={st?.mode === 'own_account' ? 'Leave blank to keep the current key' : ''} />
                </label>
              </>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={!!form.offline_paybill} onChange={(e) => setForm({ ...form, offline_paybill: e.target.checked })} />
            <span>
              <span className="block text-sm font-medium">Offer the offline paybill</span>
              <span className="block text-xs text-muted-foreground">Payers who cannot take a phone prompt pay to a paybill with a reference instead.</span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button className="gap-1.5" onClick={() => enable.mutate(form)} disabled={enable.isPending}>
              {enable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {st?.enabled ? 'Save' : 'Enable PayHero'}
            </Button>
            {draft && <Button variant="ghost" onClick={() => setForm(null)}>Discard changes</Button>}
            {st?.enabled && <Button variant="outline" className="sm:ml-auto" onClick={() => setConfirmDisable(true)}>Disable PayHero</Button>}
          </div>
        </div>
      </SettingsSection>

      {st?.enabled && st.mode === 'platform_team' && <TeamSection tenantSlug={tenantSlug} st={st} />}

      <ConfirmDialog open={confirmDisable} onOpenChange={setConfirmDisable} title="Disable PayHero?"
        description="PayHero stops being offered for new payments. Your Team, channels and routing are kept."
        destructive isPending={disable.isPending} onConfirm={() => disable.mutate()} />
    </div>
  );
}

function TeamSection({ tenantSlug, st }: { tenantSlug: string; st: PayHeroStatus }) {
  const createTeam = usePayHeroMutation(tenantSlug, (b: { name: string; email?: string }) => payheroApi.createTeam(tenantSlug, b), 'Team created', 'Could not create the Team');
  const invite = usePayHeroMutation(tenantSlug, (email: string) => payheroApi.invite(tenantSlug, email), 'Invitation sent', 'Could not send the invitation');
  const link = usePayHeroMutation(tenantSlug, (id: number) => payheroApi.linkTeam(tenantSlug, id), 'Team linked', 'Could not link the Team');
  // Prefilled from the tenant's own record until edited.
  const [nameDraft, setName] = useState<string | null>(null);
  const [emailDraft, setEmail] = useState<string | null>(null);
  const name = nameDraft ?? st.tenant_profile?.name ?? '';
  const email = emailDraft ?? st.tenant_profile?.email ?? '';
  const [invitee, setInvitee] = useState('');
  const [linkID, setLinkID] = useState('');
  const has = (st.vendor_id ?? 0) > 0;

  return (
    <SettingsSection
      icon={<Building2 className="h-4 w-4" />}
      title="Team"
      description={has ? 'Your PayHero Team holds your wallet and channels.' : 'Create your Team to get your own wallet and add channels.'}
      action={has ? <Badge variant={(st.team.kyc_tier ?? 0) >= 3 ? 'success' : 'warning'}>KYC tier {st.team.kyc_tier ?? 0}</Badge> : undefined}
    >
      {!has ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="space-y-1">
            <span className="text-xs font-medium">Team name</span>
            <Input placeholder="Your business name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Contact email <span className="font-normal text-muted-foreground">(optional)</span></span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <Button className="gap-1.5" onClick={() => createTeam.mutate({ name, email: email || undefined })} disabled={!name.trim() || createTeam.isPending}>
            {createTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Team
          </Button>
          <details className="sm:col-span-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Already have a Team on PayHero? Link it instead</summary>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1 space-y-1">
                <span className="text-xs font-medium">PayHero account id</span>
                <Input inputMode="numeric" value={linkID} onChange={(e) => setLinkID(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 12700" />
              </label>
              <Button variant="outline" onClick={() => link.mutate(Number(linkID))} disabled={!linkID || link.isPending}>
                {link.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Link Team
              </Button>
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Team</dt><dd className="mt-0.5 font-semibold">{st.team.name}</dd></div>
            <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Account id</dt><dd className="mt-0.5 font-mono font-semibold">#{st.vendor_id}</dd></div>
          </dl>
          <div className="space-y-1">
            <label htmlFor="ph-invite" className="text-xs font-medium">Invite whoever manages your channels on PayHero</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="ph-invite" type="email" placeholder="admin@example.com" value={invitee} onChange={(e) => setInvitee(e.target.value)} />
              <Button variant="outline" className="gap-1.5" onClick={() => { invite.mutate(invitee); setInvitee(''); }} disabled={!invitee.includes('@') || invite.isPending}>
                <UserPlus className="h-4 w-4" /> Invite
              </Button>
            </div>
            {!!st.team.invited_emails?.length && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {st.team.invited_emails.map((e) => <Badge key={e} variant="outline">{e}</Badge>)}
              </div>
            )}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
